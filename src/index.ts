console.log('[ReScene] Process starting...');

import Fastify from 'fastify';
import { loadEnvConfig } from './config/env.js';
import { createServices } from './services/factory.js';
import analyzeRoute from './routes/analyze.route.js';
import renderRoute from './routes/render.route.js';
import chatRoute from './routes/chat.route.js';

async function main() {
  console.log('[ReScene] Loading config...');
  const config = loadEnvConfig();
  console.log(`[ReScene] Config loaded: provider=${config.cloudProvider}, mock=${config.useMockAI}, port=${config.port}`);

  const fastify = Fastify({
    logger: true,
    bodyLimit: 10_485_760,
  });

  fastify.get('/health', async () => ({ status: 'ok' }));

  console.log('[ReScene] Creating services...');
  const { storageService, aiService, imageService } = await createServices(config);
  console.log('[ReScene] Services created successfully');

  fastify.decorate('storageService', storageService);
  fastify.decorate('aiService', aiService);
  fastify.decorate('imageService', imageService);

  await fastify.register(analyzeRoute);
  await fastify.register(renderRoute);
  await fastify.register(chatRoute);

  console.log(`[ReScene] Starting server on port ${config.port}...`);
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`[ReScene] Server listening on port ${config.port}`);
}

main().catch((err) => {
  console.error('[ReScene] Failed to start server:', err);
  process.exit(1);
});
