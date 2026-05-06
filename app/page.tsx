import { WeatherMap } from "@/components/weather-map"
import { db } from "@/db/client"
import { sql } from "kysely"

export default async function Page() {
  const capitalCities = await db
    .selectFrom("cities")
    .innerJoin("states", "states.state_id", "cities.state_id")
    .select([
      "cities.city_id as id",
      "cities.city_name as cityName",
      "states.state_name as stateName",

      sql<number>`CAST(ROUND(cities.lat, 2) AS DOUBLE)`.as("lat"),
      sql<number>`CAST(ROUND(cities.lon, 2) AS DOUBLE)`.as("lon"),

      sql.lit(1).as("value"),
    ])
    .execute()

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Weather Map</h1>
        <p className="text-muted-foreground text-sm">
          Placeholder capital city markers.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <WeatherMap capitals={capitalCities} />
      </div>
    </main>
  )
}
