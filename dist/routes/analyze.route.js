"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
            const data = await fastify.aiService.generateRemasterOptions(imageBase64, locationName);
            return reply.send({ status: 'success', data });
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