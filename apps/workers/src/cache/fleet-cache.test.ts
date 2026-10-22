import { describe, it, expect, vi } from 'vitest';
import { FleetCacheService } from './fleet-cache.js';

describe('FleetCacheService', () => {
  it('should pipeline hset, expire, geoadd and sadd on telemetry update', async () => {
    const mockPipeline: any = {
      hset: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      geoadd: vi.fn().mockReturnThis(),
      sadd: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([[null, 'OK'], [null, 1], [null, 1], [null, 1]])
    };

    const mockRedis: any = {
      pipeline: vi.fn().mockReturnValue(mockPipeline)
    };

    const service = new FleetCacheService(mockRedis);

    const telemetry: any = {
      droneId: 'DRONE-CACHE-01',
      status: 'IN_FLIGHT',
      timestamp: new Date().toISOString(),
      location: { latitude: -23.55, longitude: -46.63, altitudeMeters: 120 },
      velocity: { speedKmh: 45, headingDegrees: 180 },
      battery: { percentage: 85, voltage: 23, temperatureCelsius: 32 },
      sensors: { satelliteCount: 25, gpsFix: '3D', imuHealth: true },
      activeAlerts: ['LOW_SATELLITE_COUNT']
    };

    await service.updateDroneHotState(telemetry);

    expect(mockRedis.pipeline).toHaveBeenCalled();
    expect(mockPipeline.hset).toHaveBeenCalledWith(
      'drone:DRONE-CACHE-01:state',
      expect.objectContaining({
        droneId: 'DRONE-CACHE-01',
        status: 'IN_FLIGHT',
        latitude: '-23.55',
        longitude: '-46.63'
      })
    );
    expect(mockPipeline.expire).toHaveBeenCalledWith('drone:DRONE-CACHE-01:state', 3600);
    expect(mockPipeline.geoadd).toHaveBeenCalledWith('fleet:geopos', -46.63, -23.55, 'DRONE-CACHE-01');
    expect(mockPipeline.sadd).toHaveBeenCalledWith('fleet:active_drones', 'DRONE-CACHE-01');
    expect(mockPipeline.exec).toHaveBeenCalled();
  });

  it('should find nearby drones with geosearch', async () => {
    const mockRedis: any = {
      geosearch: vi.fn().mockResolvedValue(['DRONE-01', 'DRONE-02'])
    };

    const service = new FleetCacheService(mockRedis);
    const nearby = await service.findNearbyDrones(-23.55, -46.63, 10);

    expect(nearby).toEqual(['DRONE-01', 'DRONE-02']);
    expect(mockRedis.geosearch).toHaveBeenCalledWith(
      'fleet:geopos',
      'FROMLONLAT',
      -46.63,
      -23.55,
      'BYRADIUS',
      10,
      'km'
    );
  });
});
