import { VertexAI, SchemaType } from '@google-cloud/vertexai';
import type { GenerativeModel, ResponseSchema } from '@google-cloud/vertexai';
import type {
  IAIService,
  RemasterOptionsResponse,
} from '../interfaces/ai-service.interface.js';
import { buildDirectorPrompt } from '../prompts/director.prompt.js';

export interface VertexAIConfig {
  projectId: string;
  location: string;
  modelName: string;
}

const remasterResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    options: {
      type: SchemaType.ARRAY,
      description: 'Exactly 3 remastering options.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description:
              "A catchy, short UI title for the option (e.g., 'Cinematic Sunset').",
          },
          description: {
            type: SchemaType.STRING,
            description:
              'A brief explanation in Chinese for the user, describing the vibe.',
          },
          nano_prompt: {
            type: SchemaType.STRING,
            description:
              'The highly detailed, technical English prompt for an Image-to-Image model. MUST emphasize keeping the foreground subject strictly unchanged.',
          },
        },
        required: ['title', 'description', 'nano_prompt'],
      },
    },
  },
  required: ['options'],
};

export class VertexAIGeminiService implements IAIService {
  private readonly model: GenerativeModel;

  constructor(config: VertexAIConfig) {
    const vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
    });

    this.model = vertexAI.getGenerativeModel({
      model: config.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: remasterResponseSchema,
      },
    });
  }

  async generateRemasterOptions(
    imageGcsUri: string,
    locationName?: string,
  ): Promise<RemasterOptionsResponse> {
    const textPrompt = buildDirectorPrompt(locationName);

    const result = await this.model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                mimeType: 'image/jpeg',
                fileUri: imageGcsUri,
              },
            },
            { text: textPrompt },
          ],
        },
      ],
    });

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Vertex AI model');
    }

    const parsed: RemasterOptionsResponse = JSON.parse(text);

    if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
      throw new Error('Model returned invalid options structure');
    }

    return parsed;
  }
}
