import type { ChatMessage, ChatResponse } from './chat.types.js';

export interface RemasterOption {
  title: string;
  description: string;
  nano_prompt: string;
}

export interface RemasterOptionsResponse {
  options: RemasterOption[];
}

export interface IAIService {
  generateRemasterOptions(
    imageGcsUri: string,
    locationName?: string,
  ): Promise<RemasterOptionsResponse>;

  chatWithAgent(
    gcsUri: string,
    message: string,
    history: ChatMessage[],
  ): Promise<ChatResponse>;
}
