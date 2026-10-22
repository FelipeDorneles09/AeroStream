import { Redis } from 'ioredis';
import { DroneTelemetry } from '@aerostream/shared-types';

export interface StreamConsumerOptions {
  redisClient: Redis;
  streamKey?: string;
  groupName?: string;
  consumerName?: string;
  batchSize?: number;
  blockTimeoutMs?: number;
}

export class StreamConsumer {
  private redis: Redis;
  public readonly streamKey: string;
  public readonly groupName: string;
  public readonly consumerName: string;
  private batchSize: number;
  private blockTimeoutMs: number;
  private isRunning = false;

  constructor(options: StreamConsumerOptions) {
    this.redis = options.redisClient;
    this.streamKey = options.streamKey || 'telemetry:stream';
    this.groupName = options.groupName || 'telemetry-processors';
    this.consumerName = options.consumerName || `worker-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
    this.batchSize = options.batchSize || 50;
    this.blockTimeoutMs = options.blockTimeoutMs || 2000;
  }

  /**
   * Initializes the Consumer Group on Redis Streams
   */
  async setupGroup(): Promise<void> {
    try {
      // Create group starting at newest ($) or beginning (0)
      await this.redis.xgroup('CREATE', this.streamKey, this.groupName, '$', 'MKSTREAM');
      console.log(`[StreamConsumer] Created Consumer Group "${this.groupName}" on stream "${this.streamKey}"`);
    } catch (err: any) {
      if (err.message.includes('BUSYGROUP')) {
        // Group already exists, which is normal across restarts
        return;
      }
      throw err;
    }
  }

  /**
   * Reads and processes one batch from the consumer group
   */
  async pollBatch(
    handler: (telemetry: DroneTelemetry, msgId: string) => Promise<void>
  ): Promise<number> {
    // XREADGROUP GROUP group consumer [COUNT count] [BLOCK milliseconds] STREAMS key >
    const response = await this.redis.xreadgroup(
      'GROUP',
      this.groupName,
      this.consumerName,
      'COUNT',
      this.batchSize,
      'BLOCK',
      this.blockTimeoutMs,
      'STREAMS',
      this.streamKey,
      '>'
    );

    if (!response || response.length === 0) {
      return 0;
    }

    const [_streamKey, entries] = response[0] as [string, [string, string[]][]];
    let processedCount = 0;

    for (const [msgId, fields] of entries) {
      try {
        let payloadStr = '';
        for (let i = 0; i < fields.length; i += 2) {
          if (fields[i] === 'payload') {
            payloadStr = fields[i + 1];
            break;
          }
        }

        if (payloadStr) {
          const telemetry: DroneTelemetry = JSON.parse(payloadStr);
          await handler(telemetry, msgId);
        }

        // Acknowledge processed message in the stream group
        await this.redis.xack(this.streamKey, this.groupName, msgId);
        processedCount++;
      } catch (err: any) {
        console.error(`[StreamConsumer] Error processing message ${msgId}:`, err.message);
      }
    }

    return processedCount;
  }

  /**
   * Starts continuous worker polling loop
   */
  async start(handler: (telemetry: DroneTelemetry, msgId: string) => Promise<void>): Promise<void> {
    await this.setupGroup();
    this.isRunning = true;
    console.log(`🚀 [StreamConsumer] Worker "${this.consumerName}" listening for stream events...`);

    while (this.isRunning) {
      try {
        await this.pollBatch(handler);
      } catch (err: any) {
        if (!this.isRunning) break;
        console.error('[StreamConsumer] Loop polling error:', err.message);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  /**
   * Stops the consumer loop gracefully
   */
  stop(): void {
    this.isRunning = false;
    console.log(`🛑 [StreamConsumer] Worker "${this.consumerName}" stopping...`);
  }
}
