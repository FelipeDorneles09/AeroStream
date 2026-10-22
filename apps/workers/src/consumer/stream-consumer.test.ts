import { describe, it, expect, vi } from 'vitest';
import { StreamConsumer } from './stream-consumer.js';

describe('StreamConsumer', () => {
  it('should initialize with provided and default configuration', () => {
    const mockRedis: any = {
      xgroup: vi.fn(),
      xreadgroup: vi.fn(),
      xack: vi.fn()
    };

    const consumer = new StreamConsumer({
      redisClient: mockRedis,
      streamKey: 'custom:stream',
      groupName: 'custom-group',
      batchSize: 25
    });

    expect(consumer.streamKey).toBe('custom:stream');
    expect(consumer.groupName).toBe('custom-group');
  });

  it('should ignore BUSYGROUP error gracefully when group already exists', async () => {
    const mockRedis: any = {
      xgroup: vi.fn().mockRejectedValue(new Error('BUSYGROUP Consumer Group name already exists'))
    };

    const consumer = new StreamConsumer({ redisClient: mockRedis });
    await expect(consumer.setupGroup()).resolves.toBeUndefined();
  });

  it('should read stream entries, parse payload and acknowledge with xack', async () => {
    const mockTelemetry = {
      droneId: 'DRONE-TEST-01',
      timestamp: new Date().toISOString(),
      status: 'IN_FLIGHT',
      location: { latitude: 0, longitude: 0, altitudeMeters: 50 },
      velocity: { speedKmh: 20, headingDegrees: 90 },
      battery: { percentage: 90, voltage: 24, temperatureCelsius: 30 },
      sensors: { satelliteCount: 22, gpsFix: '3D', imuHealth: true, signalQualityPercentage: 90 },
      activeAlerts: []
    };

    const mockRedis: any = {
      xgroup: vi.fn().mockResolvedValue('OK'),
      xreadgroup: vi.fn().mockResolvedValue([
        [
          'telemetry:stream',
          [
            ['1730000000000-0', ['payload', JSON.stringify(mockTelemetry)]]
          ]
        ]
      ]),
      xack: vi.fn().mockResolvedValue(1)
    };

    const consumer = new StreamConsumer({ redisClient: mockRedis });
    const handler = vi.fn().mockResolvedValue(undefined);

    const processed = await consumer.pollBatch(handler);

    expect(processed).toBe(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ droneId: 'DRONE-TEST-01' }), '1730000000000-0');
    expect(mockRedis.xack).toHaveBeenCalledWith('telemetry:stream', 'telemetry-processors', '1730000000000-0');
  });
});
