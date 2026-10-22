# AeroStream: Data Contracts & Schema Specifications

This specification defines the canonical schemas, validation boundaries, and storage structures used across all services within the **AeroStream** platform.

---

## 🛰️ 1. Drone Telemetry Canonical Packet (`DroneTelemetry`)

Defined in `@aerostream/shared-types` and enforced at runtime via **Zod**:

```typescript
interface DroneTelemetry {
  droneId: string;             // Unique identifier, 3-64 alphanumeric chars (e.g., 'DRONE-ALPHA-01')
  missionId?: string;          // Optional UUID v4 corresponding to flight assignment
  timestamp: string;           // ISO 8601 UTC timestamp (e.g., '2026-10-22T14:30:00.000Z')
  status: DroneStatus;         // Current operational state
  location: Location;          // 3D positioning metrics
  velocity: Velocity;          // Kinematic motion vectors
  battery: BatteryMetrics;     // Power subsystem metrics
  sensors: SensorDiagnostics;  // Navigational & sensor reliability
  activeAlerts: string[];      // Array of active domain alerts
}
```

### Detailed Field Specifications

| Sub-Object | Field | Type | Range / Format | Unit / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`location`** | `latitude` | `number` | `[-90, 90]` | Decimal degrees (WGS84) |
| | `longitude` | `number` | `[-180, 180]` | Decimal degrees (WGS84) |
| | `altitudeMeters` | `number` | `[-100, 10000]` | Height above ground level (AGL) |
| **`velocity`** | `speedKmh` | `number` | `[0, 300]` | Ground speed in kilometers per hour |
| | `headingDegrees` | `number` | `[0, 360]` | Direction of flight ($0^\circ = \text{North}$) |
| **`battery`** | `percentage` | `number` | `[0, 100]` | State of charge (SoC) % |
| | `voltage` | `number` | `[0, 60]` | Pack voltage in Volts (V) |
| | `temperatureCelsius` | `number` | `[-40, 90]` | Battery cell temperature ($^\circ\text{C}$) |
| **`sensors`** | `satelliteCount` | `integer` | `[0, 64]` | Number of locked GNSS satellites |
| | `gpsFix` | `enum` | `'NO_FIX', '2D', '3D', 'RTK'` | Fix quality level |
| | `imuHealth` | `boolean` | `true \| false` | Inertial Measurement Unit integrity |
| | `signalQualityPercentage` | `number` | `[0, 100]` | Radio link telemetry quality |

---

## ⚠️ 2. Automated Safety & Anomaly Rules

When telemetry is ingested, the rule engine evaluates the following constraints:

| Rule Name | Trigger Condition | Severity | Action Triggered |
| :--- | :--- | :--- | :--- |
| `LOW_SATELLITE_COUNT` | `sensors.satelliteCount < 20` | `WARNING` | Flagged in `activeAlerts`, logged in `telemetry_alerts` |
| `CRITICAL_BATTERY_LEVEL`| `battery.percentage < 20` | `CRITICAL` | Status transitions to `RETURNING_TO_BASE` |
| `EMERGENCY_BATTERY` | `battery.percentage < 15` | `EMERGENCY` | Status transitions to `EMERGENCY_LANDING` |
| `BATTERY_OVERHEATING` | `battery.temperatureCelsius > 60` | `WARNING` | Flagged in `activeAlerts` |
| `IMU_MALFUNCTION` | `sensors.imuHealth === false` | `CRITICAL` | Alert triggered, navigation failsafe recommended |

---

## 🗄️ 3. TimescaleDB Time-Series Schema

The `drone_telemetry` hypertable is partitioned along the `time` dimension in 1-day intervals:

```sql
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

-- Hypertable creation
SELECT create_hypertable('drone_telemetry', 'time', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

-- Composite index
CREATE INDEX idx_telemetry_drone_time ON drone_telemetry (drone_id, time DESC);
```

---

## ⚡ 4. Redis Key Naming Convention

| Key Pattern | Data Structure | Purpose | TTL |
| :--- | :--- | :--- | :--- |
| `telemetry:stream` | Stream | Ingestion buffer for asynchronous worker decoupling | Capped (`MAXLEN ~ 100000`) |
| `drone:<id>:state` | Hash | Latest attributes of a single drone for $\mathcal{O}(1)$ lookup | 3600 seconds (1 hour) |
| `fleet:geopos` | Geospatial | Longitude/latitude index for `GEOSEARCH` radius filtering | Persistent |
| `fleet:active_drones`| Set | Set of drone IDs currently in active flight | Persistent |
