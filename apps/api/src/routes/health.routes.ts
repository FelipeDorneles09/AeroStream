import { FastifyInstance } from 'fastify';
import { checkDatabaseConnection } from '../db/timescale.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    const isDbConnected = await checkDatabaseConnection();
    const status = isDbConnected ? 'UP' : 'DEGRADED';
    const statusCode = isDbConnected ? 200 : 503;

    return reply.status(statusCode).send({
      status,
      timestamp: new Date().toISOString(),
      service: 'aerostream-ingestion-api',
      checks: {
        database: isDbConnected ? 'HEALTHY' : 'UNREACHABLE'
      }
    });
  });
}
