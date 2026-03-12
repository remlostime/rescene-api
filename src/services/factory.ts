import type { EnvConfig } from '../config/env.js';
import type { IAIService } from '../interfaces/ai-service.interface.js';
import type { IImageService } from '../interfaces/image-service.interface.js';
import type { IStorageService } from '../interfaces/storage-service.interface.js';

export interface AppServices {
  storageService: IStorageService;
  aiService: IAIService;
  imageService: IImageService;
}

async function createGoogleServices(config: EnvConfig): Promise<AppServices> {
  const { GcsStorageService } = await import('./google/gcs-storage.service.js');
  const { VertexAIGeminiService } = await import('./google/vertex-ai-gemini.service.js');
  const { VertexAIImageService } = await import('./google/vertex-ai-image.service.js');

  const storageService = new GcsStorageService({
    bucketName: config.gcsBucketName,
  });

  const aiService = new VertexAIGeminiService({
    projectId: config.gcpProjectId,
    location: config.gcpLocation,
    modelName: config.geminiModel,
  });

  const imageService = new VertexAIImageService({
    projectId: config.gcpProjectId,
    location: config.gcpLocation,
    modelName: config.imageGenModel,
  });

  return { storageService, aiService, imageService };
}

async function createAwsServices(config: EnvConfig): Promise<AppServices> {
  const { S3StorageService } = await import('./aws/s3-storage.service.js');
  const { BedrockNovaService } = await import('./aws/bedrock-nova.service.js');
  const { BedrockTitanImageService } = await import('./aws/bedrock-titan-image.service.js');

  const s3Storage = new S3StorageService({
    region: config.awsRegion,
    bucketName: config.s3BucketName,
  });

  const aiService = new BedrockNovaService({
    region: config.awsRegion,
    modelId: config.bedrockNovaModel,
    s3Storage,
  });

  const imageService = new BedrockTitanImageService({
    region: config.awsRegion,
    modelId: config.bedrockTitanImageModel,
    s3Storage,
  });

  return { storageService: s3Storage, aiService, imageService };
}

async function createMockStorageForProvider(config: EnvConfig): Promise<IStorageService> {
  if (config.cloudProvider === 'aws') {
    const { S3StorageService } = await import('./aws/s3-storage.service.js');
    return new S3StorageService({ region: config.awsRegion, bucketName: config.s3BucketName });
  }
  const { GcsStorageService } = await import('./google/gcs-storage.service.js');
  return new GcsStorageService({ bucketName: config.gcsBucketName });
}

export async function createServices(config: EnvConfig): Promise<AppServices> {
  if (config.useMockAI) {
    const { MockAIService } = await import('./mock/mock-ai.service.js');
    const { MockImageService } = await import('./mock/mock-image.service.js');
    const storageService = await createMockStorageForProvider(config);
    return {
      storageService,
      aiService: new MockAIService(),
      imageService: new MockImageService(),
    };
  }

  switch (config.cloudProvider) {
    case 'google':
      return createGoogleServices(config);
    case 'aws':
      return createAwsServices(config);
  }
}
