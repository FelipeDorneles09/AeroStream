import { 
  DroneTelemetry, 
  DroneTelemetrySchema, 
  BatchTelemetry, 
  BatchTelemetrySchema, 
  IngestionResponse 
} from '@aerostream/shared-types';
import { TelemetryRepository } from '../repositories/telemetry.repository.js';
import { publishToStream, publishBatchToStream } from '../queue/redis-stream.js';
import { telemetryBroadcaster } from '../sse/broadcaster.js';

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
   * Process a single incoming telemetry event and buffers it to Redis Stream
   */
  async processTelemetry(payload: unknown): Promise<{ success: boolean; data: DroneTelemetry; streamId?: string }> {
    const parsed = DroneTelemetrySchema.parse(payload);
    const enrichedRecord: DroneTelemetry = {
      ...parsed,
      activeAlerts: this.evaluateSafetyRules(parsed)
    };

    // 1. Buffer to Redis Stream for real-time decoupling
    let streamId: string | undefined;
    try {
      streamId = await publishToStream(enrichedRecord);
    } catch (streamErr) {
      console.warn('[TelemetryService] Failed to publish to Redis Stream, fallback to DB only:', streamErr);
    }

    // 2. Persist to TimescaleDB
    await this.repository.insertTelemetry(enrichedRecord);

    // 3. Push real-time SSE update to connected web dashboards
    telemetryBroadcaster.broadcastTelemetry(enrichedRecord);

    return { success: true, data: enrichedRecord, streamId };
  }

  /**
   * Process a batch of telemetry packets and buffers them to Redis Stream
   */
  async processBatch(payload: unknown): Promise<IngestionResponse & { bufferedToStream: boolean }> {
    const parsed: BatchTelemetry = BatchTelemetrySchema.parse(payload);
    
    const enrichedRecords = parsed.records.map((record: DroneTelemetry) => ({
      ...record,
      activeAlerts: this.evaluateSafetyRules(record)
    }));

    // Buffer batch to Redis Stream
    let bufferedToStream = false;
    try {
      await publishBatchToStream(enrichedRecords);
      bufferedToStream = true;
    } catch (streamErr) {
      console.warn('[TelemetryService] Failed to pipeline batch to Redis Stream:', streamErr);
    }

    const insertedCount = await this.repository.insertBatch(enrichedRecords);

    return {
      success: true,
      ingestedCount: insertedCount,
      processedAt: new Date().toISOString(),
      bufferedToStream
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
