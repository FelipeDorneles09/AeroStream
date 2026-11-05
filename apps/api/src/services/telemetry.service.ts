import {
  DroneTelemetry,
  DroneTelemetrySchema,
  BatchTelemetry,
  BatchTelemetrySchema,
  IngestionResponse,
} from "@aerostream/shared-types";
import { TelemetryRepository } from "../repositories/telemetry.repository.js";
import {
  publishToStream,
  publishBatchToStream,
} from "../queue/redis-stream.js";
import { telemetryBroadcaster } from "../sse/broadcaster.js";
import {
  telemetryIngestedCounter,
  telemetryBatchSizeHistogram,
  telemetryIngestionDurationHistogram,
  redisStreamPublishDurationHistogram,
  dbInsertDurationHistogram,
  telemetryAlertsCounter,
} from "../metrics/metrics.service.js";

export class TelemetryService {
  constructor(private readonly repository = new TelemetryRepository()) {}

  /**
   * Validates and evaluates domain safety rules on telemetry
   */
  evaluateSafetyRules(record: DroneTelemetry): string[] {
    const alerts: string[] = [...(record.activeAlerts || [])];

    // Domain rule: GPS satellite count threshold
    if (
      record.sensors.satelliteCount < 20 &&
      !alerts.includes("LOW_SATELLITE_COUNT")
    ) {
      alerts.push("LOW_SATELLITE_COUNT");
    }

    // Domain rule: Battery critical threshold
    if (
      record.battery.percentage < 20 &&
      !alerts.includes("CRITICAL_BATTERY_LEVEL")
    ) {
      alerts.push("CRITICAL_BATTERY_LEVEL");
    }

    // Domain rule: Thermal warning
    if (
      record.battery.temperatureCelsius > 60 &&
      !alerts.includes("BATTERY_OVERHEATING")
    ) {
      alerts.push("BATTERY_OVERHEATING");
    }

    // Domain rule: IMU Sensor failure
    if (!record.sensors.imuHealth && !alerts.includes("IMU_MALFUNCTION")) {
      alerts.push("IMU_MALFUNCTION");
    }

    return alerts;
  }

  /**
   * Process a single incoming telemetry event and buffers it to Redis Stream
   */
  async processTelemetry(
    payload: unknown,
  ): Promise<{ success: boolean; data: DroneTelemetry; streamId?: string }> {
    const stopIngestionTimer = telemetryIngestionDurationHistogram.startTimer({
      endpoint: "single",
    });

    try {
      const parsed = DroneTelemetrySchema.parse(payload);
      const alerts = this.evaluateSafetyRules(parsed);
      const enrichedRecord: DroneTelemetry = {
        ...parsed,
        activeAlerts: alerts,
      };

      // Record any active alerts in Prometheus
      for (const alert of alerts) {
        telemetryAlertsCounter.inc({ alert_type: alert });
      }

      // 1. Buffer to Redis Stream for real-time decoupling
      let streamId: string | undefined;
      const stopRedisTimer = redisStreamPublishDurationHistogram.startTimer();
      try {
        streamId = await publishToStream(enrichedRecord);
      } catch (streamErr) {
        console.warn(
          "[TelemetryService] Failed to publish to Redis Stream, fallback to DB only:",
          streamErr,
        );
      } finally {
        stopRedisTimer();
      }

      // 2. Persist to TimescaleDB
      const stopDbTimer = dbInsertDurationHistogram.startTimer({
        operation: "insert_single",
      });
      try {
        await this.repository.insertTelemetry(enrichedRecord);
      } finally {
        stopDbTimer();
      }

      // 3. Push real-time SSE update to connected web dashboards
      telemetryBroadcaster.broadcastTelemetry(enrichedRecord);

      telemetryIngestedCounter.inc({ type: "single", status: "success" });
      stopIngestionTimer({ status: "success" });

      return { success: true, data: enrichedRecord, streamId };
    } catch (err) {
      telemetryIngestedCounter.inc({ type: "single", status: "error" });
      stopIngestionTimer({ status: "error" });
      throw err;
    }
  }

  /**
   * Process a batch of telemetry packets and buffers them to Redis Stream
   */
  async processBatch(
    payload: unknown,
  ): Promise<IngestionResponse & { bufferedToStream: boolean }> {
    const stopBatchTimer = telemetryIngestionDurationHistogram.startTimer({
      endpoint: "batch",
    });

    try {
      const parsed: BatchTelemetry = BatchTelemetrySchema.parse(payload);
      telemetryBatchSizeHistogram.observe(parsed.records.length);

      const enrichedRecords = parsed.records.map((record: DroneTelemetry) => {
        const alerts = this.evaluateSafetyRules(record);
        for (const alert of alerts) {
          telemetryAlertsCounter.inc({ alert_type: alert });
        }
        return {
          ...record,
          activeAlerts: alerts,
        };
      });

      // Buffer batch to Redis Stream
      let bufferedToStream = false;
      const stopRedisTimer = redisStreamPublishDurationHistogram.startTimer();
      try {
        await publishBatchToStream(enrichedRecords);
        bufferedToStream = true;
      } catch (streamErr) {
        console.warn(
          "[TelemetryService] Failed to pipeline batch to Redis Stream:",
          streamErr,
        );
      } finally {
        stopRedisTimer();
      }

      const stopDbTimer = dbInsertDurationHistogram.startTimer({
        operation: "insert_batch",
      });
      let insertedCount = 0;
      try {
        insertedCount = await this.repository.insertBatch(enrichedRecords);
      } finally {
        stopDbTimer();
      }

      telemetryIngestedCounter.inc(
        { type: "batch", status: "success" },
        insertedCount,
      );
      stopBatchTimer({ status: "success" });

      return {
        success: true,
        ingestedCount: insertedCount,
        processedAt: new Date().toISOString(),
        bufferedToStream,
      };
    } catch (err) {
      telemetryIngestedCounter.inc({ type: "batch", status: "error" });
      stopBatchTimer({ status: "error" });
      throw err;
    }
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
