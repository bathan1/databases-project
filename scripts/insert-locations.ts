import "dotenv/config";
import LOCATIONS from "../capitals.json" with { type: "json" };
import { getCoordinates, getCurrentWeather } from "../api.js";
import type { Kysely } from "kysely";
import type { DB } from "kysely-codegen";
import { db } from "../db/client.js";

const INSERTS: Array<(db: Kysely<DB>) => Promise<void>> = [];
const insertedStates = new Set<string>();
const insertedCities = new Set<string>();

for (const location of LOCATIONS) {
  const [coordinates] = await getCoordinates(location);
  if (!coordinates) {
    throw new Error(`No coordinate entry for ${JSON.stringify(location, null, 2)}`)
  }

  const { timezone: utcOffsetSeconds } = await getCurrentWeather(coordinates);

  const insertQuery = async (tx: Kysely<DB>) => {
    const { numInsertedOrUpdatedRows: numInsertedStateRows } = await tx
      .insertInto("states")
      .values({
        code: location.state_code,
        state_name: coordinates.state
      })
      .ignore()
      .executeTakeFirstOrThrow();

    const { state_id } = await tx
      .selectFrom("states")
      .select("state_id")
      .where("states.code", "=", location.state_code)
      .executeTakeFirstOrThrow();

    if (Number(numInsertedStateRows) === 1) {
      insertedStates.add(location.state_code);
    }

    const { numInsertedOrUpdatedRows: numInsertedCityRows } = await tx
      .insertInto("cities")
      .values({
        state_id,
        lat: coordinates.lat,
        lon: coordinates.lon,
        city_name: location.capital_city,
        utc_offset_seconds: utcOffsetSeconds
      })
      .ignore()
      .executeTakeFirstOrThrow();

    if (Number(numInsertedCityRows) === 1) {
      insertedCities.add(location.capital_city);
    }
  }

  INSERTS.push(insertQuery);
}

try {
  await db.transaction().execute(
    async tx => {
      for (const insert of INSERTS) {
        await insert(tx);
      }
    }
  );

  const totalNumCities = LOCATIONS.length;
  const totalNumStates = LOCATIONS.length;

  prettyPrintResults({
    insertedStates,
    insertedCities,
    totalNumStates,
    totalNumCities,
  });

  process.exit(0);

} catch (err) {
  console.error(`Error in transaction: ${err}`);
  process.exit(1);
}

function prettyPrintResults({
  insertedStates,
  insertedCities,
  totalNumStates,
  totalNumCities,
}: {
  insertedStates: Set<string>;
  insertedCities: Set<string>;
  totalNumStates: number;
  totalNumCities: number;
}) {
  const numStates = insertedStates.size;
  const numCities = insertedCities.size;

  console.log("\n=== Seed Results ===");

  if (numStates === 0 && numCities === 0) {
    console.log("No new states or cities were inserted.");
    console.log("Database is already up to date.\n");
    return;
  }

  console.log(`States: ${numStates}/${totalNumStates} inserted`);
  if (numStates > 0) {
    console.log(
      `  → ${Array.from(insertedStates).sort().join(", ")}`
    );
  } else {
    console.log("  → none");
  }

  console.log(`Cities: ${numCities}/${totalNumCities} inserted`);
  if (numCities > 0) {
    console.log(
      `  → ${Array.from(insertedCities).sort().join(", ")}`
    );
  } else {
    console.log("  → none");
  }

  console.log("");
}
