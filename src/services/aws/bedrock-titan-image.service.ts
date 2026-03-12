import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { IImageService } from '../../interfaces/image-service.interface.js';
import { S3StorageService } from './s3-storage.service.js';

export interface BedrockTitanImageConfig {
  region: string;
  modelId: string;
  s3Storage: S3StorageService;
}

interface TitanImageResponse {
  images: string[];
}

export class BedrockTitanImageService implements IImageService {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;
  private readonly s3Storage: S3StorageService;

  constructor(config: BedrockTitanImageConfig) {
    this.client = new BedrockRuntimeClient({ region: config.region });
    this.modelId = config.modelId;
    this.s3Storage = config.s3Storage;
  }

  private extractKeyFromUri(sourceUri: string): string {
    const match = sourceUri.match(/^s3:\/\/[^/]+\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid S3 URI: ${sourceUri}`);
    }
    return match[1];
  }

  async editImage(sourceUri: string, prompt: string): Promise<Buffer> {
    const key = this.extractKeyFromUri(sourceUri);
    const imageBase64 = await this.s3Storage.getObjectAsBase64(key);

    const payload = {
      taskType: 'IMAGE_VARIATION',
      imageVariationParams: {
        text: prompt,
        images: [imageBase64],
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        quality: 'premium',
        height: 1024,
        width: 1024,
      },
    };

    const response = await this.client.send(
      new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      }),
    );

    const responseBody: TitanImageResponse = JSON.parse(
      new TextDecoder().decode(response.body),
    );

    if (!responseBody.images || responseBody.images.length === 0) {
      throw new Error('Titan Image Generator returned no images');
    }

    return Buffer.from(responseBody.images[0], 'base64');
  }
}
