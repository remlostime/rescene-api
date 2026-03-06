import Fastify from 'fastify';
import { loadEnvConfig } from './config/env.js';
import type { IAIService } from './interfaces/ai-service.interface.js';
import type { IImageService } from './interfaces/image-service.interface.js';
import { VertexAIGeminiService } from './services/vertex-ai-gemini.service.js';
import { MockAIService } from './services/mock-ai.service.js';
import { VertexAIImageService } from './services/vertex-ai-image.service.js';
import { MockImageService } from './services/mock-image.service.js';
import { StorageService } from './services/storage.service.js';
import analyzeRoute from './routes/analyze.route.js';
import renderRoute from './routes/render.route.js';
import chatRoute from './routes/chat.route.js';

async function main() {
  const config = loadEnvConfig();
  const fastify = Fastify({
    logger: true,
    bodyLimit: 10_485_760,
  });

  const storageService = new StorageService({
    bucketName: config.gcsBucketName,
  });
  fastify.decorate('storageService', storageService);

  const aiService: IAIService = config.useMockAI
    ? new MockAIService()
    : new VertexAIGeminiService({
        projectId: config.gcpProjectId,
        location: config.gcpLocation,
        modelName: config.geminiModel,
      });
  fastify.decorate('aiService', aiService);

  const imageService: IImageService = config.useMockAI
    ? new MockImageService()
    : new VertexAIImageService({
        projectId: config.gcpProjectId,
        location: config.gcpLocation,
        modelName: config.imageGenModel,
      });
  fastify.decorate('imageService', imageService);

  await fastify.register(analyzeRoute);
  await fastify.register(renderRoute);
  await fastify.register(chatRoute);

  await fastify.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
