import { Redis } from 'ioredis';
import { redisClient } from '../queue/redis-stream.js';
import { DroneTelemetry } from '@aerostream/shared-types';

export class FleetCacheService {
  constructor(private readonly redis: Redis = redisClient) {}

  /**
   * Retrieves live state for all active drones in the fleet
   */
  async getAllActiveDrones(): Promise<Array<DroneTelemetry>> {
    const droneIds = await this.redis.smembers('fleet:active_drones');
    if (droneIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const id of droneIds) {
      pipeline.hgetall(`drone:${id}:state`);
    }

    const results = await pipeline.exec();
    const fleet: Array<DroneTelemetry> = [];

    if (results) {
      for (const [err, state] of results) {
        if (!err && state && Object.keys(state as object).length > 0) {
          const s = state as Record<string, string>;
          fleet.push({
            droneId: s.droneId,
            timestamp: s.lastSeenAt || new Date().toISOString(),
            status: (s.status as any) || 'IDLE',
            location: {
              latitude: parseFloat(s.latitude || '0'),
              longitude: parseFloat(s.longitude || '0'),
              altitudeMeters: parseFloat(s.altitudeMeters || '0'),
            },
            velocity: {
              speedKmh: parseFloat(s.speedKmh || '0'),
              headingDegrees: parseFloat(s.headingDegrees || '0'),
            },
            battery: {
              percentage: parseFloat(s.batteryPercentage || '100'),
              voltage: parseFloat(s.batteryVoltage || '24'),
              temperatureCelsius: parseFloat(s.batteryTemperature || '25'),
            },
            sensors: {
              satelliteCount: parseInt(s.satelliteCount || '0', 10),
              gpsFix: (s.gpsFix as any) || '3D',
              imuHealth: s.imuHealth === 'true',
              signalQualityPercentage: 98,
            },
            activeAlerts: s.activeAlerts ? JSON.parse(s.activeAlerts) : [],
          });
        }
      }
    }

    return fleet;
  }

  /**
   * Finds drones within radiusKm from a given GPS coordinate using Redis Geospatial search
   */
  async findNearbyDrones(latitude: number, longitude: number, radiusKm: number): Promise<string[]> {
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
