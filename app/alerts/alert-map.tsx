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

export type AlertCapitalMarker = {
  id: string | number
  cityName: string
  stateName: string
  lat: number
  lon: number

  /**
   * For this map:
   * value = percentage of daily observation hours with an active alert.
   */
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
}

function alertCoverageColor(pct: number) {
  if (pct >= 80) return "#7f1d1d"
  if (pct >= 60) return "#b91c1c"
  if (pct >= 40) return "#ea580c"
  if (pct >= 25) return "#facc15"
  if (pct >= 10) return "#38bdf8"
  if (pct > 0) return "#93c5fd"
  return "#e5e7eb"
}

function alertMarkerClass(pct: number) {
  if (pct >= 80) return "bg-red-900 text-white border-red-950"
  if (pct >= 60) return "bg-red-700 text-white border-red-900"
  if (pct >= 40) return "bg-orange-600 text-white border-orange-800"
  if (pct >= 25) return "bg-yellow-300 text-black border-yellow-500"
  if (pct >= 10) return "bg-sky-300 text-black border-sky-500"
  if (pct > 0) return "bg-blue-200 text-black border-blue-400"
  return "bg-muted text-muted-foreground border-border"
}

function severityLabelClass(severity: string | undefined) {
  switch (severity) {
    case "extreme":
      return "bg-red-900 text-white border-red-950"
    case "high":
      return "bg-red-600 text-white border-red-800"
    case "medium":
      return "bg-orange-400 text-black border-orange-600"
    case "low":
      return "bg-yellow-200 text-black border-yellow-400"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

function makeStateFillExpression(capitals: AlertCapitalMarker[]) {
  const expression: any[] = ["match", ["get", "NAME"]]

  for (const capital of capitals) {
    expression.push(capital.stateName.trim(), alertCoverageColor(capital.value))
  }

  expression.push("#e5e7eb")

  return expression
}

function AlertMarkerHoverCard({ capital }: { capital: AlertCapitalMarker }) {
  const hasActiveSevereAlert =
    capital.activeSevereAlertCount != null && capital.activeSevereAlertCount > 0

  const isRanked =
    capital.severeAlertRank != null ||
    capital.alertCoverageRank != null ||
    hasActiveSevereAlert

  const shouldShowLabel = isRanked || capital.mostCommonAlertType != null

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
              shouldShowLabel
                ? "rounded-full px-2 py-1 text-xs font-medium"
                : "size-2.5 rounded-full p-0",
              alertMarkerClass(capital.value),
            ].join(" ")}
          >
            {shouldShowLabel ? capital.cityName : null}

            {capital.severeAlertRank != null && (
              <span className="absolute -right-3 -top-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
                ⚠️ {capital.severeAlertRank}
              </span>
            )}

            {capital.alertCoverageRank != null && (
              <span className="absolute -right-3 -bottom-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
                📊 {capital.alertCoverageRank}
              </span>
            )}

            {hasActiveSevereAlert && (
              <span className="absolute -left-3 -top-3 rounded-full border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow">
                🚨 {capital.activeSevereAlertCount}
              </span>
            )}

            {capital.mostCommonAlertSeverity && (
              <span
                className={[
                  "absolute -left-3 -bottom-3 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold shadow",
                  severityLabelClass(capital.mostCommonAlertSeverity),
                ].join(" ")}
              >
                {capital.mostCommonAlertSeverity}
              </span>
            )}
          </button>
        }
      />

      <HoverCardContent
        side="top"
        align="center"
        sideOffset={8}
        className="z-[9999] w-72"
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">
              {capital.cityName}, {capital.stateName}
            </div>
            <div className="text-muted-foreground text-xs">
              Daily alert summary
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <div className="text-muted-foreground text-xs">
              Active-alert coverage
            </div>
            <div className="text-2xl font-semibold">
              {capital.value.toFixed(1)}%
            </div>

            {capital.observationHoursWithActiveAlert != null &&
              capital.totalObservationHours != null && (
                <div className="text-muted-foreground text-sm">
                  {capital.observationHoursWithActiveAlert} of{" "}
                  {capital.totalObservationHours} observed hours
                </div>
              )}

            {capital.alertCoverageRank != null && (
              <div className="text-muted-foreground text-sm">
                📊 #{capital.alertCoverageRank} highest alert coverage
              </div>
            )}
          </div>

          {capital.severeAlertCount != null && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Severe alert count
              </div>
              <div className="text-lg font-semibold">
                {capital.severeAlertCount} severe alerts
              </div>

              {capital.severeAlertRank != null && (
                <div className="text-muted-foreground text-sm">
                  ⚠️ #{capital.severeAlertRank} by severe alert count
                </div>
              )}
            </div>
          )}

          {hasActiveSevereAlert && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Active severe alerts
              </div>
              <div className="text-lg font-semibold">
                🚨 {capital.activeSevereAlertCount} active severe alert
                {capital.activeSevereAlertCount === 1 ? "" : "s"}
              </div>
            </div>
          )}

          {capital.mostCommonAlertType && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs">
                Most common alert type
              </div>
              <div className="text-lg font-semibold">
                {capital.mostCommonAlertType}
              </div>

              <div className="mt-2 flex items-center gap-2">
                {capital.mostCommonAlertSeverity && (
                  <span
                    className={[
                      "rounded-full border px-2 py-0.5 text-xs font-medium",
                      severityLabelClass(capital.mostCommonAlertSeverity),
                    ].join(" ")}
                  >
                    {capital.mostCommonAlertSeverity}
                  </span>
                )}

                {capital.mostCommonAlertCount != null && (
                  <span className="text-muted-foreground text-sm">
                    {capital.mostCommonAlertCount} occurrence
                    {capital.mostCommonAlertCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export function AlertMap({ capitals }: { capitals: AlertCapitalMarker[] }) {
  const stateFillLayer: LayerProps = {
    id: "state-alert-fill",
    type: "fill",
    paint: {
      "fill-color": makeStateFillExpression(capitals) as any,
      "fill-opacity": 0.45,
    },
  }

  const stateBorderLayer: LayerProps = {
    id: "state-alert-borders",
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

      <Source id="us-states-alerts" type="geojson" data="/us-states.geojson">
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
          <AlertMarkerHoverCard capital={capital} />
        </Marker>
      ))}
    </Map>
  )
}
