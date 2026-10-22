import { Redis } from 'ioredis';
import { DroneTelemetry } from '@aerostream/shared-types';

export class FleetCacheService {
  constructor(private readonly redis: Redis) {}

  /**
   * Updates Redis hot state cache, geospatial index, and active fleet set
   */
  async updateDroneHotState(telemetry: DroneTelemetry): Promise<void> {
    const pipeline = this.redis.pipeline();
    const stateKey = `drone:${telemetry.droneId}:state`;

    // 1. Update Hash state for immediate O(1) attribute lookup
    pipeline.hset(stateKey, {
      droneId: telemetry.droneId,
      status: telemetry.status,
      latitude: telemetry.location.latitude.toString(),
      longitude: telemetry.location.longitude.toString(),
      altitudeMeters: telemetry.location.altitudeMeters.toString(),
      speedKmh: telemetry.velocity.speedKmh.toString(),
      headingDegrees: telemetry.velocity.headingDegrees.toString(),
      batteryPercentage: telemetry.battery.percentage.toString(),
      batteryVoltage: telemetry.battery.voltage.toString(),
      batteryTemperature: telemetry.battery.temperatureCelsius.toString(),
      satelliteCount: telemetry.sensors.satelliteCount.toString(),
      gpsFix: telemetry.sensors.gpsFix,
      imuHealth: telemetry.sensors.imuHealth.toString(),
      activeAlerts: JSON.stringify(telemetry.activeAlerts || []),
      lastSeenAt: telemetry.timestamp
    });

    // 2. Set TTL on state key (1 hour of inactivity marks stale)
    pipeline.expire(stateKey, 3600);

    // 3. Update Geospatial Index (GEOADD key longitude latitude member)
    pipeline.geoadd(
      'fleet:geopos',
      telemetry.location.longitude,
      telemetry.location.latitude,
      telemetry.droneId
    );

    // 4. Add to active drones set
    pipeline.sadd('fleet:active_drones', telemetry.droneId);

    await pipeline.exec();
  }

  /**
   * Retrieves the live cached state for a single drone
   */
  async getDroneHotState(droneId: string): Promise<Record<string, string> | null> {
    const data = await this.redis.hgetall(`drone:${droneId}:state`);
    if (!data || Object.keys(data).length === 0) return null;
    return data;
  }

  /**
   * Retrieves live state for all active drones in the fleet
   */
  async getAllActiveDrones(): Promise<Array<Record<string, string>>> {
    const droneIds = await this.redis.smembers('fleet:active_drones');
    if (droneIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const id of droneIds) {
      pipeline.hgetall(`drone:${id}:state`);
    }

    const results = await pipeline.exec();
    const fleet: Array<Record<string, string>> = [];

    if (results) {
      for (const [err, state] of results) {
        if (!err && state && Object.keys(state as object).length > 0) {
          fleet.push(state as Record<string, string>);
        }
      }
    }

    return fleet;
  }

  /**
   * Finds drones within radiusKm from a given GPS coordinate using Redis Geospatial search
   */
  async findNearbyDrones(latitude: number, longitude: number, radiusKm: number): Promise<string[]> {
    // GEOSEARCH key FROMLONLAT longitude latitude BYRADIUS radius km
    const results = await this.redis.geosearch(
      'fleet:geopos',
      'FROMLONLAT',
      longitude,
      latitude,
      'BYRADIUS',
      radiusKm,
      'km'
    );
    return (results as string[]) || [];
  }
}
