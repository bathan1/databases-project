/* Handles queries 8, 9, 12, and 15 */
import { sql } from "kysely"

export type DailySevereAlertCapital = {
  local_date: string
  severe_alert_rank: number
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  severe_alert_count: number
}

/**
 * Query for #8:
 *
 * > Which state capitals had the greatest number of severe weather alerts during the stored alert window?
 */
export const daily_severe_alert_capitals = sql`
WITH daily_alert_counts AS (
    SELECT
        DATE(a.start_time) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        COUNT(*) AS severe_alert_count
    FROM alerts a
    JOIN alert_types at
        ON a.alert_type_id = at.alert_type_id
    JOIN cities c
        ON a.city_id = c.city_id
    JOIN states s
        ON c.state_id = s.state_id
    WHERE at.severity_level IN ('high', 'extreme')
    GROUP BY
        DATE(a.start_time),
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name
),
ranked AS (
    SELECT
        local_date,
        state_id,
        state_name,
        city_id,
        city_name,
        severe_alert_count,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY severe_alert_count DESC, city_name
        ) AS severe_alert_rank
    FROM daily_alert_counts
)
SELECT
    local_date,
    severe_alert_rank,
    state_id,
    state_name,
    city_id,
    city_name,
    severe_alert_count
FROM ranked
WHERE severe_alert_rank <= 10
ORDER BY
    local_date,
    severe_alert_rank;
`

export type DailyMostCommonAlertType = {
  local_date: string
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  alert_type_id: number
  most_common_alert_type: string
  severity_level: string
  alert_count: number
}

/**
 * Query for #9:
 *
 * > What alert type was most common in each state over the stored alert window?
 *
 */
export const daily_most_common_alert_type = sql`
WITH alert_counts AS (
    SELECT
        DATE(a.start_time) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        at.alert_type_id,
        at.alert_name,
        at.severity_level,
        COUNT(*) AS alert_count
    FROM alerts a
    JOIN alert_types at
        ON a.alert_type_id = at.alert_type_id
    JOIN cities c
        ON a.city_id = c.city_id
    JOIN states s
        ON c.state_id = s.state_id
    GROUP BY
        DATE(a.start_time),
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        at.alert_type_id,
        at.alert_name,
        at.severity_level
),
ranked AS (
    SELECT
        local_date,
        state_id,
        state_name,
        city_id,
        city_name,
        alert_type_id,
        alert_name,
        severity_level,
        alert_count,
        ROW_NUMBER() OVER (
            PARTITION BY local_date, state_id, city_id
            ORDER BY alert_count DESC, alert_name
        ) AS rn
    FROM alert_counts
)
SELECT
    local_date,
    state_id,
    state_name,
    city_id,
    city_name,
    alert_type_id,
    alert_name AS most_common_alert_type,
    severity_level,
    alert_count
FROM ranked
WHERE rn = 1
ORDER BY
    local_date,
    state_name,
    city_name;
`

export type DailyActiveSevereAlertSummary = {
  local_date: string
  active_severe_alerts: number
  capitals_with_active_severe_alerts: number
}

/**
 * Query for #12:
 * > At the most recent stored timestamp, how many severe alerts were active across all monitored capital cities?
 */
export const daily_active_severe_alert_summary = sql`
WITH daily_latest_ts AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        MAX(o.timestamp) AS latest_ts
    FROM observations o
    JOIN cities c
        ON o.city_id = c.city_id
    GROUP BY
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp))
)
SELECT
    dlt.local_date,
    COUNT(a.alert_id) AS active_severe_alerts,
    COUNT(DISTINCT a.city_id) AS capitals_with_active_severe_alerts
FROM daily_latest_ts dlt
LEFT JOIN alerts a
    ON a.start_time <= dlt.latest_ts
   AND (a.end_time IS NULL OR a.end_time >= dlt.latest_ts)
LEFT JOIN alert_types at
    ON a.alert_type_id = at.alert_type_id
   AND at.severity_level IN ('high', 'extreme')
WHERE a.alert_id IS NULL
   OR at.severity_level IN ('high', 'extreme')
GROUP BY
    dlt.local_date
ORDER BY
    dlt.local_date;
`

