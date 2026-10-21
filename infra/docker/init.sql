-- ==============================================================================
-- AeroStream: Database Initialization & Time-Series Hypertables
-- ==============================================================================

-- 1. Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 2. Metadata: Drone Fleet Registry
CREATE TABLE IF NOT EXISTS drones (
    id VARCHAR(64) PRIMARY KEY,
    model VARCHAR(64) NOT NULL,
    max_payload_kg NUMERIC(5, 2) DEFAULT 5.0,
    firmware_version VARCHAR(32) DEFAULT 'v2.4.0',
    status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial test drones
INSERT INTO drones (id, model, max_payload_kg, firmware_version, status)
VALUES 
    ('DRONE-ALPHA-01', 'AeroHex-Pro', 8.5, 'v3.1.0', 'IN_FLIGHT'),
    ('DRONE-ALPHA-02', 'AeroHex-Pro', 8.5, 'v3.1.0', 'IN_FLIGHT'),
    ('DRONE-BETA-01',  'SkyScout-VTOL', 4.0, 'v2.9.4', 'IN_FLIGHT'),
    ('DRONE-BETA-02',  'SkyScout-VTOL', 4.0, 'v2.9.4', 'IN_FLIGHT'),
    ('DRONE-GAMMA-01', 'HeavyLift-X8', 15.0, 'v4.0.1', 'IN_FLIGHT')
ON CONFLICT (id) DO NOTHING;

-- 3. Time-Series Telemetry Table
CREATE TABLE IF NOT EXISTS drone_telemetry (
    time TIMESTAMPTZ NOT NULL,
    drone_id VARCHAR(64) NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude_meters DOUBLE PRECISION NOT NULL,
    speed_kmh DOUBLE PRECISION NOT NULL,
    heading_degrees DOUBLE PRECISION NOT NULL,
    battery_percentage DOUBLE PRECISION NOT NULL,
    battery_voltage DOUBLE PRECISION NOT NULL,
    battery_temperature DOUBLE PRECISION NOT NULL,
    satellite_count INT NOT NULL,
    gps_fix VARCHAR(16) NOT NULL,
    imu_health BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(32) NOT NULL,
    active_alerts TEXT[] DEFAULT '{}'
);

-- 4. Convert table into a TimescaleDB Hypertable partitioned by time
SELECT create_hypertable(
    'drone_telemetry', 
    'time', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- 5. Optimized composite index for rapid drone-specific time-range filtering
CREATE INDEX IF NOT EXISTS idx_telemetry_drone_time 
ON drone_telemetry (drone_id, time DESC);

-- 6. Alerts & Incidents Table
CREATE TABLE IF NOT EXISTS telemetry_alerts (
    id BIGSERIAL PRIMARY KEY,
    drone_id VARCHAR(64) NOT NULL REFERENCES drones(id),
    rule_name VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL, -- WARNING, CRITICAL, EMERGENCY
    message TEXT NOT NULL,
    telemetry_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_drone_time 
ON telemetry_alerts (drone_id, created_at DESC);
