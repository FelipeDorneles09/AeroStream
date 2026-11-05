import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { healthRoutes } from "./routes/health.routes.js";
import { telemetryRoutes } from "./routes/telemetry.routes.js";
import { metricsRoutes } from "./routes/metrics.routes.js";
import {
  httpRequestCounter,
  httpRequestDurationHistogram,
} from "./metrics/metrics.service.js";
import { config } from "./config/env.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.env === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  // Security: CORS
  await app.register(cors, {
    origin: true,
  });

  // Observability: HTTP Request Latency & Throughput Instrumentation
  app.addHook("onRequest", (request, _reply, done) => {
    (request as unknown as { startTime: [number, number] }).startTime =
      process.hrtime();
    done();
  });

  app.addHook("onResponse", (request, reply, done) => {
    const startTime = (request as unknown as { startTime?: [number, number] })
      .startTime;
    if (startTime) {
      const diff = process.hrtime(startTime);
      const durationSeconds = diff[0] + diff[1] / 1e9;
      const route = request.routeOptions?.url || request.url || "unknown";
      const method = request.method;
      const statusCode = String(reply.statusCode);

      httpRequestCounter.inc({ method, route, status_code: statusCode });
      httpRequestDurationHistogram.observe(
        { method, route, status_code: statusCode },
        durationSeconds,
      );
    }
    done();
  });

  // Resilience & Rate Limiting
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: "1 minute",
    allowList: (req) => req.url === "/metrics" || req.url === "/health",
  });

  // Documentation: Swagger / OpenAPI specification
  await app.register(swagger, {
    openapi: {
      info: {
        title: "AeroStream Telemetry Ingestion API",
        description:
          "High-throughput event-driven API for autonomous drone fleet telemetry",
        version: "0.1.0",
      },
      servers: [
        { url: "/", description: "Current Host" },
        { url: `http://localhost:${config.port}`, description: "Localhost" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  // Register Routes
  await app.register(healthRoutes);
  await app.register(telemetryRoutes);
  await app.register(metricsRoutes);

  return app;
}
