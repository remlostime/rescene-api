export interface RemasterOption {
    title: string;
    description: string;
    nano_prompt: string;
}
export interface RemasterOptionsResponse {
    options: RemasterOption[];
}
export interface IAIService {
    generateRemasterOptions(imageBase64: string, locationName?: string): Promise<RemasterOptionsResponse>;
}
//# sourceMappingURL=ai-service.interface.d.ts.map