CREATE TABLE IF NOT EXISTS weather_conditions (
    condition_id INT AUTO_INCREMENT PRIMARY KEY,
    condition_name VARCHAR(25) NOT NULL UNIQUE,
    category VARCHAR(25) NOT NULL
);

CREATE TABLE IF NOT EXISTS states (
    state_id INT AUTO_INCREMENT PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    code CHAR(2) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS cities (
    city_id INT AUTO_INCREMENT PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    state_id INT NOT NULL REFERENCES states (state_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
    lat DECIMAL NOT NULL,
    lon DECIMAL NOT NULL,
    utc_offset_seconds INT NOT NULL,

    CONSTRAINT unq_cities_state_city_name UNIQUE (state_id, city_name)
);

CREATE TABLE IF NOT EXISTS observations (
    observation_id INT AUTO_INCREMENT PRIMARY KEY,
    condition_id INT NOT NULL REFERENCES weather_conditions (condition_id),
    city_id INT NOT NULL REFERENCES cities (city_id),
    timestamp TIMESTAMP NOT NULL,
    elevation_m INT NOT NULL,
    temperature_2m_c DECIMAL NOT NULL,
    precipitation_mm INT NOT NULL,
    windspeed_10m_kmh DECIMAL NOT NULL,
    relative_humidity_2m_pct INT NOT NULL,
    pressure_msl_hpa DECIMAL NOT NULL,

    CONSTRAINT unq_observations_city_timestamp UNIQUE (city_id, timestamp)
);

CREATE TABLE IF NOT EXISTS alert_types (
    alert_type_id INT AUTO_INCREMENT PRIMARY KEY,
    alert_name VARCHAR(100) NOT NULL UNIQUE,
    severity_level ENUM('low', 'medium', 'high', 'extreme') NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    alert_title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    description TEXT,
    city_id INT NOT NULL REFERENCES cities (city_id),
    alert_type_id INT NOT NULL REFERENCES alert_types (alert_type_id),

    CONSTRAINT chk_alerts_interval CHECK (end_time IS NULL OR start_time <= end_time),
    CONSTRAINT unq_alert UNIQUE (city_id, start_time, alert_type_id)
);

-- static values

INSERT IGNORE INTO weather_conditions (condition_id, condition_name, category) VALUES
    (1, 'Clear', 'Clouds'),
    (2, 'Partly Cloudy', 'Clouds'),
    (3, 'Overcast', 'Clouds'),
    (4, 'Rain', 'Precipitation'),
    (5, 'Heavy Rain', 'Precipitation'),
    (6, 'Snow', 'Snow'),
    (7, 'Thunderstorm', 'Storm'),
    (8, 'Fog', 'Atmosphere'),
    (9, 'Haze', 'Atmosphere'),
    (10, 'Windy', 'Wind'),
    (11, 'Hot', 'Temperature'),
    (12, 'Cold', 'Temperature');

INSERT IGNORE INTO alert_types (alert_type_id, alert_name, severity_level) VALUES
    (1, 'Rain Advisory', 'low'),
    (2, 'Heavy Rain Warning', 'high'),
    (3, 'Snow Advisory', 'medium'),
    (4, 'Extreme Heat Warning', 'extreme'),
    (5, 'Heat Advisory', 'high'),
    (6, 'Cold Advisory', 'medium'),
    (7, 'High Wind Warning', 'high'),
    (8, 'Storm Warning', 'extreme'),
    (9, 'High Humidity Advisory', 'low'),
    (10, 'Low Pressure Warning', 'medium');
