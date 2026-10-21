import { DroneTelemetry, DroneStatus } from '@aerostream/shared-types';

export interface DroneAgentOptions {
  droneId: string;
  initialLat: number;
  initialLon: number;
  baseAltitude: number;
  targetSpeedKmh?: number;
}

export class DroneAgent {
  public readonly droneId: string;
  private lat: number;
  private lon: number;
  private altitude: number;
  private speedKmh: number;
  private heading: number;
  private batteryPct: number;
  private batteryTemp: number;
  private status: DroneStatus = 'IN_FLIGHT';

  constructor(options: DroneAgentOptions) {
    this.droneId = options.droneId;
    this.lat = options.initialLat;
    this.lon = options.initialLon;
    this.altitude = options.baseAltitude;
    this.speedKmh = options.targetSpeedKmh || (35 + Math.random() * 20);
    this.heading = Math.random() * 360;
    this.batteryPct = 95 + Math.random() * 5;
    this.batteryTemp = 28 + Math.random() * 5;
  }

  /**
   * Advances simulation time by deltaSeconds (kinematics & battery decay)
   */
  public tick(deltaSeconds = 1, forceAnomaly = false): DroneTelemetry {
    // Kinematics: 1 degree latitude ~ 111,139 meters
    const speedMs = (this.speedKmh * 1000) / 3600;
    const distanceMeters = speedMs * deltaSeconds;

    const rad = (this.heading * Math.PI) / 180;
    const deltaLat = (distanceMeters * Math.cos(rad)) / 111139;
    const deltaLon = (distanceMeters * Math.sin(rad)) / (111139 * Math.cos((this.lat * Math.PI) / 180));

    this.lat += deltaLat;
    this.lon += deltaLon;

    // Small heading drift (-5 to +5 deg) to simulate natural wind / waypoint navigation
    this.heading = (this.heading + (Math.random() * 10 - 5) + 360) % 360;

    // Minor altitude fluctuation (+/- 0.5m)
    this.altitude = Math.max(10, this.altitude + (Math.random() * 1 - 0.5));

    // Battery consumption (~0.02% per second in flight)
    this.batteryPct = Math.max(0, this.batteryPct - (0.015 + (speedMs / 1000) * 0.05));
    if (this.batteryPct < 15) {
      this.status = 'EMERGENCY_LANDING';
    } else if (this.batteryPct < 25) {
      this.status = 'RETURNING_TO_BASE';
    }

    // Battery temperature dynamics
    this.batteryTemp = Math.min(65, this.batteryTemp + (speedMs > 12 ? 0.05 : -0.02));

    // Satellite count: normally 22-28, can dip below 20 if anomaly is triggered
    let satelliteCount = Math.floor(22 + Math.random() * 6);
    if (forceAnomaly) {
      satelliteCount = Math.floor(12 + Math.random() * 6); // < 20 triggers LOW_SATELLITE_COUNT alert
    }

    return {
      droneId: this.droneId,
      timestamp: new Date().toISOString(),
      status: this.status,
      location: {
        latitude: parseFloat(this.lat.toFixed(6)),
        longitude: parseFloat(this.lon.toFixed(6)),
        altitudeMeters: parseFloat(this.altitude.toFixed(2))
      },
      velocity: {
        speedKmh: parseFloat(this.speedKmh.toFixed(1)),
        headingDegrees: parseFloat(this.heading.toFixed(1))
      },
      battery: {
        percentage: parseFloat(this.batteryPct.toFixed(2)),
        voltage: parseFloat((21.0 + (this.batteryPct / 100) * 4.2).toFixed(2)),
        temperatureCelsius: parseFloat(this.batteryTemp.toFixed(1))
      },
      sensors: {
        satelliteCount,
        gpsFix: satelliteCount >= 18 ? '3D' : '2D',
        imuHealth: true,
        signalQualityPercentage: Math.min(100, Math.floor(satelliteCount * 3.8))
      },
      activeAlerts: []
    };
  }
}
