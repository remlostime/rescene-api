"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VertexAIGeminiService = void 0;
const vertexai_1 = require("@google-cloud/vertexai");
const director_prompt_js_1 = require("../prompts/director.prompt.js");
const remasterResponseSchema = {
    type: vertexai_1.SchemaType.OBJECT,
    properties: {
        options: {
            type: vertexai_1.SchemaType.ARRAY,
            description: 'Exactly 3 remastering options.',
            items: {
                type: vertexai_1.SchemaType.OBJECT,
                properties: {
                    title: {
                        type: vertexai_1.SchemaType.STRING,
                        description: "A catchy, short UI title for the option (e.g., 'Cinematic Sunset').",
                    },
                    description: {
                        type: vertexai_1.SchemaType.STRING,
                        description: 'A brief explanation in Chinese for the user, describing the vibe.',
                    },
                    nano_prompt: {
                        type: vertexai_1.SchemaType.STRING,
                        description: 'The highly detailed, technical English prompt for an Image-to-Image model. MUST emphasize keeping the foreground subject strictly unchanged.',
                    },
                },
                required: ['title', 'description', 'nano_prompt'],
            },
        },
    },
    required: ['options'],
};
class VertexAIGeminiService {
    model;
    constructor(config) {
        const vertexAI = new vertexai_1.VertexAI({
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
    async generateRemasterOptions(imageGcsUri, locationName) {
        const textPrompt = (0, director_prompt_js_1.buildDirectorPrompt)(locationName);
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
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
            throw new Error('Model returned invalid options structure');
        }
        return parsed;
    }
}
exports.VertexAIGeminiService = VertexAIGeminiService;
//# sourceMappingURL=vertex-ai-gemini.service.js.map