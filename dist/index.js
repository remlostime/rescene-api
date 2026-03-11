"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const env_js_1 = require("./config/env.js");
const factory_js_1 = require("./services/factory.js");
const analyze_route_js_1 = __importDefault(require("./routes/analyze.route.js"));
const render_route_js_1 = __importDefault(require("./routes/render.route.js"));
const chat_route_js_1 = __importDefault(require("./routes/chat.route.js"));
async function main() {
    const config = (0, env_js_1.loadEnvConfig)();
    const fastify = (0, fastify_1.default)({
        logger: true,
        bodyLimit: 10_485_760,
    });
    const { storageService, aiService, imageService } = (0, factory_js_1.createServices)(config);
    fastify.decorate('storageService', storageService);
    fastify.decorate('aiService', aiService);
    fastify.decorate('imageService', imageService);
    await fastify.register(analyze_route_js_1.default);
    await fastify.register(render_route_js_1.default);
    await fastify.register(chat_route_js_1.default);
    fastify.log.info(`Cloud provider: ${config.cloudProvider}, mock AI: ${config.useMockAI}`);
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
}
main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map