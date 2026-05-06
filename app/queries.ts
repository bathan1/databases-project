/* Runs queries 1, 2, 3, and 10 */

import { sql } from "kysely"

export type DailyCityAverageTemperature = {
  local_date: string
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  avg_temp_c: number
}

/**
 * Query for #1 from [queries.sql]:
 *
 * > Which states had the highest and lowest average temperatures on the most recent stored day?
 *
 * Now we group by day instead of asking for specifically the most recent stored day.
 */
export const daily_city_average_temperature = sql`
SELECT
    DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
    s.state_id,
    s.state_name,
    c.city_id,
    c.city_name,
    ROUND(AVG(o.temperature_2m_c), 2) AS avg_temp_c
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
    avg_temp_c DESC,
    c.city_name;
`

export type TopTenHottestCapital = {
  local_date: string
  heat_rank: number
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  avg_temp_c: number
}

/**
 * Query for #2:
 *
 * > At the most recent stored observation time, which state capitals were in the top 10 for temperature?
 *
 * Instead of asking for most recent, we show top 10 average temperature by day per city-state
 */
export const top_ten_hottest = sql`
WITH city_daily_avg AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        AVG(o.temperature_2m_c) AS avg_temp_c
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
        avg_temp_c,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY avg_temp_c DESC, city_name
        ) AS heat_rank
    FROM city_daily_avg
)
SELECT
    local_date,
    heat_rank,
    state_id,
    state_name,
    city_id,
    city_name,
    ROUND(avg_temp_c, 2) AS avg_temp_c
FROM ranked
WHERE heat_rank <= 10
ORDER BY local_date, heat_rank;
`

export type TopTenColdestCapital = {
  local_date: string
  cold_rank: number
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  avg_temp_c: number
}

/**
 * Query for #3 from [queries.sql]:
 *
 * > At the most recent stored observation time, which state capitals were in the bottom 10 for temperature?
 *
 * Now we partition by day instead of asking for specifically the most recent stored day.
 */
export const top_ten_coldest = sql`
WITH city_daily_avg AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        AVG(o.temperature_2m_c) AS avg_temp_c
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
        avg_temp_c,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY avg_temp_c ASC, city_name
        ) AS cold_rank
    FROM city_daily_avg
)
SELECT
    local_date,
    cold_rank,
    state_id,
    state_name,
    city_id,
    city_name,
    ROUND(avg_temp_c, 2) AS avg_temp_c
FROM ranked
WHERE cold_rank <= 10
ORDER BY local_date, cold_rank;
`

export type DailyDaytimeNighttimeTemperatureExtreme = {
  local_date: string
  extreme_type: "warmest_daytime" | "coldest_nighttime"
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  temperature_c: number
}
/**
 * Query for #10:
 *
 * > Over the stored historical period, which capital city had the warmest average daytime temperature and which had the coldest average nighttime temperature?
 *
 * The stored historical period is 1 day avgs over a 7 day span
 */
export const daily_daytime_nighttime_temperature_extremes =
  sql`
WITH city_temp_periods AS (
    SELECT
        DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
        s.state_id,
        s.state_name,
        c.city_id,
        c.city_name,
        AVG(
            CASE
                WHEN HOUR(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) BETWEEN 6 AND 17
                THEN o.temperature_2m_c
            END
        ) AS avg_daytime_temp_c,
        AVG(
            CASE
                WHEN HOUR(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) NOT BETWEEN 6 AND 17
                THEN o.temperature_2m_c
            END
        ) AS avg_nighttime_temp_c
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
        avg_daytime_temp_c,
        avg_nighttime_temp_c,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY avg_daytime_temp_c DESC, city_name
        ) AS daytime_rank,
        ROW_NUMBER() OVER (
            PARTITION BY local_date
            ORDER BY avg_nighttime_temp_c ASC, city_name
        ) AS nighttime_rank
    FROM city_temp_periods
)
SELECT
    local_date,
    'warmest_daytime' AS extreme_type,
    state_id,
    state_name,
    city_id,
    city_name,
    ROUND(avg_daytime_temp_c, 2) AS temperature_c
FROM ranked
WHERE daytime_rank = 1

UNION ALL

SELECT
    local_date,
    'coldest_nighttime' AS extreme_type,
    state_id,
    state_name,
    city_id,
    city_name,
    ROUND(avg_nighttime_temp_c, 2) AS temperature_c
FROM ranked
WHERE nighttime_rank = 1

ORDER BY
    local_date,
    extreme_type;
`
