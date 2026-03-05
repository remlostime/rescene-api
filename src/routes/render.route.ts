import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

interface RenderRequestBody {
  imageId: string;
  nano_prompt: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const renderBodySchema = {
  type: 'object',
  required: ['imageId', 'nano_prompt'],
  properties: {
    imageId: { type: 'string' },
    nano_prompt: { type: 'string' },
  },
} as const;

const renderRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post<{ Body: RenderRequestBody }>(
    '/api/render',
    {
      schema: {
        body: renderBodySchema,
      },
    },
    async (request, reply) => {
      const { imageId, nano_prompt } = request.body;

      if (!UUID_REGEX.test(imageId)) {
        return reply.status(400).send({
          status: 'error',
          message: 'Invalid imageId format. Expected a UUID.',
        });
      }

      try {
        const sourceGcsUri = `gs://rescene-images/temp/${imageId}.jpg`;

        const resultBuffer = await fastify.imageService.editImage(
          sourceGcsUri,
          nano_prompt,
        );

        const resultId = randomUUID();
        const outputPath = `output/${resultId}.jpg`;

        await fastify.storageService.uploadBuffer(resultBuffer, outputPath);

        const resultUrl = fastify.storageService.getPublicUrl(outputPath);

        return reply.send({ status: 'success', resultUrl });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error during rendering';
        request.log.error({ err: error }, 'Failed to render image');
        return reply.status(500).send({ status: 'error', message });
      }
    },
  );
};

export default renderRoute;
