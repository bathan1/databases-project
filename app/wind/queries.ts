/* Handles queries 4, 11 */
import { sql } from "kysely"

export type DailyCityMaxWind = {
  local_date: string
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  timestamp: string | Date
  max_windspeed_10m_kmh: number
}

/**
 * Query for #4:
 *
 * > For each state, what was the maximum wind speed recorded at its capital city over the stored time window, and when did it occur?
 *
 * Updated to partition by local day per day for each city state
 */
export const daily_city_max_wind = sql`
WITH ranked_wind AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        o.timestamp,
        o.windspeed_10m_kmh,
        ROW_NUMBER() OVER (
            PARTITION BY
                DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)),
                s.state_id,
                c.city_id
            ORDER BY
                o.windspeed_10m_kmh DESC,
                o.timestamp ASC
        ) AS rn
    FROM observations o
    JOIN cities c
        ON o.city_id = c.city_id
    JOIN states s
        ON c.state_id = s.state_id
)
SELECT
    local_date,
    state_id,
    state_name,
    city_id,
    city_name,
    timestamp,
    windspeed_10m_kmh AS max_windspeed_10m_kmh
FROM ranked_wind
WHERE rn = 1
ORDER BY
    local_date,
    max_windspeed_10m_kmh DESC,
    state_name;
`

export type DailyTopTenWindiestCapital = {
  local_date: string
  wind_rank: number
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  avg_windspeed_10m_kmh: number
  max_windspeed_10m_kmh: number
}

/**
 * Query for #11:
 *
 * > Over the stored historical period, which capital cities recorded the highest average maximum wind speeds?
 *
 */
export const daily_top_ten_windiest = sql`
WITH city_daily_wind AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        AVG(o.windspeed_10m_kmh) AS avg_windspeed_10m_kmh,
        MAX(o.windspeed_10m_kmh) AS max_windspeed_10m_kmh
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
        avg_windspeed_10m_kmh,
        max_windspeed_10m_kmh,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY
                avg_windspeed_10m_kmh DESC,
                max_windspeed_10m_kmh DESC,
                city_name
        ) AS wind_rank
    FROM city_daily_wind
)
SELECT
    local_date,
    wind_rank,
    state_id,
    state_name,
    city_id,
    city_name,
    ROUND(avg_windspeed_10m_kmh, 2) AS avg_windspeed_10m_kmh,
    max_windspeed_10m_kmh
FROM ranked
WHERE wind_rank <= 10
ORDER BY
    local_date,
    wind_rank;
`
