"use client";

import "maplibre-gl/dist/maplibre-gl.css"
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre"

type CapitalMarker = {
  id: string | number
  cityName: string
  stateName: string
  lat: number
  lon: number
  value: number
}

export function WeatherMap({ capitals }: { capitals: CapitalMarker[] }) {
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

      {capitals.map((capital) => (
        <Marker
          key={capital.id}
          longitude={capital.lon}
          latitude={capital.lat}
          anchor="bottom"
        >
          <button className="rounded-full border bg-background px-2 py-1 text-xs shadow">
            {capital.cityName}
          </button>
        </Marker>
      ))}
    </Map>
  )
}
