import { 
  DroneTelemetry, 
  DroneTelemetrySchema, 
  BatchTelemetry, 
  BatchTelemetrySchema, 
  IngestionResponse 
} from '@aerostream/shared-types';
import { TelemetryRepository } from '../repositories/telemetry.repository.js';

export class TelemetryService {
  constructor(private readonly repository = new TelemetryRepository()) {}

  /**
   * Validates and evaluates domain safety rules on telemetry
   */
  evaluateSafetyRules(record: DroneTelemetry): string[] {
    const alerts: string[] = [...(record.activeAlerts || [])];

    // Domain rule: GPS satellite count threshold
    if (record.sensors.satelliteCount < 20 && !alerts.includes('LOW_SATELLITE_COUNT')) {
      alerts.push('LOW_SATELLITE_COUNT');
    }

    // Domain rule: Battery critical threshold
    if (record.battery.percentage < 20 && !alerts.includes('CRITICAL_BATTERY_LEVEL')) {
      alerts.push('CRITICAL_BATTERY_LEVEL');
    }

    // Domain rule: Thermal warning
    if (record.battery.temperatureCelsius > 60 && !alerts.includes('BATTERY_OVERHEATING')) {
      alerts.push('BATTERY_OVERHEATING');
    }

    // Domain rule: IMU Sensor failure
    if (!record.sensors.imuHealth && !alerts.includes('IMU_MALFUNCTION')) {
      alerts.push('IMU_MALFUNCTION');
    }

    return alerts;
  }

  /**
   * Process a single incoming telemetry event
   */
  async processTelemetry(payload: unknown): Promise<{ success: boolean; data: DroneTelemetry }> {
    const parsed = DroneTelemetrySchema.parse(payload);
    const enrichedRecord: DroneTelemetry = {
      ...parsed,
      activeAlerts: this.evaluateSafetyRules(parsed)
    };

    await this.repository.insertTelemetry(enrichedRecord);
    return { success: true, data: enrichedRecord };
  }

  /**
   * Process a batch of telemetry packets
   */
  async processBatch(payload: unknown): Promise<IngestionResponse> {
    const parsed: BatchTelemetry = BatchTelemetrySchema.parse(payload);
    
    const enrichedRecords = parsed.records.map((record: DroneTelemetry) => ({
      ...record,
      activeAlerts: this.evaluateSafetyRules(record)
    }));

    const insertedCount = await this.repository.insertBatch(enrichedRecords);

    return {
      success: true,
      ingestedCount: insertedCount,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves latest drone state
   */
  async getLatestTelemetry(droneId: string) {
    return this.repository.getLatestByDroneId(droneId);
  }

  /**
   * Retrieves flight trajectory history
   */
  async getFlightHistory(droneId: string, limit = 100) {
    return this.repository.getHistoryByDroneId(droneId, limit);
  }
}
