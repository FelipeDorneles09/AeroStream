import { describe, it, expect } from 'vitest';
import { DroneTelemetrySchema, BatchTelemetrySchema } from './index.js';

describe('DroneTelemetrySchema', () => {
  const validPacket = {
    droneId: 'DRONE-ALPHA-01',
    timestamp: new Date().toISOString(),
    status: 'IN_FLIGHT',
    location: {
      latitude: -23.55052,
      longitude: -46.633308,
      altitudeMeters: 120.5
    },
    velocity: {
      speedKmh: 42.8,
      headingDegrees: 185.2
    },
    battery: {
      percentage: 84.5,
      voltage: 22.8,
      temperatureCelsius: 32.1
    },
    sensors: {
      satelliteCount: 24,
      gpsFix: '3D',
      imuHealth: true,
      signalQualityPercentage: 98
    },
    activeAlerts: []
  };

  it('should validate a compliant drone telemetry packet', () => {
    const result = DroneTelemetrySchema.safeParse(validPacket);
    expect(result.success).toBe(true);
  });

  it('should reject invalid coordinates', () => {
    const invalidPacket = {
      ...validPacket,
      location: { ...validPacket.location, latitude: 150 } // > 90
    };
    const result = DroneTelemetrySchema.safeParse(invalidPacket);
    expect(result.success).toBe(false);
  });

  it('should reject negative satellite count or out of bounds battery', () => {
    const invalidPacket = {
      ...validPacket,
      battery: { ...validPacket.battery, percentage: 110 }
    };
    const result = DroneTelemetrySchema.safeParse(invalidPacket);
    expect(result.success).toBe(false);
  });

  it('should validate batch ingestion arrays', () => {
    const batch = {
      sentAt: new Date().toISOString(),
      records: [validPacket]
    };
    const result = BatchTelemetrySchema.safeParse(batch);
    expect(result.success).toBe(true);
  });
});
