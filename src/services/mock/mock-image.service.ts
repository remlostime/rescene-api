import type { IImageService } from '../../interfaces/image-service.interface.js';

const PLACEHOLDER_1X1_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoH' +
  'BwYIDAoMCwsKCwsJCQ0RDQ4PEA8JCxMTFBYTExccHh8fIBEZGyH/2wBDAQMEBAUE' +
  'BQkFBQkdDwsPHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0d' +
  'HR0dHR0dHR0dHR3/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf' +
  '/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAA' +
  'AAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA//9k=',
  'base64',
);

export class MockImageService implements IImageService {
  async editImage(_sourceUri: string, _prompt: string): Promise<Buffer> {
    return PLACEHOLDER_1X1_JPEG;
  }
}
