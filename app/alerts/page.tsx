import { AlertExplorer } from "@/app/alerts/alert-explorer"
import { db } from "@/db/client"
import {
  daily_active_severe_alert_capitals,
  daily_active_severe_alert_summary,
  daily_alert_coverage_capitals,
  daily_most_common_alert_type,
  daily_severe_alert_capitals,
  type DailyActiveSevereAlertCapital,
  type DailyActiveSevereAlertSummary,
  type DailyAlertCoverageCapital,
  type DailyMostCommonAlertType,
  type DailySevereAlertCapital,
} from "@/app/alerts/queries"
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
  const severeAlertRows = await db
    .executeQuery(daily_severe_alert_capitals.compile(db))
    .then((r) => r.rows as DailySevereAlertCapital[])

  const commonAlertRows = await db
    .executeQuery(daily_most_common_alert_type.compile(db))
    .then((r) => r.rows as DailyMostCommonAlertType[])

  const activeSevereSummaryRows = await db
    .executeQuery(daily_active_severe_alert_summary.compile(db))
    .then((r) => r.rows as DailyActiveSevereAlertSummary[])

  const activeSevereCapitalRows = await db
    .executeQuery(daily_active_severe_alert_capitals.compile(db))
    .then((r) => r.rows as DailyActiveSevereAlertCapital[])

  const alertCoverageRows = await db
    .executeQuery(daily_alert_coverage_capitals.compile(db))
    .then((r) => r.rows as DailyAlertCoverageCapital[])

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

  const severeRankByDateAndCityId = new Map<string, number>()
  const severeCountByDateAndCityId = new Map<string, number>()

  for (const row of severeAlertRows) {
    const dateKey = toDateKey(row.local_date)
    const key = `${dateKey}:${row.city_id}`

    severeRankByDateAndCityId.set(key, Number(row.severe_alert_rank))
    severeCountByDateAndCityId.set(key, Number(row.severe_alert_count))
  }

  const commonTypeByDateAndCityId = new Map<string, string>()
  const commonSeverityByDateAndCityId = new Map<string, string>()
  const commonCountByDateAndCityId = new Map<string, number>()

  for (const row of commonAlertRows) {
    const dateKey = toDateKey(row.local_date)
    const key = `${dateKey}:${row.city_id}`

    commonTypeByDateAndCityId.set(key, row.most_common_alert_type)
    commonSeverityByDateAndCityId.set(key, row.severity_level)
    commonCountByDateAndCityId.set(key, Number(row.alert_count))
  }

  const coverageRankByDateAndCityId = new Map<string, number>()
  const totalHoursByDateAndCityId = new Map<string, number>()
  const activeHoursByDateAndCityId = new Map<string, number>()
  const coveragePctByDateAndCityId = new Map<string, number>()

  for (const row of alertCoverageRows) {
    const dateKey = toDateKey(row.local_date)
    const key = `${dateKey}:${row.city_id}`

    coverageRankByDateAndCityId.set(key, Number(row.alert_coverage_rank))
    totalHoursByDateAndCityId.set(key, Number(row.total_observation_hours))
    activeHoursByDateAndCityId.set(
      key,
      Number(row.observation_hours_with_active_alert)
    )
    coveragePctByDateAndCityId.set(
      key,
      Number(row.pct_observation_hours_with_active_alert)
    )
  }

  const summaryByDate = new Map<
    string,
    {
      activeSevereAlerts: number
      capitalsWithActiveSevereAlerts: number
    }
  >()

  for (const row of activeSevereSummaryRows) {
    const dateKey = toDateKey(row.local_date)

    summaryByDate.set(dateKey, {
      activeSevereAlerts: Number(row.active_severe_alerts),
      capitalsWithActiveSevereAlerts: Number(
        row.capitals_with_active_severe_alerts
      ),
    })
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

      severeAlertRank?: number
      severeAlertCount?: number

      activeSevereAlertCount?: number

      mostCommonAlertType?: string
      mostCommonAlertSeverity?: string
      mostCommonAlertCount?: number

      alertCoverageRank?: number
      totalObservationHours?: number
      observationHoursWithActiveAlert?: number
      pctObservationHoursWithActiveAlert?: number
    }>
  >()

  for (const row of activeSevereCapitalRows) {
    const dateKey = toDateKey(row.local_date)
    const city = cityById.get(row.city_id)

    if (!city) continue

    const current = daysMap.get(dateKey) ?? []
    const key = `${dateKey}:${row.city_id}`

    const pctCoverage = coveragePctByDateAndCityId.get(key) ?? 0

    current.push({
      id: city.id,
      cityName: city.cityName,
      stateName: city.stateName,
      lat: city.lat,
      lon: city.lon,

      value: pctCoverage,

      severeAlertRank: severeRankByDateAndCityId.get(key),
      severeAlertCount: severeCountByDateAndCityId.get(key),

      activeSevereAlertCount: Number(row.active_severe_alert_count),

      mostCommonAlertType: commonTypeByDateAndCityId.get(key),
      mostCommonAlertSeverity: commonSeverityByDateAndCityId.get(key),
      mostCommonAlertCount: commonCountByDateAndCityId.get(key),

      alertCoverageRank: coverageRankByDateAndCityId.get(key),
      totalObservationHours: totalHoursByDateAndCityId.get(key),
      observationHoursWithActiveAlert: activeHoursByDateAndCityId.get(key),
      pctObservationHoursWithActiveAlert: pctCoverage,
    })

    daysMap.set(dateKey, current)
  }

  const days = Array.from(daysMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, capitals]) => ({
      date,
      summary: summaryByDate.get(date),
      capitals: capitals.sort((a, b) => b.value - a.value),
    }))

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Alerts Map</h1>
        <p className="text-muted-foreground text-sm">
          Daily severe weather alert counts, active severe alerts, most common
          alert types, and alert coverage by capital city. Hover over labels or
          dots to see details.
        </p>
      </div>

      <AlertExplorer days={days} />
    </main>
  )
}
