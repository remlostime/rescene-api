"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const analyzeBodySchema = {
    type: 'object',
    required: ['imageBase64'],
    properties: {
        imageBase64: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        locationName: { type: 'string' },
    },
};
const analyzeRoute = async (fastify) => {
    fastify.post('/api/analyze', {
        schema: {
            body: analyzeBodySchema,
        },
    }, async (request, reply) => {
        const { imageBase64, locationName } = request.body;
        try {
            const imageId = (0, node_crypto_1.randomUUID)();
            const destinationPath = `temp/${imageId}.jpg`;
            const gcsUri = await fastify.storageService.uploadBase64(imageBase64, destinationPath);
            const data = await fastify.aiService.generateRemasterOptions(gcsUri, locationName);
            return reply.send({ status: 'success', imageId, data });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error during analysis';
            request.log.error({ err: error }, 'Failed to generate remaster options');
            return reply.status(500).send({ status: 'error', message });
        }
    });
};
exports.default = analyzeRoute;
//# sourceMappingURL=analyze.route.js.map