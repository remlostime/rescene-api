export interface IImageService {
  editImage(sourceUri: string, prompt: string): Promise<Buffer>;
}
