import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { ChatRequest } from '../interfaces/chat.types.js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const chatBodySchema = {
  type: 'object',
  required: ['imageId', 'message', 'history'],
  properties: {
    imageId: { type: 'string' },
    message: { type: 'string' },
    history: {
      type: 'array',
      items: {
        type: 'object',
        required: ['role', 'text'],
        properties: {
          role: { type: 'string', enum: ['user', 'model'] },
          text: { type: 'string' },
        },
      },
    },
  },
} as const;

const chatRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post<{ Body: ChatRequest }>(
    '/api/chat',
    {
      schema: {
        body: chatBodySchema,
      },
    },
    async (request, reply) => {
      const { imageId, message, history } = request.body;

      if (!UUID_REGEX.test(imageId)) {
        return reply.status(400).send({
          status: 'error',
          message: 'Invalid imageId format. Expected a UUID.',
        });
      }

      try {
        const gcsUri = `gs://rescene-images/temp/${imageId}.jpg`;

        const data = await fastify.aiService.chatWithAgent(
          gcsUri,
          message,
          history,
        );

        return reply.send({ status: 'success', data });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error during chat';
        request.log.error({ err: error }, 'Failed to process chat request');
        return reply.status(500).send({ status: 'error', message });
      }
    },
  );
};

export default chatRoute;
