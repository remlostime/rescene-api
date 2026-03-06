import type { IAIService, RemasterOptionsResponse } from '../interfaces/ai-service.interface.js';
import type { ChatMessage, ChatResponse } from '../interfaces/chat.types.js';
export interface VertexAIConfig {
    projectId: string;
    location: string;
    modelName: string;
}
export declare class VertexAIGeminiService implements IAIService {
    private readonly remasterModel;
    private readonly chatModel;
    constructor(config: VertexAIConfig);
    generateRemasterOptions(imageGcsUri: string, locationName?: string): Promise<RemasterOptionsResponse>;
    chatWithAgent(gcsUri: string, message: string, history: ChatMessage[]): Promise<ChatResponse>;
}
//# sourceMappingURL=vertex-ai-gemini.service.d.ts.map