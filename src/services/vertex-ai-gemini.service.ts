import { VertexAI, SchemaType } from '@google-cloud/vertexai';
import type {
  Content,
  GenerativeModel,
  ResponseSchema,
} from '@google-cloud/vertexai';
import type {
  IAIService,
  RemasterOptionsResponse,
} from '../interfaces/ai-service.interface.js';
import type { ChatMessage, ChatResponse } from '../interfaces/chat.types.js';
import { buildDirectorPrompt } from '../prompts/director.prompt.js';
import { buildChatAgentSystemPrompt } from '../prompts/chat-agent.prompt.js';

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

const chatResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    type: {
      type: SchemaType.STRING,
      enum: ['chat_reply', 'proposal_card'],
    },
    text: {
      type: SchemaType.STRING,
      description:
        'The conversational reply or the summary of the proposal.',
    },
    proposal: {
      type: SchemaType.OBJECT,
      nullable: true,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "e.g., 'Cyberpunk Neon Rain'",
        },
        description: {
          type: SchemaType.STRING,
          description: 'Chinese description of the final effect.',
        },
        nano_prompt: {
          type: SchemaType.STRING,
          description: 'The detailed English image generation prompt.',
        },
      },
      required: ['title', 'description', 'nano_prompt'],
    },
  },
  required: ['type', 'text'],
};

export class VertexAIGeminiService implements IAIService {
  private readonly remasterModel: GenerativeModel;
  private readonly chatModel: GenerativeModel;

  constructor(config: VertexAIConfig) {
    const vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
    });

    this.remasterModel = vertexAI.getGenerativeModel({
      model: config.modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: remasterResponseSchema,
      },
    });

    this.chatModel = vertexAI.getGenerativeModel({
      model: config.modelName,
      systemInstruction: {
        role: 'system',
        parts: [{ text: buildChatAgentSystemPrompt() }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: chatResponseSchema,
      },
    });
  }

  async generateRemasterOptions(
    imageGcsUri: string,
    locationName?: string,
  ): Promise<RemasterOptionsResponse> {
    const textPrompt = buildDirectorPrompt(locationName);

    const result = await this.remasterModel.generateContent({
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

  async chatWithAgent(
    gcsUri: string,
    message: string,
    history: ChatMessage[],
  ): Promise<ChatResponse> {
    const imageFilePart = {
      fileData: { mimeType: 'image/jpeg', fileUri: gcsUri },
    };

    const contents: Content[] = [];

    for (const msg of history) {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }],
      });
    }

    if (contents.length > 0 && contents[0].role === 'user') {
      contents[0].parts.unshift(imageFilePart);
    }

    contents.push({
      role: 'user',
      parts:
        contents.length === 0
          ? [imageFilePart, { text: message }]
          : [{ text: message }],
    });

    const result = await this.chatModel.generateContent({ contents });
    const responseText =
      result.response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Empty response from Vertex AI chat model');
    }

    const parsed: ChatResponse = JSON.parse(responseText);

    if (!parsed.type || !parsed.text) {
      throw new Error('Model returned invalid chat response structure');
    }

    return parsed;
  }
}
