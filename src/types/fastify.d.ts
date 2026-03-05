import type { IAIService } from '../interfaces/ai-service.interface.js';
import type { IStorageService } from '../interfaces/storage-service.interface.js';
import type { IImageService } from '../interfaces/image-service.interface.js';

declare module 'fastify' {
  interface FastifyInstance {
    aiService: IAIService;
    storageService: IStorageService;
    imageService: IImageService;
  }
}
