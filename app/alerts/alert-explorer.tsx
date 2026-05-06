"use client"

import { useMemo, useState } from "react"
import { AlertMap, type AlertCapitalMarker } from "@/app/alerts/alert-map"

type AlertDay = {
  date: string
  capitals: AlertCapitalMarker[]
  summary?: {
    activeSevereAlerts: number
    capitalsWithActiveSevereAlerts: number
  }
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year!, month! - 1, day)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(date: Date) {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  start.setHours(0, 0, 0, 0)
  return start
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
  })
}

function formatMonthDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function AlertExplorer({ days }: { days: AlertDay[] }) {
  const firstDate = days[0]?.date

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    firstDate ? dateFromKey(firstDate) : undefined
  )

  const daysByDate = useMemo(() => {
    return new Map(days.map((day) => [day.date, day]))
  }, [days])

  const availableDates = useMemo(() => {
    return new Set(days.map((day) => day.date))
  }, [days])

  const twoWeekDates = useMemo(() => {
    if (!firstDate) return []

    const firstAvailableDate = dateFromKey(firstDate)
    const weekStart = startOfWeek(firstAvailableDate)

    return Array.from({ length: 14 }, (_, index) => addDays(weekStart, index))
  }, [firstDate])

  const selectedDateKey = selectedDate ? dateKey(selectedDate) : firstDate
  const selectedDay = selectedDateKey
    ? daysByDate.get(selectedDateKey)
    : undefined

  const selectedCapitals = selectedDay?.capitals ?? []

  const topSevereAlerts = selectedCapitals
    .filter((capital) => capital.severeAlertRank != null)
    .sort(
      (a, b) => (a.severeAlertRank ?? 999) - (b.severeAlertRank ?? 999)
    )

  const topAlertCoverage = selectedCapitals
    .filter((capital) => capital.alertCoverageRank != null)
    .sort(
      (a, b) => (a.alertCoverageRank ?? 999) - (b.alertCoverageRank ?? 999)
    )

  const activeSevereCapitals = selectedCapitals
    .filter(
      (capital) =>
        capital.activeSevereAlertCount != null &&
        capital.activeSevereAlertCount > 0
    )
    .sort(
      (a, b) =>
        (b.activeSevereAlertCount ?? 0) - (a.activeSevereAlertCount ?? 0)
    )

  const commonAlertTypes = selectedCapitals
    .filter((capital) => capital.mostCommonAlertType != null)
    .sort(
      (a, b) =>
        (b.mostCommonAlertCount ?? 0) - (a.mostCommonAlertCount ?? 0)
    )

  if (days.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        No alert data found.
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="font-semibold">Select day</h2>
          <p className="text-muted-foreground text-sm">
            Days outside the database range are disabled.
          </p>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {twoWeekDates.map((date) => {
            const key = dateKey(date)
            const isAvailable = availableDates.has(key)
            const isSelected = selectedDateKey === key

            return (
              <button
                key={key}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  if (isAvailable) {
                    setSelectedDate(date)
                  }
                }}
                className={[
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                  !isAvailable
                    ? "cursor-not-allowed opacity-35 hover:bg-background"
                    : "",
                ].join(" ")}
              >
                <div className="text-xs font-medium">
                  {formatDayLabel(date)}
                </div>
                <div className="font-semibold">{formatMonthDay(date)}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <AlertMap capitals={selectedCapitals} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Active severe alerts</h2>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="text-muted-foreground">Active severe alerts</div>
              <div className="text-2xl font-semibold">
                {selectedDay?.summary?.activeSevereAlerts ?? 0}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="text-muted-foreground">
                Capitals with active severe alerts
              </div>
              <div className="text-2xl font-semibold">
                {selectedDay?.summary?.capitalsWithActiveSevereAlerts ?? 0}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Top severe alert counts</h2>

          <div className="space-y-2">
            {topSevereAlerts.map((capital) => (
              <div
                key={capital.id}
                className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    ⚠️ {capital.severeAlertRank}. {capital.cityName}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {capital.stateName}
                  </div>
                </div>

                <div className="font-medium">
                  {capital.severeAlertCount ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Highest alert coverage</h2>

          <div className="space-y-2">
            {topAlertCoverage.map((capital) => (
              <div
                key={capital.id}
                className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    📊 {capital.alertCoverageRank}. {capital.cityName}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {capital.stateName}
                  </div>
                </div>

                <div className="font-medium">
                  {(capital.pctObservationHoursWithActiveAlert ?? 0).toFixed(1)}
                  %
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Currently active severe alerts</h2>

          <div className="space-y-2">
            {activeSevereCapitals.length > 0 ? (
              activeSevereCapitals.map((capital) => (
                <div
                  key={capital.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">🚨 {capital.cityName}</div>
                    <div className="text-muted-foreground text-xs">
                      {capital.stateName}
                    </div>
                  </div>

                  <div className="font-medium">
                    {capital.activeSevereAlertCount}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No active severe alerts for this day.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm md:col-span-2 xl:col-span-2">
          <h2 className="mb-3 font-semibold">Most common alert types</h2>

          <div className="grid gap-2 md:grid-cols-2">
            {commonAlertTypes.map((capital) => (
              <div
                key={capital.id}
                className="rounded-lg border bg-muted/40 px-3 py-2 text-sm"
              >
                <div className="font-medium">
                  {capital.cityName}, {capital.stateName}
                </div>

                <div className="text-muted-foreground text-xs">
                  {capital.mostCommonAlertType}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-full border bg-background px-2 py-0.5 text-xs">
                    {capital.mostCommonAlertSeverity ?? "unknown"}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {capital.mostCommonAlertCount ?? 0} occurrences
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
