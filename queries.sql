-- (1) Which states had the highest and lowest average temperatures on the most recent stored day?

WITH latest_day AS (
    SELECT DATE(MAX(timestamp)) AS latest_date
    FROM observations
),
state_daily_avg AS (
    SELECT
        s.state_id,
        s.state_name,
        AVG(o.temperature_2m_c) AS avg_temp_c
    FROM observations o
    JOIN cities c
        ON o.city_id = c.city_id
    JOIN states s
        ON c.state_id = s.state_id
    JOIN latest_day ld
        ON DATE(o.timestamp) = ld.latest_date
    GROUP BY s.state_id, s.state_name
)
(
    SELECT
        'highest' AS extreme_type,
        state_name,
        ROUND(avg_temp_c, 2) AS avg_temp_c
    FROM state_daily_avg
    ORDER BY avg_temp_c DESC
    LIMIT 1
)
UNION ALL
(
    SELECT
        'lowest' AS extreme_type,
        state_name,
        ROUND(avg_temp_c, 2) AS avg_temp_c
    FROM state_daily_avg
    ORDER BY avg_temp_c ASC
    LIMIT 1
);

-- (2) At the most recent stored observation time, which state capitals were in the top 10 for temperature?

SELECT
    s.state_name,
    c.city_name,
    o.timestamp,
    o.temperature_2m_c
FROM observations o
JOIN cities c
    ON o.city_id = c.city_id
JOIN states s
    ON c.state_id = s.state_id
WHERE o.timestamp = (
    SELECT MAX(timestamp)
    FROM observations
)
ORDER BY o.temperature_2m_c DESC, c.city_name
LIMIT 10;

-- (3) At the most recent stored observation time, which state capitals were in the bottom 10 for temperature?

SELECT
    s.state_name,
    c.city_name,
    o.timestamp,
    o.temperature_2m_c
FROM observations o
JOIN cities c
    ON o.city_id = c.city_id
JOIN states s
    ON c.state_id = s.state_id
WHERE o.timestamp = (
    SELECT MAX(timestamp)
    FROM observations
)
ORDER BY o.temperature_2m_c ASC, c.city_name
LIMIT 10;

-- (4) For each state, what was the maximum wind speed recorded at its capital city over the stored time window, and when did it occur?

WITH ranked_wind AS (
    SELECT
        s.state_name,
        c.city_name,
        o.timestamp,
        o.windspeed_10m_kmh,
        ROW_NUMBER() OVER (
            PARTITION BY s.state_id
            ORDER BY o.windspeed_10m_kmh DESC, o.timestamp ASC
        ) AS rn
    FROM observations o
    JOIN cities c
        ON o.city_id = c.city_id
    JOIN states s
        ON c.state_id = s.state_id
)
SELECT
    state_name,
    city_name,
    timestamp,
    windspeed_10m_kmh AS max_windspeed_10m_kmh
FROM ranked_wind
WHERE rn = 1
ORDER BY max_windspeed_10m_kmh DESC, state_name;

-- (5) Which state capitals had the highest total precipitation over the stored historical window?

SELECT
    s.state_name,
    c.city_name,
    ROUND(SUM(o.precipitation_mm), 2) AS total_precipitation_mm
FROM observations o
JOIN cities c
    ON o.city_id = c.city_id
JOIN states s
    ON c.state_id = s.state_id
GROUP BY s.state_id, s.state_name, c.city_id, c.city_name
ORDER BY total_precipitation_mm DESC, c.city_name
LIMIT 10;

-- (6) Which state capitals had zero precipitation for the greatest number of stored observation hours?

SELECT
    s.state_name,
    c.city_name,
    COUNT(*) AS zero_precip_hours
FROM observations o
JOIN cities c
    ON o.city_id = c.city_id
JOIN states s
    ON c.state_id = s.state_id
WHERE o.precipitation_mm = 0
GROUP BY s.state_id, s.state_name, c.city_id, c.city_name
ORDER BY zero_precip_hours DESC, c.city_name
LIMIT 10;

-- (7) What was the average humidity by state for each stored local day in the time window?

SELECT
    s.state_name,
    DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp)) AS local_date,
    ROUND(AVG(o.relative_humidity_2m_pct), 2) AS avg_relative_humidity_pct
FROM observations o
JOIN cities c
    ON o.city_id = c.city_id
JOIN states s
    ON c.state_id = s.state_id
GROUP BY
    s.state_id,
    s.state_name,
    DATE(TIMESTAMPADD(SECOND, c.utc_offset_seconds, o.timestamp))
ORDER BY local_date, s.state_name;

-- (8) Which state capitals had the greatest number of severe weather alerts during the stored alert window?

SELECT
    s.state_name,
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
GROUP BY s.state_id, s.state_name, c.city_id, c.city_name
ORDER BY severe_alert_count DESC, c.city_name
LIMIT 10;

-- (9) What alert type was most common in each state over the stored alert window?

WITH alert_counts AS (
    SELECT
        s.state_name,
        at.alert_name,
        COUNT(*) AS alert_count
    FROM alerts a
    JOIN alert_types at
        ON a.alert_type_id = at.alert_type_id
    JOIN cities c
        ON a.city_id = c.city_id
    JOIN states s
        ON c.state_id = s.state_id
    GROUP BY s.state_id, s.state_name, at.alert_type_id, at.alert_name
),
ranked_alerts AS (
    SELECT
        state_name,
        alert_name,
        alert_count,
        ROW_NUMBER() OVER (
            PARTITION BY state_name
            ORDER BY alert_count DESC, alert_name
        ) AS rn
    FROM alert_counts
)
SELECT
    state_name,
    alert_name AS most_common_alert_type,
    alert_count
