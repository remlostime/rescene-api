import Fastify from 'fastify';
import { loadEnvConfig } from './config/env.js';
import type { IAIService } from './interfaces/ai-service.interface.js';
import { VertexAIGeminiService } from './services/vertex-ai-gemini.service.js';
import { MockAIService } from './services/mock-ai.service.js';
import analyzeRoute from './routes/analyze.route.js';

async function main() {
  const config = loadEnvConfig();
  const fastify = Fastify({
    logger: true,
    bodyLimit: 10_485_760, // 10 MB — base64-encoded photos from iOS can exceed the 1 MB default
  });

  const aiService: IAIService = config.useMockAI
    ? new MockAIService()
    : new VertexAIGeminiService({
        projectId: config.gcpProjectId,
        location: config.gcpLocation,
        modelName: config.geminiModel,
      });

  fastify.decorate('aiService', aiService);

  await fastify.register(analyzeRoute);

  await fastify.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
