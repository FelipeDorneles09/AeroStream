import { buildApp } from './app.js';
import { config } from './config/env.js';

async function bootstrap() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 AeroStream Ingestion API running at http://${config.host}:${config.port}`);
    console.log(`📚 Swagger documentation available at http://${config.host}:${config.port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
