import { sql } from "kysely";

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
`;
