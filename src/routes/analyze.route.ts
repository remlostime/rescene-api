import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

interface AnalyzeRequestBody {
  imageBase64: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

const analyzeBodySchema = {
  type: 'object',
  required: ['imageBase64'],
  properties: {
    imageBase64: { type: 'string' },
    latitude: { type: 'number' },
    longitude: { type: 'number' },
    locationName: { type: 'string' },
  },
} as const;

const analyzeRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post<{ Body: AnalyzeRequestBody }>(
    '/api/analyze',
    {
      schema: {
        body: analyzeBodySchema,
      },
    },
    async (request, reply) => {
      const { imageBase64, locationName } = request.body;

      try {
        const data = await fastify.aiService.generateRemasterOptions(
          imageBase64,
          locationName,
        );

        return reply.send({ status: 'success', data });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error during analysis';
        request.log.error({ err: error }, 'Failed to generate remaster options');
        return reply.status(500).send({ status: 'error', message });
      }
    },
  );
};

export default analyzeRoute;
