export interface IImageService {
  editImage(sourceGcsUri: string, prompt: string): Promise<Buffer>;
}
