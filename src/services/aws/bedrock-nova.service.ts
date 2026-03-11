import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type {
  ContentBlock,
  Message,
  SystemContentBlock,
  Tool,
} from '@aws-sdk/client-bedrock-runtime';
import type {
  IAIService,
  RemasterOptionsResponse,
} from '../../interfaces/ai-service.interface.js';
import type { ChatMessage, ChatResponse } from '../../interfaces/chat.types.js';
import { buildDirectorPrompt } from '../../prompts/director.prompt.js';
import { buildChatAgentSystemPrompt } from '../../prompts/chat-agent.prompt.js';
import { S3StorageService } from './s3-storage.service.js';

export interface BedrockNovaConfig {
  region: string;
  modelId: string;
  s3Storage: S3StorageService;
}

const remasterOptionsTool: Tool = {
  toolSpec: {
    name: 'output_remaster_options',
    description: 'Output exactly 3 creative environment remastering options for the photograph.',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          options: {
            type: 'array',
            description: 'Exactly 3 remastering options.',
            items: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: "A catchy, short UI title (e.g., 'Cinematic Sunset').",
                },
                description: {
                  type: 'string',
                  description: 'A brief explanation describing the vibe.',
                },
                nano_prompt: {
                  type: 'string',
                  description: 'Detailed technical prompt for an Image-to-Image model. MUST begin with subject preservation instruction.',
                },
              },
              required: ['title', 'description', 'nano_prompt'],
            },
          },
        },
        required: ['options'],
      },
    },
  },
};

const chatResponseTool: Tool = {
  toolSpec: {
    name: 'output_chat_response',
    description: 'Output a structured chat response — either a conversational reply or a proposal card.',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['chat_reply', 'proposal_card'],
            description: 'The response type.',
          },
          text: {
            type: 'string',
            description: 'The conversational reply or summary of the proposal.',
          },
          proposal: {
            type: 'object',
            description: 'Required when type is proposal_card.',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              nano_prompt: { type: 'string' },
            },
            required: ['title', 'description', 'nano_prompt'],
          },
        },
        required: ['type', 'text'],
      },
    },
  },
};

export class BedrockNovaService implements IAIService {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;
  private readonly s3Storage: S3StorageService;

  constructor(config: BedrockNovaConfig) {
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

  async generateRemasterOptions(
    sourceUri: string,
    locationName?: string,
  ): Promise<RemasterOptionsResponse> {
    const key = this.extractKeyFromUri(sourceUri);
    const imageBase64 = await this.s3Storage.getObjectAsBase64(key);

    const systemPrompt: SystemContentBlock[] = [
      {
        text: 'You are a photography post-production expert. You MUST call the output_remaster_options tool with your response. Do NOT reply with plain text.',
      },
    ];

    const textPrompt = buildDirectorPrompt(locationName);

    const userContent: ContentBlock[] = [
      { image: { format: 'jpeg', source: { bytes: Buffer.from(imageBase64, 'base64') } } },
      { text: textPrompt },
    ];

    const messages: Message[] = [{ role: 'user', content: userContent }];

    const response = await this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        system: systemPrompt,
        messages,
        toolConfig: {
          tools: [remasterOptionsTool],
          toolChoice: { tool: { name: 'output_remaster_options' } },
        },
      }),
    );

    const toolUseBlock = response.output?.message?.content?.find(
      (block) => block.toolUse,
    );

    if (!toolUseBlock?.toolUse?.input) {
      throw new Error('Nova model did not return a tool use response');
    }

    const parsed = toolUseBlock.toolUse.input as unknown as RemasterOptionsResponse;

    if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
      throw new Error('Model returned invalid options structure');
    }

    return parsed;
  }

  async chatWithAgent(
    sourceUri: string,
    message: string,
    history: ChatMessage[],
  ): Promise<ChatResponse> {
    const key = this.extractKeyFromUri(sourceUri);
    const imageBase64 = await this.s3Storage.getObjectAsBase64(key);

    const systemPrompt: SystemContentBlock[] = [
      {
        text: buildChatAgentSystemPrompt() +
          '\n\nYou MUST call the output_chat_response tool with your response. Do NOT reply with plain text.',
      },
    ];

    const imageBlock: ContentBlock = {
      image: { format: 'jpeg', source: { bytes: Buffer.from(imageBase64, 'base64') } },
    };

    const messages: Message[] = [];

    for (const msg of history) {
      const role = msg.role === 'model' ? 'assistant' : 'user';
      messages.push({ role, content: [{ text: msg.text }] });
    }

    if (messages.length > 0 && messages[0].role === 'user') {
      messages[0].content!.unshift(imageBlock);
    }

    const userContent: ContentBlock[] =
      messages.length === 0
        ? [imageBlock, { text: message }]
        : [{ text: message }];

    messages.push({ role: 'user', content: userContent });

    const response = await this.client.send(
      new ConverseCommand({
        modelId: this.modelId,
        system: systemPrompt,
        messages,
        toolConfig: {
          tools: [chatResponseTool],
          toolChoice: { tool: { name: 'output_chat_response' } },
        },
      }),
    );

    const toolUseBlock = response.output?.message?.content?.find(
      (block) => block.toolUse,
    );

    if (!toolUseBlock?.toolUse?.input) {
      throw new Error('Nova model did not return a tool use response');
    }

    const parsed = toolUseBlock.toolUse.input as unknown as ChatResponse;

    if (!parsed.type || !parsed.text) {
      throw new Error('Model returned invalid chat response structure');
    }

    return parsed;
  }
}
