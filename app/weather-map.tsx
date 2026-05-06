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

type CapitalMarker = {
  id: string | number
  cityName: string
  stateName: string
  lat: number
  lon: number
  value: number
  heatRank?: number
  coldRank?: number
  warmestDaytimeTempC?: number
  coldestNighttimeTempC?: number
}

function tempColor(tempC: number) {
  if (tempC >= 30) return "#b91c1c"
  if (tempC >= 27) return "#ef4444"
  if (tempC >= 24) return "#fb923c"
  if (tempC >= 21) return "#fde047"
  if (tempC >= 18) return "#bef264"
  if (tempC >= 15) return "#67e8f9"
  return "#3b82f6"
}

function tempMarkerClass(tempC: number) {
  if (tempC >= 30) return "bg-red-700 text-white border-red-900"
  if (tempC >= 27) return "bg-red-500 text-white border-red-700"
  if (tempC >= 24) return "bg-orange-400 text-black border-orange-600"
  if (tempC >= 21) return "bg-yellow-300 text-black border-yellow-500"
  if (tempC >= 18) return "bg-lime-300 text-black border-lime-500"
  if (tempC >= 15) return "bg-cyan-300 text-black border-cyan-500"
  return "bg-blue-500 text-white border-blue-700"
}

function makeStateFillExpression(capitals: CapitalMarker[]) {
  const expression: any[] = ["match", ["get", "NAME"]]

  for (const capital of capitals) {
    expression.push(capital.stateName.trim(), tempColor(capital.value))
  }

  expression.push("#e5e7eb")

  return expression
}

function CapitalMarkerHoverCard({ capital }: { capital: CapitalMarker }) {
  const isRanked = capital.heatRank != null || capital.coldRank != null
  const hasDaytimeNighttimeExtreme =
    capital.warmestDaytimeTempC != null || capital.coldestNighttimeTempC != null

  const shouldShowLabel = isRanked || hasDaytimeNighttimeExtreme

  return (
    <HoverCard>
      <HoverCardTrigger
        render={(
        <button
          type="button"
          aria-label={`${capital.cityName}, ${capital.stateName}`}
          className={[
            "relative border shadow transition-transform hover:scale-110",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            shouldShowLabel
              ? "rounded-full px-2 py-1 text-xs font-medium"
              : "size-2.5 rounded-full p-0",
            tempMarkerClass(capital.value),
          ].join(" ")}
        >
          {shouldShowLabel ? capital.cityName : null}

          {capital.heatRank != null && (
            <span className="absolute -right-3 -top-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
              🔥 {capital.heatRank}
            </span>
          )}

          {capital.coldRank != null && (
            <span className="absolute -right-3 -bottom-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
              🧊 {capital.coldRank}
            </span>
          )}

          {capital.warmestDaytimeTempC != null && (
            <span className="absolute -left-3 -top-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
              ☀️
            </span>
          )}

          {capital.coldestNighttimeTempC != null && (
            <span className="absolute -left-3 -bottom-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
              🌙
            </span>
          )}
        </button>
        )}
      />

      <HoverCardContent
        side="top"
        align="center"
        sideOffset={8}
        className="z-9999 w-64"
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">
              {capital.cityName}, {capital.stateName}
            </div>
            <div className="text-muted-foreground text-xs">
              Daily average temperature
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <div className="text-muted-foreground text-xs">
              Average temperature
            </div>
            <div className="text-2xl font-semibold">
              {capital.value.toFixed(1)}°C
            </div>
          </div>

          {capital.heatRank != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">Heat ranking</div>
              <div className="text-lg font-semibold">
                🔥 #{capital.heatRank} hottest capital
              </div>
            </div>
          )}

          {capital.coldRank != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">Cold ranking</div>
              <div className="text-lg font-semibold">
                🧊 #{capital.coldRank} coldest capital
              </div>
            </div>
          )}

          {capital.warmestDaytimeTempC != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Daytime extreme
              </div>
              <div className="text-lg font-semibold">
                ☀️ Warmest daytime capital
              </div>
              <div className="text-muted-foreground text-sm">
                {capital.warmestDaytimeTempC.toFixed(1)}°C daytime average
              </div>
            </div>
          )}

          {capital.coldestNighttimeTempC != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Nighttime extreme
              </div>
              <div className="text-lg font-semibold">
                🌙 Coldest nighttime capital
              </div>
              <div className="text-muted-foreground text-sm">
                {capital.coldestNighttimeTempC.toFixed(1)}°C nighttime average
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function WeatherMap({ capitals }: { capitals: CapitalMarker[] }) {
  const stateFillLayer: LayerProps = {
    id: "state-temperature-fill",
    type: "fill",
    paint: {
      "fill-color": makeStateFillExpression(capitals) as any,
      "fill-opacity": 0.45,
    },
  }

  const stateBorderLayer: LayerProps = {
    id: "state-borders",
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

      <Source id="us-states" type="geojson" data="/us-states.geojson">
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
          <CapitalMarkerHoverCard capital={capital} />
        </Marker>
      ))}
    </Map>
  )
}
