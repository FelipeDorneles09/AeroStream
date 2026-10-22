import { Redis } from 'ioredis';
import { config } from '../config/env.js';
import { DroneTelemetry } from '@aerostream/shared-types';

export const TELEMETRY_STREAM_KEY = 'telemetry:stream';
const STREAM_MAX_LEN = 100000; // Capped stream memory boundary (approximate trimming)

export const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  lazyConnect: false,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 2000);
    return delay;
  }
});

redisClient.on('error', (err) => {
  console.error('[Redis Client Error]:', err.message);
});

/**
 * Checks connectivity to the Redis instance
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const ping = await redisClient.ping();
    return ping === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Publishes a single telemetry packet to the Redis Stream
 * @returns The unique Redis Stream entry ID (e.g., '1730000000000-0')
 */
export async function publishToStream(record: DroneTelemetry): Promise<string> {
  const streamId = await redisClient.xadd(
    TELEMETRY_STREAM_KEY,
    'MAXLEN',
    '~',
    STREAM_MAX_LEN,
    '*',
    'droneId',
    record.droneId,
    'timestamp',
    record.timestamp,
    'status',
    record.status,
    'payload',
    JSON.stringify(record)
  );

  return streamId as string;
}

/**
 * Publishes multiple telemetry packets in a single pipelined round-trip
 */
export async function publishBatchToStream(records: DroneTelemetry[]): Promise<string[]> {
  if (records.length === 0) return [];

  const pipeline = redisClient.pipeline();

  for (const record of records) {
    pipeline.xadd(
      TELEMETRY_STREAM_KEY,
      'MAXLEN',
      '~',
      STREAM_MAX_LEN,
      '*',
      'droneId',
      record.droneId,
      'timestamp',
      record.timestamp,
      'status',
      record.status,
      'payload',
      JSON.stringify(record)
    );
  }

  const results = await pipeline.exec();
  const streamIds: string[] = [];

  if (results) {
    for (const [err, res] of results) {
      if (!err && typeof res === 'string') {
        streamIds.push(res);
      }
    }
  }

  return streamIds;
}
