import Fastify from 'fastify';
import { loadEnvConfig } from './config/env.js';
import { createServices } from './services/factory.js';
import analyzeRoute from './routes/analyze.route.js';
import renderRoute from './routes/render.route.js';
import chatRoute from './routes/chat.route.js';

async function main() {
  const config = loadEnvConfig();
  const fastify = Fastify({
    logger: true,
    bodyLimit: 10_485_760,
  });

  const { storageService, aiService, imageService } = createServices(config);
  fastify.decorate('storageService', storageService);
  fastify.decorate('aiService', aiService);
  fastify.decorate('imageService', imageService);

  await fastify.register(analyzeRoute);
  await fastify.register(renderRoute);
  await fastify.register(chatRoute);

  fastify.log.info(`Cloud provider: ${config.cloudProvider}, mock AI: ${config.useMockAI}`);
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
