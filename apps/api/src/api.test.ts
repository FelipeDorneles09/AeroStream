import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "./app.js";
import { dbPool } from "./db/timescale.js";
import { redisClient, TELEMETRY_STREAM_KEY } from "./queue/redis-stream.js";
import { FastifyInstance } from "fastify";

describe("AeroStream Ingestion API Integration Tests", () => {
  let app: FastifyInstance;
  let isServicesAvailable = false;

  beforeAll(async () => {
    try {
      const client = await dbPool.connect();
      client.release();
      await redisClient.ping();
      isServicesAvailable = true;
    } catch {
      console.warn(
        "⚠️ TimescaleDB/Redis not accessible. Tests requiring live database/stream will be skipped in this environment.",
      );
    }

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    if (isServicesAvailable) {
      await dbPool.end();
      await redisClient.quit();
    }
  });

  it.runIf(isServicesAvailable)(
    "GET /health should return 200 and healthy database and redis connectivity",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe("UP");
      expect(body.checks.database).toBe("HEALTHY");
      expect(body.checks.redis).toBe("HEALTHY");
    },
  );

  it.runIf(isServicesAvailable)(
    "POST /api/v1/telemetry should ingest valid telemetry and persist to TimescaleDB",
    async () => {
      const payload = {
        droneId: "DRONE-ALPHA-01",
        timestamp: new Date().toISOString(),
        status: "IN_FLIGHT",
        location: {
          latitude: -23.55052,
          longitude: -46.633308,
          altitudeMeters: 125.0,
        },
        velocity: {
          speedKmh: 45.0,
          headingDegrees: 180.0,
        },
        battery: {
          percentage: 88.0,
          voltage: 23.1,
          temperatureCelsius: 31.5,
        },
        sensors: {
          satelliteCount: 25,
          gpsFix: "3D",
          imuHealth: true,
          signalQualityPercentage: 95,
        },
        activeAlerts: [],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/telemetry",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.droneId).toBe("DRONE-ALPHA-01");
      expect(body.streamId).toBeDefined();
      expect(body.streamId).toMatch(/^\d+-\d+$/);

      // Verify Redis Stream holds the published event (exact lookup by ID)
      const streamEntries = await redisClient.xrange(
        TELEMETRY_STREAM_KEY,
        body.streamId,
        body.streamId,
      );
      expect(streamEntries.length).toBe(1);
      expect(streamEntries[0][0]).toBe(body.streamId);
    },
  );

  it("POST /api/v1/telemetry should return 400 when schema validation fails", async () => {
    const invalidPayload = {
      droneId: "DRONE-INVALID",
      // Missing location, velocity, battery, etc.
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/telemetry",
      payload: invalidPayload,
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe("Bad Request");
    expect(body.message).toBe("Invalid drone telemetry schema");
  });

  it.runIf(isServicesAvailable)(
    "POST /api/v1/telemetry should trigger LOW_SATELLITE_COUNT alert when satellites < 20",
    async () => {
      const payload = {
        droneId: "DRONE-ALPHA-01",
        timestamp: new Date().toISOString(),
        status: "IN_FLIGHT",
        location: {
          latitude: -23.551,
          longitude: -46.634,
          altitudeMeters: 110.0,
        },
        velocity: {
          speedKmh: 30.0,
          headingDegrees: 90.0,
        },
        battery: {
          percentage: 75.0,
          voltage: 22.5,
          temperatureCelsius: 34.0,
        },
        sensors: {
          satelliteCount: 14, // < 20 triggers rule
          gpsFix: "2D",
          imuHealth: true,
          signalQualityPercentage: 60,
        },
        activeAlerts: [],
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/telemetry",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.activeAlerts).toContain("LOW_SATELLITE_COUNT");
    },
  );

  it.runIf(isServicesAvailable)(
    "GET /api/v1/telemetry/:droneId/latest should return most recent state",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/telemetry/DRONE-ALPHA-01/latest",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.drone_id).toBe("DRONE-ALPHA-01");
      expect(body.satellite_count).toBeDefined();
    },
  );

  it.runIf(isServicesAvailable)(
    "GET /api/v1/telemetry/:droneId/history should return trajectory records",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/telemetry/DRONE-ALPHA-01/history?limit=10",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.droneId).toBe("DRONE-ALPHA-01");
      expect(body.count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(body.history)).toBe(true);
    },
  );

  it.runIf(isServicesAvailable)(
    "GET /api/v1/fleet/live should return live fleet array from cache",
    async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/fleet/live",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.totalActive).toBeDefined();
      expect(Array.isArray(body.drones)).toBe(true);
    },
  );
});
