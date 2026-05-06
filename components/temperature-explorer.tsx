"use client"

import { useMemo, useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { WindMap } from "@/app/temperature-map"

type CapitalMarker = {
  id: string | number
  cityName: string
  stateName: string
  lat: number
  lon: number
  value: number
  heatRank?: number
  coldRank?: number
}

type TemperatureDay = {
  date: string
  capitals: CapitalMarker[]
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

export function TemperatureExplorer({ days }: { days: TemperatureDay[] }) {
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

  const selectedDateKey = selectedDate ? dateKey(selectedDate) : firstDate
  const selectedDay = selectedDateKey
    ? daysByDate.get(selectedDateKey)
    : undefined

  const selectedCapitals = selectedDay?.capitals ?? []

  const hottestCapital = selectedCapitals[0]
  const coldestCapital = [...selectedCapitals].sort((a, b) => a.value - b.value)[0]

  const topTenHottest = selectedCapitals
    .filter((capital) => capital.heatRank != null)
    .sort((a, b) => (a.heatRank ?? 999) - (b.heatRank ?? 999))

  const topTenColdest = selectedCapitals
    .filter((capital) => capital.coldRank != null)
    .sort((a, b) => (a.coldRank ?? 999) - (b.coldRank ?? 999))

  if (days.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        No temperature data found.
      </div>
    )
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="font-semibold">Select day</h2>
            <p className="text-muted-foreground text-sm">
              Days outside the database range are disabled.
            </p>
          </div>

          <Calendar
            mode="single"
            defaultMonth={selectedDate!}
            selected={selectedDate!}
            onSelect={(date) => {
              if (!date) return

              const key = dateKey(date)

              if (availableDates.has(key)) {
                setSelectedDate(date)
              }
            }}
            disabled={(date) => !availableDates.has(dateKey(date))}
            className="rounded-md border"
          />

          {selectedDateKey && (
            <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="text-muted-foreground">Showing</div>
              <div className="font-medium">{selectedDateKey}</div>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Temperature summary</h2>

          <div className="space-y-3 text-sm">
            {hottestCapital && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-muted-foreground">Hottest capital</div>
                <div className="font-medium">
                  {hottestCapital.cityName}, {hottestCapital.stateName}
                </div>
                <div className="text-muted-foreground">
                  {hottestCapital.value.toFixed(1)}°C
                </div>
              </div>
            )}

            {coldestCapital && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="text-muted-foreground">Coldest capital</div>
                <div className="font-medium">
                  {coldestCapital.cityName}, {coldestCapital.stateName}
                </div>
                <div className="text-muted-foreground">
                  {coldestCapital.value.toFixed(1)}°C
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Top 10 hottest</h2>

          <div className="space-y-2">
            {topTenHottest.map((capital) => (
              <div
                key={capital.id}
                className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    🔥 {capital.heatRank}. {capital.cityName}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {capital.stateName}
                  </div>
                </div>

                <div className="font-medium">{capital.value.toFixed(1)}°C</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Top 10 coldest</h2>

          <div className="space-y-2">
            {topTenColdest.map((capital) => (
              <div
                key={capital.id}
                className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    🧊 {capital.coldRank}. {capital.cityName}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {capital.stateName}
                  </div>
                </div>

                <div className="font-medium">{capital.value.toFixed(1)}°C</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <WindMap capitals={selectedCapitals} />
      </div>
    </section>
  )
}
