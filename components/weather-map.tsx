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
  return (
    <HoverCard>
      <HoverCardTrigger render={(
        <button
          type="button"
          className={[
            "rounded-full border px-2 py-1 text-xs font-medium shadow",
            "transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tempMarkerClass(capital.value),
          ].join(" ")}
        >
          {capital.cityName}
        </button>
      )}/>

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
              Capital city average temperature
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

          <div className="text-muted-foreground text-xs">
            This value is calculated from the first available day of hourly
            observations.
          </div>
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
      style={{ width: "100%", height: 500 }}
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
