"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VertexAIGeminiService = void 0;
const vertexai_1 = require("@google-cloud/vertexai");
const director_prompt_js_1 = require("../prompts/director.prompt.js");
const chat_agent_prompt_js_1 = require("../prompts/chat-agent.prompt.js");
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
const chatResponseSchema = {
    type: vertexai_1.SchemaType.OBJECT,
    properties: {
        type: {
            type: vertexai_1.SchemaType.STRING,
            enum: ['chat_reply', 'proposal_card'],
        },
        text: {
            type: vertexai_1.SchemaType.STRING,
            description: 'The conversational reply or the summary of the proposal.',
        },
        proposal: {
            type: vertexai_1.SchemaType.OBJECT,
            nullable: true,
            properties: {
                title: {
                    type: vertexai_1.SchemaType.STRING,
                    description: "e.g., 'Cyberpunk Neon Rain'",
                },
                description: {
                    type: vertexai_1.SchemaType.STRING,
                    description: 'Chinese description of the final effect.',
                },
                nano_prompt: {
                    type: vertexai_1.SchemaType.STRING,
                    description: 'The detailed English image generation prompt.',
                },
            },
            required: ['title', 'description', 'nano_prompt'],
        },
    },
    required: ['type', 'text'],
};
class VertexAIGeminiService {
    remasterModel;
    chatModel;
    constructor(config) {
        const vertexAI = new vertexai_1.VertexAI({
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
                parts: [{ text: (0, chat_agent_prompt_js_1.buildChatAgentSystemPrompt)() }],
            },
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: chatResponseSchema,
            },
        });
    }
    async generateRemasterOptions(imageGcsUri, locationName) {
        const textPrompt = (0, director_prompt_js_1.buildDirectorPrompt)(locationName);
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
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
            throw new Error('Model returned invalid options structure');
        }
        return parsed;
    }
    async chatWithAgent(gcsUri, message, history) {
        const imageFilePart = {
            fileData: { mimeType: 'image/jpeg', fileUri: gcsUri },
        };
        const contents = [];
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
            parts: contents.length === 0
                ? [imageFilePart, { text: message }]
                : [{ text: message }],
        });
        const result = await this.chatModel.generateContent({ contents });
        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error('Empty response from Vertex AI chat model');
        }
        const parsed = JSON.parse(responseText);
        if (!parsed.type || !parsed.text) {
            throw new Error('Model returned invalid chat response structure');
        }
        return parsed;
    }
}
exports.VertexAIGeminiService = VertexAIGeminiService;
//# sourceMappingURL=vertex-ai-gemini.service.js.map