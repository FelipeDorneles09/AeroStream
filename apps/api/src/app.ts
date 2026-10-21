import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { healthRoutes } from './routes/health.routes.js';
import { telemetryRoutes } from './routes/telemetry.routes.js';
import { config } from './config/env.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.env === 'development' ? { target: 'pino-pretty' } : undefined
    }
  });

  // Security: CORS
  await app.register(cors, {
    origin: true
  });

  // Resilience & Rate Limiting: 500 requests per minute per IP
  await app.register(rateLimit, {
    max: 500,
    timeWindow: '1 minute'
  });

  // Documentation: Swagger / OpenAPI specification
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'AeroStream Telemetry Ingestion API',
        description: 'High-throughput event-driven API for autonomous drone fleet telemetry',
        version: '0.1.0'
      },
      servers: [
        { url: '/', description: 'Current Host' },
        { url: `http://localhost:${config.port}`, description: 'Localhost' }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  });

  // Register Routes
  await app.register(healthRoutes);
  await app.register(telemetryRoutes);

  return app;
}
