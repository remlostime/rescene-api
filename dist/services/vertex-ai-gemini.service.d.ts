import type { IAIService, RemasterOptionsResponse } from '../interfaces/ai-service.interface.js';
export interface VertexAIConfig {
    projectId: string;
    location: string;
    modelName: string;
}
export declare class VertexAIGeminiService implements IAIService {
    private readonly model;
    constructor(config: VertexAIConfig);
    generateRemasterOptions(imageGcsUri: string, locationName?: string): Promise<RemasterOptionsResponse>;
}
//# sourceMappingURL=vertex-ai-gemini.service.d.ts.map