import { Storage } from '@google-cloud/storage';
import type { IStorageService } from '../../interfaces/storage-service.interface.js';

export interface GcsStorageConfig {
  bucketName: string;
}

export class GcsStorageService implements IStorageService {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(config: GcsStorageConfig) {
    this.storage = new Storage();
    this.bucketName = config.bucketName;
  }

  async uploadBase64(base64: string, destinationPath: string): Promise<string> {
    const buffer = Buffer.from(base64, 'base64');
    return this.uploadBuffer(buffer, destinationPath);
  }

  async uploadBuffer(buffer: Buffer, destinationPath: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(destinationPath);

    await file.save(buffer, {
      contentType: 'image/jpeg',
      resumable: false,
    });

    return `gs://${this.bucketName}/${destinationPath}`;
  }

  getPublicUrl(destinationPath: string): string {
    return `https://storage.googleapis.com/${this.bucketName}/${destinationPath}`;
  }

  getStorageUri(destinationPath: string): string {
    return `gs://${this.bucketName}/${destinationPath}`;
  }
}
