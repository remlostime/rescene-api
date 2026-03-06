import type { IAIService, RemasterOptionsResponse } from '../interfaces/ai-service.interface.js';
import type { ChatMessage, ChatResponse } from '../interfaces/chat.types.js';
export declare class MockAIService implements IAIService {
    generateRemasterOptions(_imageGcsUri: string, locationName?: string): Promise<RemasterOptionsResponse>;
    chatWithAgent(_gcsUri: string, message: string, _history: ChatMessage[]): Promise<ChatResponse>;
}
//# sourceMappingURL=mock-ai.service.d.ts.map