FROM ranked_alerts
WHERE rn = 1
ORDER BY state_name;

-- (10) Over the stored historical period, which capital city had the warmest average daytime temperature and which had the coldest average nighttime temperature?

WITH city_temp_periods AS (
    SELECT
        s.state_name,
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
    GROUP BY s.state_id, s.state_name, c.city_id, c.city_name
)
(
    SELECT
        'warmest_daytime' AS extreme_type,
        state_name,
        city_name,
        ROUND(avg_daytime_temp_c, 2) AS temperature_c
    FROM city_temp_periods
    ORDER BY avg_daytime_temp_c DESC
    LIMIT 1
)
UNION ALL
(
    SELECT
        'coldest_nighttime' AS extreme_type,
        state_name,
        city_name,
        ROUND(avg_nighttime_temp_c, 2) AS temperature_c
    FROM city_temp_periods
    ORDER BY avg_nighttime_temp_c ASC
    LIMIT 1
);

-- (11) Over the stored historical period, which capital cities recorded the highest average and maximum wind speeds?

SELECT
    s.state_name,
    c.city_name,
    ROUND(AVG(o.windspeed_10m_kmh), 2) AS avg_windspeed_10m_kmh,
    MAX(o.windspeed_10m_kmh) AS max_windspeed_10m_kmh
FROM observations o
JOIN cities c
    ON o.city_id = c.city_id
JOIN states s
    ON c.state_id = s.state_id
GROUP BY s.state_id, s.state_name, c.city_id, c.city_name
ORDER BY avg_windspeed_10m_kmh DESC, max_windspeed_10m_kmh DESC
LIMIT 10;

-- (12) At the most recent stored timestamp, how many severe alerts were active across all monitored capital cities?

WITH latest_ts AS (
    SELECT MAX(timestamp) AS ts
    FROM observations
)
SELECT
    lt.ts AS latest_observation_timestamp,
    COUNT(*) AS active_severe_alerts,
    COUNT(DISTINCT a.city_id) AS capitals_with_active_severe_alerts
FROM latest_ts lt
JOIN alerts a
    ON a.start_time <= lt.ts
   AND (a.end_time IS NULL OR a.end_time >= lt.ts)
JOIN alert_types at
    ON a.alert_type_id = at.alert_type_id
WHERE at.severity_level IN ('high', 'extreme');

-- (13) At the most recent stored timestamp, was Annapolis experiencing rainfall, and how did its precipitation compare with the 5 nearest monitored capital cities?

WITH latest_ts AS (
    SELECT MAX(timestamp) AS ts
    FROM observations
),
annapolis AS (
    SELECT
        city_id,
        city_name,
        lat,
        lon
    FROM cities
    WHERE city_name = 'Annapolis'
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
)
SELECT
    result_group,
    city_name,
    state_name,
    precipitation_mm,
    CASE
        WHEN precipitation_mm > 0 THEN 'Yes'
        ELSE 'No'
    END AS experiencing_rainfall
FROM (
    SELECT
        'Annapolis' AS result_group,
        c.city_name,
        s.state_name,
        o.precipitation_mm,
        0 AS sort_order
    FROM observations o
    JOIN cities c
        ON o.city_id = c.city_id
    JOIN states s
        ON c.state_id = s.state_id
    JOIN latest_ts lt
        ON o.timestamp = lt.ts
    WHERE c.city_name = 'Annapolis'

    UNION ALL

    SELECT
        'Nearby capital' AS result_group,
        nc.city_name,
        nc.state_name,
        o.precipitation_mm,
        1 AS sort_order
    FROM nearby_cities nc
    JOIN observations o
        ON o.city_id = nc.city_id
    JOIN latest_ts lt
        ON o.timestamp = lt.ts
) x
ORDER BY sort_order, precipitation_mm DESC, city_name;

-- (14) Which capital cities had temperatures above their own stored-window average at the same time that humidity was below their own stored-window average?

WITH city_avgs AS (
    SELECT
        city_id,
        AVG(temperature_2m_c) AS avg_temp_c,
        AVG(relative_humidity_2m_pct) AS avg_humidity_pct
    FROM observations
    GROUP BY city_id
)
SELECT
    s.state_name,
    c.city_name,
    COUNT(*) AS matching_hours,
    ROUND(
        100.0 * COUNT(*) / (
            SELECT COUNT(*)
            FROM observations o2
            WHERE o2.city_id = c.city_id
        ),
        2
    ) AS pct_of_stored_hours
FROM observations o
JOIN city_avgs ca
    ON o.city_id = ca.city_id
JOIN cities c
    ON o.city_id = c.city_id
JOIN states s
    ON c.state_id = s.state_id
WHERE o.temperature_2m_c > ca.avg_temp_c
  AND o.relative_humidity_2m_pct < ca.avg_humidity_pct
GROUP BY s.state_id, s.state_name, c.city_id, c.city_name
ORDER BY matching_hours DESC, pct_of_stored_hours DESC, c.city_name
LIMIT 10;

-- (15) For each capital city, what percentage of stored observation hours had an active alert, and which capitals had the highest percentages?

SELECT
    s.state_name,
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
    ) AS observation_hours_with_active_alert,
    ROUND(
        100.0 * SUM(
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
        ) / COUNT(*),
        2
    ) AS pct_observation_hours_with_active_alert
FROM observations o
JOIN cities c
    ON o.city_id = c.city_id
JOIN states s
    ON c.state_id = s.state_id
GROUP BY s.state_id, s.state_name, c.city_id, c.city_name
ORDER BY pct_observation_hours_with_active_alert DESC, observation_hours_with_active_alert DESC, c.city_name;