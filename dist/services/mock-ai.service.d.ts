import type { IAIService, RemasterOptionsResponse } from '../interfaces/ai-service.interface.js';
export declare class MockAIService implements IAIService {
    generateRemasterOptions(_imageGcsUri: string, locationName?: string): Promise<RemasterOptionsResponse>;
}
//# sourceMappingURL=mock-ai.service.d.ts.map