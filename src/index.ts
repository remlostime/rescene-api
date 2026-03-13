import Fastify from 'fastify';

async function main() {
  console.log('[ReScene-Isolation] Process starting...');
  
  const fastify = Fastify({ logger: true });
  
  fastify.get('/health', async () => {
    return { status: 'ok', message: 'Isolation test passed!' };
  });

  // Log all environment variables to see what App Runner actually injected
  console.log('[ReScene-Isolation] Environment variables:', {
    CLOUD_PROVIDER: process.env.CLOUD_PROVIDER,
    AWS_REGION: process.env.AWS_REGION,
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV
  });

  const port = Number(process.env.PORT) || 8080;
  
  console.log(`[ReScene-Isolation] Attempting to bind to port ${port}...`);
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`[ReScene-Isolation] Server successfully listening on port ${port}`);
}

main().catch((err) => {
  console.error('[ReScene-Isolation] Fatal error during startup:', err);
  process.exit(1);
});
