"use client"

import { useMemo, useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { WeatherMap } from "@/components/weather-map"

type CapitalMarker = {
  id: string | number
  cityName: string
  stateName: string
  lat: number
  lon: number
  value: number
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
  return new Date(`${key}T00:00:00`)
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

  return (
    <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="font-semibold">Select day</h2>
          <p className="text-muted-foreground text-sm">
            Days outside the database range are disabled.
          </p>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate!}
          defaultMonth={selectedDate!}
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

      <div className="overflow-hidden rounded-xl border">
        <WeatherMap capitals={selectedCapitals} />
      </div>
    </section>
  )
}
