import { FastifyInstance } from 'fastify';
import { checkDatabaseConnection } from '../db/timescale.js';
import { checkRedisConnection } from '../queue/redis-stream.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    const isDbConnected = await checkDatabaseConnection();
    const isRedisConnected = await checkRedisConnection();
    const isHealthy = isDbConnected && isRedisConnected;
    const status = isHealthy ? 'UP' : 'DEGRADED';
    const statusCode = isHealthy ? 200 : 503;

    return reply.status(statusCode).send({
      status,
      timestamp: new Date().toISOString(),
      service: 'aerostream-ingestion-api',
      checks: {
        database: isDbConnected ? 'HEALTHY' : 'UNREACHABLE',
        redis: isRedisConnected ? 'HEALTHY' : 'UNREACHABLE'
      }
    });
  });
}
