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

export type WindCapitalMarker = {
  id: string | number
  cityName: string
  stateName: string
  lat: number
  lon: number

  /**
   * For wind map:
   * value = daily max wind speed in km/h
   */
  value: number

  windRank?: number
  avgWindSpeedKmh?: number
  maxWindSpeedKmh?: number
  maxWindOccurredAt?: string | Date
}

function windColor(speedKmh: number) {
  if (speedKmh >= 60) return "#7f1d1d"
  if (speedKmh >= 45) return "#b91c1c"
  if (speedKmh >= 35) return "#ea580c"
  if (speedKmh >= 25) return "#facc15"
  if (speedKmh >= 15) return "#84cc16"
  if (speedKmh >= 8) return "#38bdf8"
  return "#93c5fd"
}

function windMarkerClass(speedKmh: number) {
  if (speedKmh >= 60) return "bg-red-900 text-white border-red-950"
  if (speedKmh >= 45) return "bg-red-700 text-white border-red-900"
  if (speedKmh >= 35) return "bg-orange-600 text-white border-orange-800"
  if (speedKmh >= 25) return "bg-yellow-300 text-black border-yellow-500"
  if (speedKmh >= 15) return "bg-lime-300 text-black border-lime-500"
  if (speedKmh >= 8) return "bg-sky-300 text-black border-sky-500"
  return "bg-blue-200 text-black border-blue-400"
}

function makeStateFillExpression(capitals: WindCapitalMarker[]) {
  const expression: any[] = ["match", ["get", "NAME"]]

  for (const capital of capitals) {
    expression.push(capital.stateName.trim(), windColor(capital.value))
  }

  expression.push("#e5e7eb")
  return expression
}

function formatTime(value: string | Date | undefined) {
  if (!value) return "Unknown"

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function WindMarkerHoverCard({ capital }: { capital: WindCapitalMarker }) {
  const isRanked = capital.windRank != null

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
              windMarkerClass(capital.value),
            ].join(" ")}
          >
            {isRanked ? capital.cityName : null}

            {capital.windRank != null && (
              <span className="absolute -right-3 -top-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
                💨 {capital.windRank}
              </span>
            )}
          </button>
        }
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
              Daily wind summary
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <div className="text-muted-foreground text-xs">
              Max wind speed
            </div>
            <div className="text-2xl font-semibold">
              {capital.value.toFixed(1)} km/h
            </div>
            <div className="text-muted-foreground text-xs">
              Occurred at {formatTime(capital.maxWindOccurredAt)}
            </div>
          </div>

          {capital.avgWindSpeedKmh != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Average wind speed
              </div>
              <div className="text-lg font-semibold">
                {capital.avgWindSpeedKmh.toFixed(1)} km/h
              </div>
            </div>
          )}

          {capital.windRank != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">Wind ranking</div>
              <div className="text-lg font-semibold">
                💨 #{capital.windRank} windiest capital
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function WindMap({ capitals }: { capitals: WindCapitalMarker[] }) {
  const stateFillLayer: LayerProps = {
    id: "state-wind-fill",
    type: "fill",
    paint: {
      "fill-color": makeStateFillExpression(capitals) as any,
      "fill-opacity": 0.45,
    },
  }

  const stateBorderLayer: LayerProps = {
    id: "state-wind-borders",
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

      <Source id="us-states-wind" type="geojson" data="/us-states.geojson">
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
          <WindMarkerHoverCard capital={capital} />
        </Marker>
      ))}
    </Map>
  )
}
