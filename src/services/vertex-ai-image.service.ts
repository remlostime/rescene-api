import { VertexAI } from '@google-cloud/vertexai';
import type { GenerativeModel } from '@google-cloud/vertexai';
import type { IImageService } from '../interfaces/image-service.interface.js';

export interface VertexAIImageConfig {
  projectId: string;
  location: string;
  modelName: string;
}

export class VertexAIImageService implements IImageService {
  private readonly model: GenerativeModel;

  constructor(config: VertexAIImageConfig) {
    const vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
    });

    this.model = vertexAI.getGenerativeModel({
      model: config.modelName,
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });
  }

  async editImage(sourceGcsUri: string, prompt: string): Promise<Buffer> {
    const result = await this.model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                mimeType: 'image/jpeg',
                fileUri: sourceGcsUri,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const imagePart = result.response.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData,
    );

    if (!imagePart?.inlineData?.data) {
      throw new Error('Image generation model returned no image data');
    }

    return Buffer.from(imagePart.inlineData.data, 'base64');
  }
}
