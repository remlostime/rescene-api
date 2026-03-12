export interface IStorageService {
  uploadBase64(base64: string, destinationPath: string): Promise<string>;
  uploadBuffer(buffer: Buffer, destinationPath: string): Promise<string>;
  getPublicUrl(destinationPath: string): string;
  getStorageUri(destinationPath: string): string;
}
