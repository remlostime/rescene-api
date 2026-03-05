import type { IAIService } from '../interfaces/ai-service.interface.js';

declare module 'fastify' {
  interface FastifyInstance {
    aiService: IAIService;
  }
}
