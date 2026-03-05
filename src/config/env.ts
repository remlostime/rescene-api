import 'dotenv/config';

export interface EnvConfig {
  gcpProjectId: string;
  gcpLocation: string;
  geminiModel: string;
  gcsBucketName: string;
  imageGenModel: string;
  port: number;
  useMockAI: boolean;
}

export function loadEnvConfig(): EnvConfig {
  const gcpProjectId = process.env.GCP_PROJECT_ID ?? '';
  const useMockAI = process.env.USE_MOCK_AI === 'true';

  if (!useMockAI && !gcpProjectId) {
    throw new Error(
      'GCP_PROJECT_ID is required when USE_MOCK_AI is not enabled. ' +
      'Set it in your .env file or environment variables.',
    );
  }

  return {
    gcpProjectId,
    gcpLocation: process.env.GCP_LOCATION ?? 'us-central1',
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    gcsBucketName: process.env.GCS_BUCKET_NAME ?? 'rescene-images',
    imageGenModel: process.env.IMAGE_GENERATION_MODEL ?? 'gemini-3.1-flash-image-preview',
    port: Number(process.env.PORT) || 8080,
    useMockAI,
  };
}
