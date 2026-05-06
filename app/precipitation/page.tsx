import { PrecipitationExplorer } from "@/app/precipitation/precipitation-explorer"
import { db } from "@/db/client"
import {
  daily_annapolis_rainfall_comparison,
  daily_average_humidity,
  daily_dry_heat_capitals,
  daily_top_precipitation_capitals,
  daily_top_zero_precipitation_capitals,
  type DailyAnnapolisRainfallComparison,
  type DailyAverageHumidity,
  type DailyDryHeatCapital,
  type DailyTopPrecipitationCapital,
  type DailyTopZeroPrecipitationCapital,
} from "@/app/precipitation/queries"
import { sql } from "kysely"

type CapitalCityRow = {
  id: number
  cityName: string
  stateName: string
  lat: number
  lon: number
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") {
    return value.slice(0, 10)
  }

  return value.toISOString().slice(0, 10)
}

export default async function Page() {
  const humidityRows = await db
    .executeQuery(daily_average_humidity.compile(db))
    .then((r) => r.rows as DailyAverageHumidity[])

  const precipitationRows = await db
    .executeQuery(daily_top_precipitation_capitals.compile(db))
    .then((r) => r.rows as DailyTopPrecipitationCapital[])

  const zeroPrecipRows = await db
    .executeQuery(daily_top_zero_precipitation_capitals.compile(db))
    .then((r) => r.rows as DailyTopZeroPrecipitationCapital[])

  const annapolisRows = await db
    .executeQuery(daily_annapolis_rainfall_comparison.compile(db))
    .then((r) => r.rows as DailyAnnapolisRainfallComparison[])

  const dryHeatRows = await db
    .executeQuery(daily_dry_heat_capitals.compile(db))
    .then((r) => r.rows as DailyDryHeatCapital[])

  const capitalCities = (await db
    .selectFrom("cities")
    .innerJoin("states", "states.state_id", "cities.state_id")
    .select([
      "cities.city_id as id",
      "cities.city_name as cityName",
      "states.state_name as stateName",
      sql<number>`CAST(ROUND(cities.lat, 2) AS DOUBLE)`.as("lat"),
      sql<number>`CAST(ROUND(cities.lon, 2) AS DOUBLE)`.as("lon"),
    ])
    .execute()) as CapitalCityRow[]

  const cityById = new Map(capitalCities.map((city) => [city.id, city]))

  const precipRankByDateAndCityId = new Map<string, number>()
  const totalPrecipByDateAndCityId = new Map<string, number>()

  for (const row of precipitationRows) {
    const dateKey = toDateKey(row.local_date)
    const key = `${dateKey}:${row.city_id}`

    precipRankByDateAndCityId.set(key, Number(row.precip_rank))
    totalPrecipByDateAndCityId.set(
      key,
      Number(row.total_precipitation_mm)
    )
  }

  const zeroPrecipRankByDateAndCityId = new Map<string, number>()
  const zeroPrecipHoursByDateAndCityId = new Map<string, number>()

  for (const row of zeroPrecipRows) {
    const dateKey = toDateKey(row.local_date)
    const key = `${dateKey}:${row.city_id}`

    zeroPrecipRankByDateAndCityId.set(key, Number(row.zero_precip_rank))
    zeroPrecipHoursByDateAndCityId.set(key, Number(row.zero_precip_hours))
  }

  const dryHeatRankByDateAndCityId = new Map<string, number>()
  const dryHeatHoursByDateAndCityId = new Map<string, number>()
  const dryHeatPctByDateAndCityId = new Map<string, number>()

  for (const row of dryHeatRows) {
    const dateKey = toDateKey(row.local_date)
    const key = `${dateKey}:${row.city_id}`

    dryHeatRankByDateAndCityId.set(key, Number(row.dry_heat_rank))
    dryHeatHoursByDateAndCityId.set(key, Number(row.matching_hours))
    dryHeatPctByDateAndCityId.set(key, Number(row.pct_of_daily_hours))
  }

  const annapolisRainfallByDateAndCityId = new Map<string, "Yes" | "No">()
  const annapolisComparisonRankByDateAndCityId = new Map<string, number>()
  const annapolisTotalPrecipByDateAndCityId = new Map<string, number>()

  for (const row of annapolisRows) {
    const dateKey = toDateKey(row.local_date)
    const key = `${dateKey}:${row.city_id}`

    annapolisRainfallByDateAndCityId.set(
      key,
      row.experiencing_rainfall
    )
    annapolisComparisonRankByDateAndCityId.set(
      key,
      Number(row.comparison_rank)
    )
    annapolisTotalPrecipByDateAndCityId.set(
      key,
      Number(row.total_precipitation_mm)
    )
  }

  const daysMap = new Map<
    string,
    Array<{
      id: string | number
      cityName: string
      stateName: string
      lat: number
      lon: number
      value: number
      avgHumidityPct?: number

      totalPrecipitationMm?: number
      precipRank?: number

      zeroPrecipHours?: number
      zeroPrecipRank?: number

      dryHeatRank?: number
      dryHeatMatchingHours?: number
      dryHeatPctOfDailyHours?: number

      isAnnapolis?: boolean
      annapolisRainfall?: "Yes" | "No"
      annapolisComparisonRank?: number
      annapolisTotalPrecipitationMm?: number
    }>
  >()

  for (const row of humidityRows) {
    const dateKey = toDateKey(row.local_date)
    const city = cityById.get(row.city_id)

    if (!city) continue

    const current = daysMap.get(dateKey) ?? []
    const rankKey = `${dateKey}:${row.city_id}`
    const isAnnapolis = city.cityName === "Annapolis"

    current.push({
      id: city.id,
      cityName: city.cityName,
      stateName: city.stateName,
      lat: city.lat,
      lon: city.lon,

      value: Number(row.avg_relative_humidity_pct),
      avgHumidityPct: Number(row.avg_relative_humidity_pct),

      totalPrecipitationMm: totalPrecipByDateAndCityId.get(rankKey),
      precipRank: precipRankByDateAndCityId.get(rankKey),

      zeroPrecipHours: zeroPrecipHoursByDateAndCityId.get(rankKey),
      zeroPrecipRank: zeroPrecipRankByDateAndCityId.get(rankKey),

      dryHeatRank: dryHeatRankByDateAndCityId.get(rankKey),
      dryHeatMatchingHours: dryHeatHoursByDateAndCityId.get(rankKey),
      dryHeatPctOfDailyHours: dryHeatPctByDateAndCityId.get(rankKey),

      isAnnapolis,
      annapolisRainfall: annapolisRainfallByDateAndCityId.get(rankKey),
      annapolisComparisonRank:
        annapolisComparisonRankByDateAndCityId.get(rankKey),
      annapolisTotalPrecipitationMm:
        annapolisTotalPrecipByDateAndCityId.get(rankKey),
    })

    daysMap.set(dateKey, current)
  }

  const days = Array.from(daysMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, capitals]) => ({
      date,
      capitals: capitals.sort((a, b) => b.value - a.value),
    }))

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Precipitation + Humidity Map
        </h1>
        <p className="text-muted-foreground text-sm">
          Daily humidity, precipitation, zero-rain hours, dry heat, and
          Annapolis rainfall comparison. Hover over labels or dots to see
          details.
        </p>
      </div>

      <PrecipitationExplorer days={days} />
    </main>
  )
}
