import { z } from 'zod';

/**
 * GPS Fix Quality
 */
export const GpsFixTypeSchema = z.enum(['NO_FIX', '2D', '3D', 'RTK']);
export type GpsFixType = z.infer<typeof GpsFixTypeSchema>;

/**
 * Operational Status of an autonomous drone
 */
export const DroneStatusSchema = z.enum([
  'IDLE',
  'PREFLIGHT',
  'IN_FLIGHT',
  'RETURNING_TO_BASE',
  'LANDED',
  'EMERGENCY_LANDING'
]);
export type DroneStatus = z.infer<typeof DroneStatusSchema>;

/**
 * Real-time Location Metrics
 */
export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitudeMeters: z.number().min(-100).max(10000)
});
export type Location = z.infer<typeof LocationSchema>;

/**
 * Kinematic Velocity Metrics
 */
export const VelocitySchema = z.object({
  speedKmh: z.number().min(0).max(300),
  headingDegrees: z.number().min(0).max(360)
});
export type Velocity = z.infer<typeof VelocitySchema>;

/**
 * Battery Health & Consumption
 */
export const BatteryMetricsSchema = z.object({
  percentage: z.number().min(0).max(100),
  voltage: z.number().min(0).max(60),
  temperatureCelsius: z.number().min(-40).max(90)
});
export type BatteryMetrics = z.infer<typeof BatteryMetricsSchema>;

/**
 * Sensor Diagnostics & Navigation Reliability
 */
export const SensorDiagnosticsSchema = z.object({
  satelliteCount: z.number().int().min(0).max(64),
  gpsFix: GpsFixTypeSchema,
  imuHealth: z.boolean(),
  signalQualityPercentage: z.number().min(0).max(100)
});
export type SensorDiagnostics = z.infer<typeof SensorDiagnosticsSchema>;

/**
 * Canonical Drone Telemetry Packet Schema
 */
export const DroneTelemetrySchema = z.object({
  droneId: z.string().min(3).max(64),
  missionId: z.string().uuid().optional(),
  timestamp: z.string().datetime({ message: 'Must be a valid ISO 8601 UTC timestamp' }),
  status: DroneStatusSchema,
  location: LocationSchema,
  velocity: VelocitySchema,
  battery: BatteryMetricsSchema,
  sensors: SensorDiagnosticsSchema,
  activeAlerts: z.array(z.string()).default([])
});
export type DroneTelemetry = z.infer<typeof DroneTelemetrySchema>;

/**
 * Batch Telemetry Ingestion Payload Schema
 */
export const BatchTelemetrySchema = z.object({
  batchId: z.string().uuid().optional(),
  sentAt: z.string().datetime(),
  records: z.array(DroneTelemetrySchema).min(1).max(500)
});
export type BatchTelemetry = z.infer<typeof BatchTelemetrySchema>;

/**
 * Ingestion Response Contract
 */
export interface IngestionResponse {
  success: boolean;
  ingestedCount: number;
  processedAt: string;
  errors?: Array<{ index: number; message: string }>;
}
