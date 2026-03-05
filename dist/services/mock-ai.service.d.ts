import type { IAIService, RemasterOptionsResponse } from '../interfaces/ai-service.interface.js';
export declare class MockAIService implements IAIService {
    generateRemasterOptions(_imageBase64: string, locationName?: string): Promise<RemasterOptionsResponse>;
}
//# sourceMappingURL=mock-ai.service.d.ts.map