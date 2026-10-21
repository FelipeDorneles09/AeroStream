import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TelemetryService } from '../services/telemetry.service.js';
import { ZodError } from 'zod';

export async function telemetryRoutes(fastify: FastifyInstance) {
  const telemetryService = new TelemetryService();

  // POST /api/v1/telemetry
  fastify.post('/api/v1/telemetry', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await telemetryService.processTelemetry(request.body);
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid drone telemetry schema',
          issues: err.errors
        });
      }
      request.log.error(err, 'Failed to process telemetry point');
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Database persistence error'
      });
    }
  });

  // POST /api/v1/telemetry/batch
  fastify.post('/api/v1/telemetry/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await telemetryService.processBatch(request.body);
      return reply.status(202).send(result);
    } catch (err) {
      if (err instanceof ZodError) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid batch telemetry payload',
          issues: err.errors
        });
      }
      request.log.error(err, 'Failed to process batch telemetry');
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Batch persistence error'
      });
    }
  });

  // GET /api/v1/telemetry/:droneId/latest
  fastify.get('/api/v1/telemetry/:droneId/latest', async (request: FastifyRequest<{ Params: { droneId: string } }>, reply: FastifyReply) => {
    const { droneId } = request.params;
    const latest = await telemetryService.getLatestTelemetry(droneId);
    if (!latest) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `No telemetry found for drone ${droneId}`
      });
    }
    return reply.status(200).send(latest);
  });

  // GET /api/v1/telemetry/:droneId/history
  fastify.get('/api/v1/telemetry/:droneId/history', async (request: FastifyRequest<{ Params: { droneId: string }; Querystring: { limit?: string } }>, reply: FastifyReply) => {
    const { droneId } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
    const history = await telemetryService.getFlightHistory(droneId, limit);
    return reply.status(200).send({
      droneId,
      count: history.length,
      history
    });
  });
}
