import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import {
  register,
  telemetryIngestedCounter,
  telemetryAlertsCounter,
} from "./metrics.service.js";

describe("Prometheus Metrics & Observability Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /metrics should return 200 with Prometheus text exposition format", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/metrics",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");

    const body = response.payload;
    // System metrics
    expect(body).toContain("aerostream_process_cpu_user_seconds_total");
    // Custom domain metrics
    expect(body).toContain("aerostream_telemetry_ingested_total");
    expect(body).toContain("aerostream_telemetry_batch_size");
    expect(body).toContain("aerostream_telemetry_ingestion_duration_seconds");
    expect(body).toContain("aerostream_redis_stream_publish_duration_seconds");
    expect(body).toContain("aerostream_db_insert_duration_seconds");
    expect(body).toContain("aerostream_active_sse_connections");
    expect(body).toContain("aerostream_http_requests_total");
  });

  it("should increment telemetry ingested counter and domain alert counters", async () => {
    // Increment domain counters
    telemetryIngestedCounter.inc({ type: "single", status: "success" }, 5);
    telemetryAlertsCounter.inc({ alert_type: "CRITICAL_BATTERY_LEVEL" });

    const updatedMetrics = await register.metrics();
    expect(updatedMetrics).toContain(
      'aerostream_telemetry_ingested_total{type="single",status="success"} 5',
    );
    expect(updatedMetrics).toContain(
      'aerostream_telemetry_alerts_total{alert_type="CRITICAL_BATTERY_LEVEL"} 1',
    );
  });

  it("should track HTTP request duration and count when endpoints are called", async () => {
    // Calling /health should increment http request counter
    await app.inject({
      method: "GET",
      url: "/health",
    });

    const metrics = await register.metrics();
    expect(metrics).toContain(
      'aerostream_http_requests_total{method="GET",route="/health"',
    );
  });
});
