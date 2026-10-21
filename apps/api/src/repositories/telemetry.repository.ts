import { dbPool } from '../db/timescale.js';
import { DroneTelemetry } from '@aerostream/shared-types';

export class TelemetryRepository {
  /**
   * Persists a single telemetry record into TimescaleDB hypertable
   */
  async insertTelemetry(record: DroneTelemetry): Promise<void> {
    const query = `
      INSERT INTO drone_telemetry (
        time, drone_id, latitude, longitude, altitude_meters,
        speed_kmh, heading_degrees, battery_percentage, battery_voltage,
        battery_temperature, satellite_count, gps_fix, imu_health,
        status, active_alerts
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      );
    `;

    const values = [
      record.timestamp,
      record.droneId,
      record.location.latitude,
      record.location.longitude,
      record.location.altitudeMeters,
      record.velocity.speedKmh,
      record.velocity.headingDegrees,
      record.battery.percentage,
      record.battery.voltage,
      record.battery.temperatureCelsius,
      record.sensors.satelliteCount,
      record.sensors.gpsFix,
      record.sensors.imuHealth,
      record.status,
      record.activeAlerts
    ];

    await dbPool.query(query, values);
  }

  /**
   * High-throughput multi-row batch insert into TimescaleDB
   */
  async insertBatch(records: DroneTelemetry[]): Promise<number> {
    if (records.length === 0) return 0;

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      for (const record of records) {
        const query = `
          INSERT INTO drone_telemetry (
            time, drone_id, latitude, longitude, altitude_meters,
            speed_kmh, heading_degrees, battery_percentage, battery_voltage,
            battery_temperature, satellite_count, gps_fix, imu_health,
            status, active_alerts
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          );
        `;
        const values = [
          record.timestamp,
          record.droneId,
          record.location.latitude,
          record.location.longitude,
          record.location.altitudeMeters,
          record.velocity.speedKmh,
          record.velocity.headingDegrees,
          record.battery.percentage,
          record.battery.voltage,
          record.battery.temperatureCelsius,
          record.sensors.satelliteCount,
          record.sensors.gpsFix,
          record.sensors.imuHealth,
          record.status,
          record.activeAlerts
        ];
        await client.query(query, values);
      }

      await client.query('COMMIT');
      return records.length;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Fetches latest known telemetry record for a specific drone
   */
  async getLatestByDroneId(droneId: string): Promise<any | null> {
    const query = `
      SELECT * FROM drone_telemetry
      WHERE drone_id = $1
      ORDER BY time DESC
      LIMIT 1;
    `;
    const res = await dbPool.query(query, [droneId]);
    return res.rows[0] || null;
  }

  /**
   * Fetches historical time-series points for replay and analytics
   */
  async getHistoryByDroneId(droneId: string, limit = 100): Promise<any[]> {
    const query = `
      SELECT * FROM drone_telemetry
      WHERE drone_id = $1
      ORDER BY time DESC
      LIMIT $2;
    `;
    const res = await dbPool.query(query, [droneId, limit]);
    return res.rows;
  }
}
