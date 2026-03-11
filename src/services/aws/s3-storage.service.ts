import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import type { IStorageService } from '../../interfaces/storage-service.interface.js';

export interface S3StorageConfig {
  region: string;
  bucketName: string;
}

export class S3StorageService implements IStorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(config: S3StorageConfig) {
    this.client = new S3Client({ region: config.region });
    this.bucketName = config.bucketName;
    this.region = config.region;
  }

  async uploadBase64(base64: string, destinationPath: string): Promise<string> {
    const buffer = Buffer.from(base64, 'base64');
    return this.uploadBuffer(buffer, destinationPath);
  }

  async uploadBuffer(buffer: Buffer, destinationPath: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: destinationPath,
        Body: buffer,
        ContentType: 'image/jpeg',
      }),
    );

    return `s3://${this.bucketName}/${destinationPath}`;
  }

  getPublicUrl(destinationPath: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${destinationPath}`;
  }

  getStorageUri(destinationPath: string): string {
    return `s3://${this.bucketName}/${destinationPath}`;
  }

  async getObjectAsBase64(key: string): Promise<string> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    const bytes = await response.Body!.transformToByteArray();
    return Buffer.from(bytes).toString('base64');
  }
}
