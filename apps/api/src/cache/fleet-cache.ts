import { Redis } from 'ioredis';
import { redisClient } from '../queue/redis-stream.js';

export class FleetCacheService {
  constructor(private readonly redis: Redis = redisClient) {}

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