export type DailyActiveSevereAlertCapital = {
  local_date: string
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  active_severe_alert_count: number
}

/**
 * Helper detail query for #12:
 *
 * The original #12 is a summary count, but the map needs city-level markers.
 * This returns active severe alert counts by capital for each day.
 */
export const daily_active_severe_alert_capitals = sql`
WITH daily_latest_ts AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        MAX(o.timestamp) AS latest_ts
    FROM observations o
    JOIN cities c
        ON o.city_id = c.city_id
    GROUP BY
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp))
)
SELECT
    dlt.local_date,
    s.state_id,
    s.state_name,
    c.city_id,
    c.city_name,
    COUNT(a.alert_id) AS active_severe_alert_count
FROM daily_latest_ts dlt
JOIN cities c
JOIN states s
    ON c.state_id = s.state_id
LEFT JOIN alerts a
    ON a.city_id = c.city_id
   AND a.start_time <= dlt.latest_ts
   AND (a.end_time IS NULL OR a.end_time >= dlt.latest_ts)
LEFT JOIN alert_types at
    ON a.alert_type_id = at.alert_type_id
   AND at.severity_level IN ('high', 'extreme')
WHERE a.alert_id IS NULL
   OR at.severity_level IN ('high', 'extreme')
GROUP BY
    dlt.local_date,
    s.state_id,
    s.state_name,
    c.city_id,
    c.city_name
ORDER BY
    dlt.local_date,
    active_severe_alert_count DESC,
    city_name;
`

export type DailyAlertCoverageCapital = {
  local_date: string
  alert_coverage_rank: number
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  total_observation_hours: number
  observation_hours_with_active_alert: number
  pct_observation_hours_with_active_alert: number
}

/**
 * Query for #15:
 *
 * > For each capital city, what percentage of stored observation hours had an active alert,
 * > and which capitals had the highest percentages?
 */
export const daily_alert_coverage_capitals = sql`
WITH city_daily_alert_hours AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        COUNT(*) AS total_observation_hours,
        SUM(
            CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM alerts a
                    WHERE a.city_id = o.city_id
                      AND a.start_time <= o.timestamp
                      AND (a.end_time IS NULL OR a.end_time >= o.timestamp)
                ) THEN 1
                ELSE 0
            END
        ) AS observation_hours_with_active_alert
    FROM observations o
    JOIN cities c
        ON o.city_id = c.city_id
    JOIN states s
        ON c.state_id = s.state_id
    GROUP BY
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)),
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name
),
scored AS (
    SELECT
        local_date,
        state_id,
        state_name,
        city_id,
        city_name,
        total_observation_hours,
        observation_hours_with_active_alert,
        ROUND(
            100.0 * observation_hours_with_active_alert / total_observation_hours,
            2
        ) AS pct_observation_hours_with_active_alert
    FROM city_daily_alert_hours
),
ranked AS (
    SELECT
        local_date,
        state_id,
        state_name,
        city_id,
        city_name,
        total_observation_hours,
        observation_hours_with_active_alert,
        pct_observation_hours_with_active_alert,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY
                pct_observation_hours_with_active_alert DESC,
                observation_hours_with_active_alert DESC,
                city_name
        ) AS alert_coverage_rank
    FROM scored
)
SELECT
    local_date,
    alert_coverage_rank,
    state_id,
    state_name,
    city_id,
    city_name,
    total_observation_hours,
    observation_hours_with_active_alert,
    pct_observation_hours_with_active_alert
FROM ranked
WHERE alert_coverage_rank <= 10
ORDER BY
    local_date,
    alert_coverage_rank;
`
