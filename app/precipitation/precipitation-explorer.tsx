"use client"

import { useMemo, useState } from "react"
import {
  PrecipitationMap,
  type PrecipitationCapitalMarker,
} from "@/app/precipitation/precipitation-map"

type PrecipitationDay = {
  date: string
  capitals: PrecipitationCapitalMarker[]
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

export function PrecipitationExplorer({
  days,
}: {
  days: PrecipitationDay[]
}) {
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

  const mostHumidCapital = [...selectedCapitals].sort(
    (a, b) => b.value - a.value
  )[0]

  const leastHumidCapital = [...selectedCapitals].sort(
    (a, b) => a.value - b.value
  )[0]

  const topPrecipitation = selectedCapitals
    .filter((capital) => capital.precipRank != null)
    .sort((a, b) => (a.precipRank ?? 999) - (b.precipRank ?? 999))

  const topZeroPrecipitation = selectedCapitals
    .filter((capital) => capital.zeroPrecipRank != null)
    .sort((a, b) => (a.zeroPrecipRank ?? 999) - (b.zeroPrecipRank ?? 999))

  const topDryHeat = selectedCapitals
    .filter((capital) => capital.dryHeatRank != null)
    .sort((a, b) => (a.dryHeatRank ?? 999) - (b.dryHeatRank ?? 999))

  const annapolis = selectedCapitals.find((capital) => capital.isAnnapolis)

  if (days.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        No precipitation or humidity data found.
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
        <PrecipitationMap capitals={selectedCapitals} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Humidity summary</h2>

          <div className="space-y-3 text-sm">
            {mostHumidCapital && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-muted-foreground">Most humid capital</div>
                <div className="font-medium">
                  {mostHumidCapital.cityName}, {mostHumidCapital.stateName}
                </div>
                <div className="text-muted-foreground">
                  {mostHumidCapital.value.toFixed(1)}%
                </div>
              </div>
            )}

            {leastHumidCapital && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-muted-foreground">Least humid capital</div>
                <div className="font-medium">
                  {leastHumidCapital.cityName}, {leastHumidCapital.stateName}
                </div>
                <div className="text-muted-foreground">
                  {leastHumidCapital.value.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Annapolis rainfall</h2>

          {annapolis ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="font-medium">
                🏛️ Annapolis, {annapolis.stateName}
              </div>
              <div className="text-muted-foreground">
                Rainfall: {annapolis.annapolisRainfall ?? "Unknown"}
              </div>

              {annapolis.annapolisTotalPrecipitationMm != null && (
                <div className="text-muted-foreground">
                  Total precipitation:{" "}
                  {annapolis.annapolisTotalPrecipitationMm.toFixed(2)} mm
                </div>
              )}

              {annapolis.annapolisComparisonRank != null && (
                <div className="text-muted-foreground">
                  Rank #{annapolis.annapolisComparisonRank} among Annapolis + 5
                  nearby capitals
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No Annapolis comparison found for this day.
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Top precipitation</h2>

          <div className="space-y-2">
            {topPrecipitation.map((capital) => (
              <div
                key={capital.id}
                className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    🌧️ {capital.precipRank}. {capital.cityName}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {capital.stateName}
                  </div>
                </div>

                <div className="font-medium">
                  {(capital.totalPrecipitationMm ?? 0).toFixed(2)} mm
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Most zero-precip hours</h2>

          <div className="space-y-2">
            {topZeroPrecipitation.map((capital) => (
              <div
                key={capital.id}
                className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    🏜️ {capital.zeroPrecipRank}. {capital.cityName}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {capital.stateName}
                  </div>
                </div>

                <div className="font-medium">
                  {capital.zeroPrecipHours ?? 0} hrs
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm md:col-span-2 xl:col-span-2">
          <h2 className="mb-3 font-semibold">Dry heat capitals</h2>

          <div className="grid gap-2 md:grid-cols-2">
            {topDryHeat.map((capital) => (
              <div
                key={capital.id}
                className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    🥵 {capital.dryHeatRank}. {capital.cityName}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {capital.stateName}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-medium">
                    {capital.dryHeatMatchingHours ?? 0} hrs
                  </div>

                  {capital.dryHeatPctOfDailyHours != null && (
                    <div className="text-muted-foreground text-xs">
                      {capital.dryHeatPctOfDailyHours.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
