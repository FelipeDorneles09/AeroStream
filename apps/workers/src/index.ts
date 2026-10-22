import { Redis } from 'ioredis';
import { config } from './config/env.js';
import { StreamConsumer } from './consumer/stream-consumer.js';
import { FleetCacheService } from './cache/fleet-cache.js';
import { DroneTelemetry } from '@aerostream/shared-types';

async function bootstrap() {
  console.log('🛰️  Starting AeroStream Telemetry Background Worker...');

  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null
  });

  const fleetCache = new FleetCacheService(redis);

  const consumer = new StreamConsumer({
    redisClient: redis,
    streamKey: 'telemetry:stream',
    groupName: 'telemetry-processors',
    batchSize: 20,
    blockTimeoutMs: 2000
  });

  let processedCount = 0;

  // Graceful shutdown handling
  const shutdown = async () => {
    consumer.stop();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await consumer.start(async (telemetry: DroneTelemetry, msgId: string) => {
    // 1. Update hot state cache and geospatial index
    await fleetCache.updateDroneHotState(telemetry);

    processedCount++;
    if (processedCount % 10 === 0 || (telemetry.activeAlerts && telemetry.activeAlerts.length > 0)) {
      console.log(
        `⚡ [Worker] Event ${msgId} processed: ${telemetry.droneId} | Alt: ${telemetry.location.altitudeMeters}m | Battery: ${telemetry.battery.percentage}% | Alerts: ${telemetry.activeAlerts.length}`
      );
    }
  });
}

bootstrap().catch((err) => {
  console.error('[Worker Fatal Error]:', err);
  process.exit(1);
});
