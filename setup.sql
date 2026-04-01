CREATE TABLE IF NOT EXISTS state (
    state_id INT AUTO_INCREMENT PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    state_code CHAR(2) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS county (
    county_id INT AUTO_INCREMENT PRIMARY KEY,
    county_name VARCHAR(100) NOT NULL,
    state_id INT NOT NULL,
    FOREIGN KEY (state_id) REFERENCES state(state_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS weather_station (
    station_id INT AUTO_INCREMENT PRIMARY KEY,
    station_code VARCHAR(30) NOT NULL UNIQUE,
    station_name VARCHAR(150) NOT NULL,
    latitude DECIMAL(8,5) NOT NULL,
    longitude DECIMAL(8,5) NOT NULL,
    elevation DECIMAL(8,2),
    county_id INT NOT NULL,
    FOREIGN KEY (county_id) REFERENCES county(county_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS weather_condition (
    condition_id INT AUTO_INCREMENT PRIMARY KEY,
    condition_name VARCHAR(100) NOT NULL,
    condition_category VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS observation (
    observation_id INT AUTO_INCREMENT PRIMARY KEY,
    observation_time TIMESTAMP NOT NULL,
    temperature DECIMAL(5,2),
    precipitation DECIMAL(6,2) DEFAULT 0.00,
    wind_speed DECIMAL(6,2),
    humidity DECIMAL(5,2),
    pressure DECIMAL(7,2),
    uv_index DECIMAL(4,2),
    station_id INT NOT NULL,
    condition_id INT NOT NULL,
    UNIQUE (station_id, observation_time),
    FOREIGN KEY (station_id) REFERENCES weather_station(station_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (condition_id) REFERENCES weather_condition(condition_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_type (
    alert_type_id INT AUTO_INCREMENT PRIMARY KEY,
    alert_name VARCHAR(150) NOT NULL,
    severity_level VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS alert (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    alert_title VARCHAR(200) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    description TEXT,
    station_id INT NOT NULL,
    alert_type_id INT NOT NULL,
    FOREIGN KEY (station_id) REFERENCES weather_station(station_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (alert_type_id) REFERENCES alert_type(alert_type_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);
