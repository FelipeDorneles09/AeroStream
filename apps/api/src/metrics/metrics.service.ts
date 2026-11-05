import client from "prom-client";
import { telemetryBroadcaster } from "../sse/broadcaster.js";

export const register = new client.Registry();

// Enable default Node.js system and process metrics
client.collectDefaultMetrics({
  register,
  prefix: "aerostream_",
});

// Telemetry ingestion counter
export const telemetryIngestedCounter = new client.Counter({
  name: "aerostream_telemetry_ingested_total",
  help: "Total number of telemetry points received and processed",
  labelNames: ["type", "status"] as const,
  registers: [register],
});

// Batch ingestion size distribution
export const telemetryBatchSizeHistogram = new client.Histogram({
  name: "aerostream_telemetry_batch_size",
  help: "Distribution of batch sizes in batch telemetry ingestion",
  buckets: [1, 5, 10, 20, 50, 100, 250, 500],
  registers: [register],
});

// Ingestion end-to-end processing latency
export const telemetryIngestionDurationHistogram = new client.Histogram({
  name: "aerostream_telemetry_ingestion_duration_seconds",
  help: "Duration of telemetry ingestion processing in seconds",
  labelNames: ["endpoint", "status"] as const,
  buckets: [0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

// Redis Streams publication latency
export const redisStreamPublishDurationHistogram = new client.Histogram({
  name: "aerostream_redis_stream_publish_duration_seconds",
  help: "Latency of publishing telemetry events to Redis Streams in seconds",
  buckets: [0.001, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1],
  registers: [register],
});

// TimescaleDB insertion latency
export const dbInsertDurationHistogram = new client.Histogram({
  name: "aerostream_db_insert_duration_seconds",
  help: "Latency of writing telemetry records into TimescaleDB in seconds",
  labelNames: ["operation"] as const,
  buckets: [0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

// Active real-time SSE stream connections
export const activeSseConnectionsGauge = new client.Gauge({
  name: "aerostream_active_sse_connections",
  help: "Number of active Server-Sent Events subscriber connections",
  registers: [register],
  collect() {
    this.set(telemetryBroadcaster.clientCount);
  },
});

// Safety alerts triggered counter
export const telemetryAlertsCounter = new client.Counter({
  name: "aerostream_telemetry_alerts_total",
  help: "Total safety threshold alerts triggered by telemetry stream",
  labelNames: ["alert_type"] as const,
  registers: [register],
});

// HTTP Request latency and throughput
export const httpRequestCounter = new client.Counter({
  name: "aerostream_http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [register],
});

export const httpRequestDurationHistogram = new client.Histogram({
  name: "aerostream_http_request_duration_seconds",
  help: "HTTP request latency in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});
