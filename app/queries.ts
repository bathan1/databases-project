import { sql } from "kysely"

export type DailyCityAverageTemperature = {
  local_date: string
  state_id: number
  state_name: string
  city_id: number
  city_name: string
  avg_temp_c: number
}

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
