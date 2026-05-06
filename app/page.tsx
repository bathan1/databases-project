import { TemperatureExplorer } from "@/components/temperature-explorer"
import { db } from "@/db/client"
import { daily_city_average_temperature } from "@/db/queries/temperature-queries"
import { sql } from "kysely"

type DailyCityAverageTemperatureRow = {
  local_date: string | Date
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  avg_temp_c: string | number
}

function toDateKey(value: string | Date) {
  if (typeof value === "string") {
    return value.slice(0, 10)
  }

  return value.toISOString().slice(0, 10)
}

export default async function Page() {
  const rows = await db
    .executeQuery(daily_city_average_temperature.compile(db))
    .then((r) => r.rows as DailyCityAverageTemperatureRow[])

  const capitalCities = await db
    .selectFrom("cities")
    .innerJoin("states", "states.state_id", "cities.state_id")
    .select([
      "cities.city_id as id",
      "cities.city_name as cityName",
      "states.state_name as stateName",
      sql<number>`CAST(ROUND(cities.lat, 2) AS DOUBLE)`.as("lat"),
      sql<number>`CAST(ROUND(cities.lon, 2) AS DOUBLE)`.as("lon"),
    ])
    .execute()

  const cityById = new Map(capitalCities.map((city) => [city.id, city]))

  const daysMap = new Map<
    string,
    Array<{
      id: string | number
      cityName: string
      stateName: string
      lat: number
      lon: number
      value: number
    }>
  >()

  for (const row of rows) {
    const dateKey = toDateKey(row.local_date)
    const city = cityById.get(row.city_id)

    if (!city) continue

    const current = daysMap.get(dateKey) ?? []

    current.push({
      id: city.id,
      cityName: city.cityName,
      stateName: city.stateName,
      lat: city.lat,
      lon: city.lon,
      value: Number(row.avg_temp_c),
    })

    daysMap.set(dateKey, current)
  }

  const days = Array.from(daysMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, capitals]) => ({
      date,
      capitals,
    }))

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Weather Map</h1>
        <p className="text-muted-foreground text-sm">
          Daily average temperature by capital city.
        </p>
      </div>

      <TemperatureExplorer days={days} />
    </main>
  )
}
