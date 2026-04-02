INSERT INTO State (state_id, state_name, state_code)
VALUES ($1, $2, $3);

INSERT INTO Weather_Station (station_id, station_code, station_name, latitude, longitude, elevation, county_id)
VALUES ($1, $2, $3, $4, $5, $6, $7);

INSERT INTO Weather_Condition (condition_id, condition_name, condition_category)
VALUES ($1, $2, $3);

INSERT INTO Observation (observation_id, observation_time, temperature, precipitation, wind_speed, humidity, pressure, uv_index, station_id, condition_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);

INSERT INTO Alert_Type (alert_type_id, alert_name, severity_level)
VALUES ($1, $2, $3);

INSERT INTO Alert (alert_id, alert_title, start_time, end_time, description, station_id, alert_type_id)
VALUES ($1, $2, $3, $4, $5, $6, $7);
