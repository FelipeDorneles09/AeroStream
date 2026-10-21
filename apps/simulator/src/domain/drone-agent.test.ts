import { describe, it, expect } from 'vitest';
import { DroneAgent } from './drone-agent.js';

describe('DroneAgent', () => {
  it('should initialize with valid flight coordinates and parameters', () => {
    const drone = new DroneAgent({
      droneId: 'TEST-DRONE-01',
      initialLat: -23.55052,
      initialLon: -46.633308,
      baseAltitude: 100.0,
      targetSpeedKmh: 40.0
    });

    const telemetry = drone.tick(0);
    expect(telemetry.droneId).toBe('TEST-DRONE-01');
    expect(telemetry.location.latitude).toBeCloseTo(-23.55052, 4);
    expect(telemetry.location.longitude).toBeCloseTo(-46.633308, 4);
    expect(telemetry.location.altitudeMeters).toBeGreaterThanOrEqual(95);
    expect(telemetry.velocity.speedKmh).toBe(40.0);
  });

  it('should advance position and consume battery over time', () => {
    const drone = new DroneAgent({
      droneId: 'TEST-DRONE-02',
      initialLat: -23.55052,
      initialLon: -46.633308,
      baseAltitude: 100.0,
      targetSpeedKmh: 50.0
    });

    const first = drone.tick(1);
    const second = drone.tick(10);

    expect(second.battery.percentage).toBeLessThan(first.battery.percentage);
    // Position should have changed
    expect(second.location.latitude !== first.location.latitude || second.location.longitude !== first.location.longitude).toBe(true);
  });

  it('should inject satellite degradation when forceAnomaly is set', () => {
    const drone = new DroneAgent({
      droneId: 'TEST-DRONE-03',
      initialLat: -23.55052,
      initialLon: -46.633308,
      baseAltitude: 100.0
    });

    const telemetry = drone.tick(1, true); // forceAnomaly = true
    expect(telemetry.sensors.satelliteCount).toBeLessThan(20);
  });
});
