import 'dotenv/config';

export type CloudProvider = 'google' | 'aws';

export interface EnvConfig {
  cloudProvider: CloudProvider;
  port: number;
  useMockAI: boolean;

  // Google Cloud
  gcpProjectId: string;
  gcpLocation: string;
  geminiModel: string;
  gcsBucketName: string;
  imageGenModel: string;

  // AWS
  awsRegion: string;
  s3BucketName: string;
  bedrockNovaModel: string;
  bedrockTitanImageModel: string;
}

export function loadEnvConfig(): EnvConfig {
  const useMockAI = process.env.USE_MOCK_AI === 'true';
  const rawProvider = process.env.CLOUD_PROVIDER ?? 'google';

  console.log('[ReScene] ENV snapshot:', {
    CLOUD_PROVIDER: process.env.CLOUD_PROVIDER,
    USE_MOCK_AI: process.env.USE_MOCK_AI,
    AWS_REGION: process.env.AWS_REGION,
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
    PORT: process.env.PORT,
  });

  if (rawProvider !== 'google' && rawProvider !== 'aws') {
    throw new Error(
      `Invalid CLOUD_PROVIDER "${rawProvider}". Must be "google" or "aws".`,
    );
  }

  const cloudProvider: CloudProvider = rawProvider;

  if (!useMockAI && cloudProvider === 'google' && !process.env.GCP_PROJECT_ID) {
    throw new Error(
      'GCP_PROJECT_ID is required when CLOUD_PROVIDER=google and USE_MOCK_AI is not enabled.',
    );
  }

  if (!useMockAI && cloudProvider === 'aws' && !process.env.AWS_REGION) {
    throw new Error(
      'AWS_REGION is required when CLOUD_PROVIDER=aws and USE_MOCK_AI is not enabled.',
    );
  }

  return {
    cloudProvider,
    port: Number(process.env.PORT) || 8080,
    useMockAI,

    // Google Cloud
    gcpProjectId: process.env.GCP_PROJECT_ID ?? '',
    gcpLocation: process.env.GCP_LOCATION ?? 'us-central1',
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    gcsBucketName: process.env.GCS_BUCKET_NAME ?? 'rescene-images',
    imageGenModel: process.env.IMAGE_GENERATION_MODEL ?? 'gemini-2.0-flash-preview-image-generation',

    // AWS
    awsRegion: process.env.AWS_REGION ?? 'us-east-1',
    s3BucketName: process.env.S3_BUCKET_NAME ?? 'rescene-images',
    bedrockNovaModel: process.env.BEDROCK_NOVA_MODEL ?? 'us.amazon.nova-pro-v1:0',
    bedrockTitanImageModel: process.env.BEDROCK_TITAN_IMAGE_MODEL ?? 'amazon.titan-image-generator-v2:0',
  };
}
