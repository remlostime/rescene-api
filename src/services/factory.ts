import type { EnvConfig } from '../config/env.js';
import type { IAIService } from '../interfaces/ai-service.interface.js';
import type { IImageService } from '../interfaces/image-service.interface.js';
import type { IStorageService } from '../interfaces/storage-service.interface.js';

import { GcsStorageService } from './google/gcs-storage.service.js';
import { VertexAIGeminiService } from './google/vertex-ai-gemini.service.js';
import { VertexAIImageService } from './google/vertex-ai-image.service.js';

import { S3StorageService } from './aws/s3-storage.service.js';
import { BedrockNovaService } from './aws/bedrock-nova.service.js';
import { BedrockTitanImageService } from './aws/bedrock-titan-image.service.js';

import { MockAIService } from './mock/mock-ai.service.js';
import { MockImageService } from './mock/mock-image.service.js';

export interface AppServices {
  storageService: IStorageService;
  aiService: IAIService;
  imageService: IImageService;
}

function createGoogleServices(config: EnvConfig): AppServices {
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

function createAwsServices(config: EnvConfig): AppServices {
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

export function createServices(config: EnvConfig): AppServices {
  const storageForMock = config.cloudProvider === 'aws'
    ? new S3StorageService({ region: config.awsRegion, bucketName: config.s3BucketName })
    : new GcsStorageService({ bucketName: config.gcsBucketName });

  if (config.useMockAI) {
    return {
      storageService: storageForMock,
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
