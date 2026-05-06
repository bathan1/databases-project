import { WindExplorer } from "@/app/wind/wind-explorer"
import { db } from "@/db/client"
import {
  daily_city_max_wind,
  daily_top_ten_windiest,
  type DailyCityMaxWind,
  type DailyTopTenWindiestCapital,
} from "@/app/wind/queries"
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
  const dailyMaxWindRows = await db
    .executeQuery(daily_city_max_wind.compile(db))
    .then((r) => r.rows as DailyCityMaxWind[])

  const topTenWindiestRows = await db
    .executeQuery(daily_top_ten_windiest.compile(db))
    .then((r) => r.rows as DailyTopTenWindiestCapital[])

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

  const windRankByDateAndCityId = new Map<string, number>()
  const avgWindByDateAndCityId = new Map<string, number>()
  const maxWindByDateAndCityId = new Map<string, number>()

  for (const row of topTenWindiestRows) {
    const dateKey = toDateKey(row.local_date)
    const key = `${dateKey}:${row.city_id}`

    windRankByDateAndCityId.set(key, Number(row.wind_rank))
    avgWindByDateAndCityId.set(key, Number(row.avg_windspeed_10m_kmh))
    maxWindByDateAndCityId.set(key, Number(row.max_windspeed_10m_kmh))
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
      windRank?: number
      avgWindSpeedKmh?: number
      maxWindSpeedKmh?: number
      maxWindOccurredAt?: string | Date
    }>
  >()

  for (const row of dailyMaxWindRows) {
    const dateKey = toDateKey(row.local_date)
    const city = cityById.get(row.city_id)

    if (!city) continue

    const current = daysMap.get(dateKey) ?? []
    const rankKey = `${dateKey}:${row.city_id}`

    current.push({
      id: city.id,
      cityName: city.cityName,
      stateName: city.stateName,
      lat: city.lat,
      lon: city.lon,
      value: Number(row.max_windspeed_10m_kmh),
      windRank: windRankByDateAndCityId.get(rankKey),
      avgWindSpeedKmh: avgWindByDateAndCityId.get(rankKey),
      maxWindSpeedKmh: maxWindByDateAndCityId.get(rankKey),
      maxWindOccurredAt: row.timestamp,
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
        <h1 className="text-2xl font-semibold">Wind Map</h1>
        <p className="text-muted-foreground text-sm">
          Daily maximum wind speed by capital city. Hover over labels or dots to
          see details. Only the top 10 windiest cities are labeled on the map;
          the rest are displayed as dots.
        </p>
      </div>

      <WindExplorer days={days} />
    </main>
  )
}
