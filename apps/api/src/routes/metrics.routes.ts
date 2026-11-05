import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { register } from "../metrics/metrics.service.js";

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/metrics",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        reply.header("Content-Type", register.contentType);
        const metrics = await register.metrics();
        return reply.send(metrics);
      } catch (err) {
        fastify.log.error(err, "Failed to scrape Prometheus metrics");
        return reply.status(500).send({ error: "Failed to generate metrics" });
      }
    },
  );
}
