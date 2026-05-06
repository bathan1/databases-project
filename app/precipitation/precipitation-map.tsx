"use client"

import "maplibre-gl/dist/maplibre-gl.css"

import Map, {
  Marker,
  NavigationControl,
  Source,
  Layer,
  type LayerProps,
} from "react-map-gl/maplibre"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

export type PrecipitationCapitalMarker = {
  id: string | number
  cityName: string
  stateName: string
  lat: number
  lon: number

  /**
   * For this map:
   * value = average humidity percentage for the selected day.
   */
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
}

function humidityColor(humidityPct: number) {
  if (humidityPct >= 90) return "#0f172a"
  if (humidityPct >= 80) return "#1e3a8a"
  if (humidityPct >= 70) return "#2563eb"
  if (humidityPct >= 60) return "#0891b2"
  if (humidityPct >= 50) return "#14b8a6"
  if (humidityPct >= 40) return "#84cc16"
  if (humidityPct >= 30) return "#facc15"
  return "#f97316"
}

function humidityMarkerClass(humidityPct: number) {
  if (humidityPct >= 90) return "bg-slate-900 text-white border-slate-950"
  if (humidityPct >= 80) return "bg-blue-900 text-white border-blue-950"
  if (humidityPct >= 70) return "bg-blue-600 text-white border-blue-800"
  if (humidityPct >= 60) return "bg-cyan-600 text-white border-cyan-800"
  if (humidityPct >= 50) return "bg-teal-400 text-black border-teal-600"
  if (humidityPct >= 40) return "bg-lime-300 text-black border-lime-500"
  if (humidityPct >= 30) return "bg-yellow-300 text-black border-yellow-500"
  return "bg-orange-400 text-black border-orange-600"
}

function makeStateFillExpression(capitals: PrecipitationCapitalMarker[]) {
  const expression: any[] = ["match", ["get", "NAME"]]

  for (const capital of capitals) {
    expression.push(capital.stateName.trim(), humidityColor(capital.value))
  }

  expression.push("#e5e7eb")

  return expression
}

function PrecipitationMarkerHoverCard({
  capital,
}: {
  capital: PrecipitationCapitalMarker
}) {
  const isRanked =
    capital.precipRank != null ||
    capital.zeroPrecipRank != null ||
    capital.dryHeatRank != null ||
    capital.isAnnapolis

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            type="button"
            aria-label={`${capital.cityName}, ${capital.stateName}`}
            className={[
              "relative border shadow transition-transform hover:scale-110",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isRanked
                ? "rounded-full px-2 py-1 text-xs font-medium"
                : "size-2.5 rounded-full p-0",
              humidityMarkerClass(capital.value),
            ].join(" ")}
          >
            {isRanked ? capital.cityName : null}

            {capital.precipRank != null && (
              <span className="absolute -right-3 -top-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
                🌧️ {capital.precipRank}
              </span>
            )}

            {capital.zeroPrecipRank != null && (
              <span className="absolute -right-3 -bottom-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
                🏜️ {capital.zeroPrecipRank}
              </span>
            )}

            {capital.dryHeatRank != null && (
              <span className="absolute -left-3 -top-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
                🥵 {capital.dryHeatRank}
              </span>
            )}

            {capital.isAnnapolis && (
              <span className="absolute -left-3 -bottom-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
                🏛️
              </span>
            )}
          </button>
        }
      />

      <HoverCardContent
        side="top"
        align="center"
        sideOffset={8}
        className="z-9999 w-72"
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">
              {capital.cityName}, {capital.stateName}
            </div>
            <div className="text-muted-foreground text-xs">
              Daily precipitation and humidity summary
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <div className="text-muted-foreground text-xs">
              Average humidity
            </div>
            <div className="text-2xl font-semibold">
              {(capital.avgHumidityPct ?? capital.value).toFixed(1)}%
            </div>
          </div>

          {capital.totalPrecipitationMm != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Total precipitation
              </div>
              <div className="text-lg font-semibold">
                {capital.totalPrecipitationMm.toFixed(2)} mm
              </div>

              {capital.precipRank != null && (
                <div className="text-muted-foreground text-sm">
                  🌧️ #{capital.precipRank} wettest capital
                </div>
              )}
            </div>
          )}

          {capital.zeroPrecipHours != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Zero-precipitation hours
              </div>
              <div className="text-lg font-semibold">
                {capital.zeroPrecipHours} hours
              </div>

              {capital.zeroPrecipRank != null && (
                <div className="text-muted-foreground text-sm">
                  🏜️ #{capital.zeroPrecipRank} driest capital
                </div>
              )}
            </div>
          )}

          {capital.dryHeatRank != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Dry heat ranking
              </div>
              <div className="text-lg font-semibold">
                🥵 #{capital.dryHeatRank} dry-heat capital
              </div>

              {capital.dryHeatMatchingHours != null && (
                <div className="text-muted-foreground text-sm">
                  {capital.dryHeatMatchingHours} matching hours
                </div>
              )}

              {capital.dryHeatPctOfDailyHours != null && (
                <div className="text-muted-foreground text-sm">
                  {capital.dryHeatPctOfDailyHours.toFixed(1)}% of daily hours
                </div>
              )}
            </div>
          )}

          {capital.isAnnapolis && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Annapolis rainfall comparison
              </div>
              <div className="text-lg font-semibold">
                🏛️ Rainfall: {capital.annapolisRainfall ?? "Unknown"}
              </div>

              {capital.annapolisTotalPrecipitationMm != null && (
                <div className="text-muted-foreground text-sm">
                  {capital.annapolisTotalPrecipitationMm.toFixed(2)} mm
                </div>
              )}

              {capital.annapolisComparisonRank != null && (
                <div className="text-muted-foreground text-sm">
                  Rank #{capital.annapolisComparisonRank} among Annapolis + 5
                  nearby capitals
                </div>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function PrecipitationMap({
  capitals,
}: {
  capitals: PrecipitationCapitalMarker[]
}) {
  const stateFillLayer: LayerProps = {
    id: "state-humidity-fill",
    type: "fill",
    paint: {
      "fill-color": makeStateFillExpression(capitals) as any,
      "fill-opacity": 0.45,
    },
  }

  const stateBorderLayer: LayerProps = {
    id: "state-humidity-borders",
    type: "line",
    paint: {
      "line-color": "#ffffff",
      "line-width": 1,
    },
  }

  return (
    <Map
      initialViewState={{
        longitude: -98.5795,
        latitude: 39.8283,
        zoom: 3,
      }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      style={{ width: "100%", height: 600 }}
    >
      <NavigationControl position="top-left" />

      <Source
        id="us-states-precipitation"
        type="geojson"
        data="/us-states.geojson"
      >
        <Layer {...stateFillLayer} />
        <Layer {...stateBorderLayer} />
      </Source>

      {capitals.map((capital) => (
        <Marker
          key={capital.id}
          longitude={capital.lon}
          latitude={capital.lat}
          anchor="bottom"
        >
          <PrecipitationMarkerHoverCard capital={capital} />
        </Marker>
      ))}
    </Map>
  )
}
