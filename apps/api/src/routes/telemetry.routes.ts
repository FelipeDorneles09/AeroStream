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

  // GET /api/v1/fleet/live (Redis Hot State Cache)
  fastify.get('/api/v1/fleet/live', async (_request, reply: FastifyReply) => {
    const { FleetCacheService } = await import('../cache/fleet-cache.js');
    const fleetCache = new FleetCacheService();
    const liveFleet = await fleetCache.getAllActiveDrones();
    return reply.status(200).send({
      totalActive: liveFleet.length,
      timestamp: new Date().toISOString(),
      drones: liveFleet
    });
  });

  // GET /api/v1/fleet/nearby (Redis Geospatial Search)
  fastify.get('/api/v1/fleet/nearby', async (request: FastifyRequest<{ Querystring: { lat: string; lon: string; radiusKm?: string } }>, reply: FastifyReply) => {
    const { lat, lon, radiusKm } = request.query;
    if (!lat || !lon) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Query parameters "lat" and "lon" are required'
      });
    }

    const { FleetCacheService } = await import('../cache/fleet-cache.js');
    const fleetCache = new FleetCacheService();
    const nearbyDroneIds = await fleetCache.findNearbyDrones(
      parseFloat(lat),
      parseFloat(lon),
      radiusKm ? parseFloat(radiusKm) : 10
    );

    return reply.status(200).send({
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      radiusKm: radiusKm ? parseFloat(radiusKm) : 10,
      count: nearbyDroneIds.length,
      drones: nearbyDroneIds
    });
  });

  // GET /api/v1/telemetry/live/stream (Server-Sent Events real-time feed)
  fastify.get('/api/v1/telemetry/live/stream', async (_request: FastifyRequest, reply: FastifyReply) => {
    const { telemetryBroadcaster } = await import('../sse/broadcaster.js');

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    telemetryBroadcaster.addClient(reply.raw);

    // Keep connection open for continuous streaming
    return new Promise(() => {});
  });
}
