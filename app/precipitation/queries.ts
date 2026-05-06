/* Handles queries 5, 6, 7, 13, and 14 */
import { sql } from "kysely"

export type DailyTopPrecipitationCapital = {
  local_date: string
  precip_rank: number
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  total_precipitation_mm: number
}

/**
 * Query for #5:
 *
 * > Which state capitals had the highest total precipitation over the stored historical window?
 */
export const daily_top_precipitation_capitals = sql`
WITH city_daily_precip AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        SUM(o.precipitation_mm) AS total_precipitation_mm
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
ranked AS (
    SELECT
        local_date,
        state_id,
        state_name,
        city_id,
        city_name,
        total_precipitation_mm,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY total_precipitation_mm DESC, city_name
        ) AS precip_rank
    FROM city_daily_precip
)
SELECT
    local_date,
    precip_rank,
    state_id,
    state_name,
    city_id,
    city_name,
    ROUND(total_precipitation_mm, 2) AS total_precipitation_mm
FROM ranked
WHERE precip_rank <= 10
ORDER BY
    local_date,
    precip_rank;
`

/* -------------------------------------------------------------------------- */
/* Query 6: Daily top zero-precipitation capitals                             */
/* -------------------------------------------------------------------------- */

export type DailyTopZeroPrecipitationCapital = {
  local_date: string
  zero_precip_rank: number
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  zero_precip_hours: number
}

/**
 * Query for #6:
 *
 * > Which state capitals had zero precipitation for the greatest number of stored observation hours?
 *
 */
export const daily_top_zero_precipitation_capitals = sql<DailyTopZeroPrecipitationCapital>`
WITH city_daily_zero_precip AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        SUM(
            CASE
                WHEN o.precipitation_mm = 0 THEN 1
                ELSE 0
            END
        ) AS zero_precip_hours
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
ranked AS (
    SELECT
        local_date,
        state_id,
        state_name,
        city_id,
        city_name,
        zero_precip_hours,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY zero_precip_hours DESC, city_name
        ) AS zero_precip_rank
    FROM city_daily_zero_precip
)
SELECT
    local_date,
    zero_precip_rank,
    state_id,
    state_name,
    city_id,
    city_name,
    zero_precip_hours
FROM ranked
WHERE zero_precip_rank <= 10
ORDER BY
    local_date,
    zero_precip_rank;
`

export type DailyAverageHumidity = {
  local_date: string
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  avg_relative_humidity_pct: number
}

/**
 * Query for #7:
 *
 * > What was the average humidity by state for each stored local day in the time window?
 *
 */
export const daily_average_humidity = sql<DailyAverageHumidity>`
SELECT
    DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
    s.state_id,
    s.state_name,
    c.city_id,
    c.city_name,
    ROUND(AVG(o.relative_humidity_2m_pct), 2) AS avg_relative_humidity_pct
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
ORDER BY
    local_date,
    avg_relative_humidity_pct DESC,
    city_name;
`

/* -------------------------------------------------------------------------- */
/* Query 13: Daily Annapolis rainfall comparison                              */
/* -------------------------------------------------------------------------- */

export type DailyAnnapolisRainfallComparison = {
  local_date: string
  result_group: "Annapolis" | "Nearby capital"
  city_id: number
  city_name: string
  state_name: string
  total_precipitation_mm: number
  experiencing_rainfall: "Yes" | "No"
  comparison_rank: number
}

/**
 * Query for #13:
 *
 * > Was Annapolis experiencing rainfall, and how did its precipitation compare with the
 * > 5 nearest monitored capital cities?
 *
 */
export const daily_annapolis_rainfall_comparison = sql<DailyAnnapolisRainfallComparison>`
WITH annapolis AS (
    SELECT
        c.city_id,
        c.city_name,
        c.lat,
        c.lon
    FROM cities c
    WHERE c.city_name = 'Annapolis'
),
nearby_cities AS (
    SELECT
        c.city_id,
        c.city_name,
        s.state_name,
        ((c.lat - a.lat) * (c.lat - a.lat) + (c.lon - a.lon) * (c.lon - a.lon)) AS distance_sq
    FROM cities c
    JOIN states s
        ON c.state_id = s.state_id
    CROSS JOIN annapolis a
    WHERE c.city_id <> a.city_id
    ORDER BY distance_sq
    LIMIT 5
),
daily_precip AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        c.city_id,
        c.city_name,
        s.state_name,
        SUM(o.precipitation_mm) AS total_precipitation_mm
    FROM observations o
    JOIN cities c
        ON o.city_id = c.city_id
    JOIN states s
        ON c.state_id = s.state_id
    WHERE c.city_id IN (
        SELECT city_id FROM annapolis
        UNION
        SELECT city_id FROM nearby_cities
    )
    GROUP BY
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)),
        c.city_id,
        c.city_name,
        s.state_name
),
labeled AS (
    SELECT
        dp.local_date,
        CASE
            WHEN dp.city_name = 'Annapolis' THEN 'Annapolis'
            ELSE 'Nearby capital'
        END AS result_group,
        dp.city_id,
        dp.city_name,
        dp.state_name,
        dp.total_precipitation_mm
    FROM daily_precip dp
),
ranked AS (
    SELECT
        local_date,
        result_group,
        city_id,
        city_name,
        state_name,
        total_precipitation_mm,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY total_precipitation_mm DESC, city_name
        ) AS comparison_rank
    FROM labeled
)
SELECT
    local_date,
    result_group,
    city_id,
    city_name,
    state_name,
    ROUND(total_precipitation_mm, 2) AS total_precipitation_mm,
    CASE
        WHEN total_precipitation_mm > 0 THEN 'Yes'
        ELSE 'No'
    END AS experiencing_rainfall,
    comparison_rank
FROM ranked
ORDER BY
    local_date,
    comparison_rank;
`

export type DailyDryHeatCapital = {
  local_date: string
  dry_heat_rank: number
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  matching_hours: number
  pct_of_daily_hours: number
}

/**
 * Query for #14:
 *
 * > Which capital cities had temperatures above their own stored-window average
 * > at the same time that humidity was below their own stored-window average?
 */
export const daily_dry_heat_capitals = sql`
WITH city_avgs AS (
    SELECT
        city_id,
        AVG(temperature_2m_c) AS avg_temp_c,
        AVG(relative_humidity_2m_pct) AS avg_humidity_pct
    FROM observations
    GROUP BY city_id
),
city_daily_matches AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        COUNT(*) AS total_daily_hours,
        SUM(
            CASE
                WHEN o.temperature_2m_c > ca.avg_temp_c
                 AND o.relative_humidity_2m_pct < ca.avg_humidity_pct
                THEN 1
                ELSE 0
            END
        ) AS matching_hours
    FROM observations o
    JOIN city_avgs ca
        ON o.city_id = ca.city_id
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
        matching_hours,
        ROUND(100.0 * matching_hours / total_daily_hours, 2) AS pct_of_daily_hours
    FROM city_daily_matches
),
ranked AS (
    SELECT
        local_date,
        state_id,
        state_name,
        city_id,
        city_name,
        matching_hours,
        pct_of_daily_hours,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY matching_hours DESC, pct_of_daily_hours DESC, city_name
        ) AS dry_heat_rank
    FROM scored
)
SELECT
    local_date,
    dry_heat_rank,
    state_id,
    state_name,
    city_id,
    city_name,
    matching_hours,
    pct_of_daily_hours
FROM ranked
WHERE dry_heat_rank <= 10
ORDER BY
    local_date,
    dry_heat_rank;
`
