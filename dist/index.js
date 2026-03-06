"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const env_js_1 = require("./config/env.js");
const vertex_ai_gemini_service_js_1 = require("./services/vertex-ai-gemini.service.js");
const mock_ai_service_js_1 = require("./services/mock-ai.service.js");
const vertex_ai_image_service_js_1 = require("./services/vertex-ai-image.service.js");
const mock_image_service_js_1 = require("./services/mock-image.service.js");
const storage_service_js_1 = require("./services/storage.service.js");
const analyze_route_js_1 = __importDefault(require("./routes/analyze.route.js"));
const render_route_js_1 = __importDefault(require("./routes/render.route.js"));
const chat_route_js_1 = __importDefault(require("./routes/chat.route.js"));
async function main() {
    const config = (0, env_js_1.loadEnvConfig)();
    const fastify = (0, fastify_1.default)({
        logger: true,
        bodyLimit: 10_485_760,
    });
    const storageService = new storage_service_js_1.StorageService({
        bucketName: config.gcsBucketName,
    });
    fastify.decorate('storageService', storageService);
    const aiService = config.useMockAI
        ? new mock_ai_service_js_1.MockAIService()
        : new vertex_ai_gemini_service_js_1.VertexAIGeminiService({
            projectId: config.gcpProjectId,
            location: config.gcpLocation,
            modelName: config.geminiModel,
        });
    fastify.decorate('aiService', aiService);
    const imageService = config.useMockAI
        ? new mock_image_service_js_1.MockImageService()
        : new vertex_ai_image_service_js_1.VertexAIImageService({
            projectId: config.gcpProjectId,
            location: config.gcpLocation,
            modelName: config.imageGenModel,
        });
    fastify.decorate('imageService', imageService);
    await fastify.register(analyze_route_js_1.default);
    await fastify.register(render_route_js_1.default);
    await fastify.register(chat_route_js_1.default);
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
}
main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map