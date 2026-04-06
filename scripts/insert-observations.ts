import "dotenv/config";
import { fetchWeatherApi } from "openmeteo";
import { db } from "../db/client.js";
import { sql, type Insertable } from "kysely";
import type { Observations } from "kysely-codegen";

type AlertState = {
  active: boolean;
};

const alertState = new Map<string, AlertState>();
function alertKey(cityId: number, alertName: string) {
  return `${cityId}:${alertName}`;
}

function getTriggeredAlert(row: Insertable<Observations>): string | null {
  if (Number(row.temperature_2m_c!) > 35) return "Extreme Heat Warning";
  if (Number(row.temperature_2m_c!) > 30) return "Heat Advisory";
  if (row.precipitation_mm! > 10) return "Heavy Rain Warning";
  if (row.precipitation_mm! > 2) return "Rain Advisory";
  if (Number(row.windspeed_10m_kmh!) > 50) return "High Wind Warning";
  return null;
}

const INTERVAL_DAYS = 3;

const cities = await db.selectFrom("cities").selectAll().execute();

console.log(
`Pulling weather data for ${cities.length} cities.
Start: ${INTERVAL_DAYS} ago
End: ${INTERVAL_DAYS} ago`
);

function fromEntries<K extends PropertyKey, V>(
  entries: Iterable<readonly [K, V]>
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}

const OBSERVATION_ROWS: Insertable<Observations>[] = [];

const HOURLY_VARIABLES = [
  "temperature_2m",
  "precipitation",
  "relative_humidity_2m",
  "pressure_msl",
  "wind_speed_10m"
] as const;

const index = (varName: typeof HOURLY_VARIABLES[number]) => HOURLY_VARIABLES.findIndex(v => v === varName);

console.time("query-api");
for (const city of cities) {
  const responses = await fetchWeatherApi("https://api.open-meteo.com/v1/forecast", {
    latitude: city.lat,
    longitude: city.lon,
    hourly: HOURLY_VARIABLES,
    forecast_days: INTERVAL_DAYS,
    past_days: INTERVAL_DAYS
  });
  const response = responses[0];
  if (!response) {
    throw new Error(`meteo api failed for city ${JSON.stringify(city, null, 2)}`)
  }

  const utcOffsetSeconds = response.utcOffsetSeconds();
  const elevation = response.elevation();
  const hourly = response.hourly()!;
  const values = HOURLY_VARIABLES.map((v): [
    variableName: typeof v,
    values: Float32Array
  ] => [
    v,
    hourly
    .variables(index(v))!
    .valuesArray()!
  ]);
  const time = Array.from(
    { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() }, 
    (_ , i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
  );
  const observationValues = time.map((time, i) => ({
    timestamp: time,
    ...fromEntries(
      values.map(([name, arr]) => [name, arr[i]])
    )
  }));

  const observationRowValues = observationValues.map((value): Insertable<Observations> => {
    return {
      condition_id: -1,
      city_id: city.city_id,
      elevation_m: elevation,
      timestamp: value.timestamp,
      temperature_2m_c: value.temperature_2m!,
      precipitation_mm: value.precipitation!,
      relative_humidity_2m_pct: value.relative_humidity_2m!,
      pressure_msl_hpa: value.pressure_msl!,
      windspeed_10m_kmh: value.wind_speed_10m!
    }
  });

  OBSERVATION_ROWS.push(...observationRowValues);
}
console.timeEnd("query-api");

console.log(`Inserting total of ${OBSERVATION_ROWS.length} observations...`);

let numInsertedOrUpdatedRows = 0;
let numAlertsStarted = 0;
let numAlertsEnded = 0;

console.time("insert-db");

await db.transaction().execute(async (trx) => {
  for (const row of OBSERVATION_ROWS) {
    await trx.executeQuery(sql`
      INSERT INTO observations (
        condition_id,
        city_id,
        timestamp,
        elevation_m,
        temperature_2m_c,
        precipitation_mm,
        windspeed_10m_kmh,
        relative_humidity_2m_pct,
        pressure_msl_hpa
      )
      SELECT
        wc.condition_id,
        ${row.city_id},
        ${row.timestamp},
        ${row.elevation_m},
        ${row.temperature_2m_c},
        ${row.precipitation_mm},
        ${row.windspeed_10m_kmh},
        ${row.relative_humidity_2m_pct},
        ${row.pressure_msl_hpa}
      FROM weather_conditions wc
      WHERE wc.condition_name = (
        CASE
          WHEN ${row.precipitation_mm} > 0 THEN 'Rain'
          WHEN ${row.temperature_2m_c} < 0 THEN 'Snow'
          WHEN ${row.temperature_2m_c} > 30 THEN 'Hot'
          ELSE 'Clear'
        END
      )
      LIMIT 1
      ON DUPLICATE KEY UPDATE
        temperature_2m_c = VALUES(temperature_2m_c),
        precipitation_mm = VALUES(precipitation_mm),
        windspeed_10m_kmh = VALUES(windspeed_10m_kmh),
        relative_humidity_2m_pct = VALUES(relative_humidity_2m_pct),
        pressure_msl_hpa = VALUES(pressure_msl_hpa)
    `.compile(db));
    numInsertedOrUpdatedRows++;

    const alertName = getTriggeredAlert(row);

    const possibleAlerts = [
      "Extreme Heat Warning",
      "Heat Advisory",
      "Heavy Rain Warning",
      "Rain Advisory",
      "High Wind Warning"
    ];

    for (const name of possibleAlerts) {
      const key = alertKey(row.city_id!, name);
      const state = alertState.get(key) ?? { active: false };
      const shouldBeActive = alertName === name;

      if (shouldBeActive && !state.active) {
        numAlertsStarted++;
        await trx.executeQuery(sql`
          INSERT INTO alerts (
            alert_title,
            start_time,
            end_time,
            description,
            city_id,
            alert_type_id
          )
          SELECT
            ${name},
            ${row.timestamp},
            NULL,
            CONCAT(${name}, ' started'),
            ${row.city_id},
            at.alert_type_id
          FROM alert_types at
          WHERE at.alert_name = ${name}
        `.compile(db));

        state.active = true;
      }

      if (!shouldBeActive && state.active) {
        numAlertsEnded++;
        await trx.executeQuery(sql`
          UPDATE alerts
          SET end_time = ${row.timestamp}
          WHERE city_id = ${row.city_id}
            AND alert_type_id = (
              SELECT alert_type_id FROM alert_types WHERE alert_name = ${name}
            )
            AND end_time IS NULL
        `.compile(db));

        state.active = false;
      }

      alertState.set(key, state);
    }
  }
});

console.timeEnd("insert-db");

console.log(`
Observations:
  Inserted/Updated: ${numInsertedOrUpdatedRows}
  Total Processed:  ${OBSERVATION_ROWS.length}

Alerts:
  Started: ${numAlertsStarted}
  Ended:   ${numAlertsEnded}
`);

process.exit(0);
