import 'dotenv/config';
export type CloudProvider = 'google' | 'aws';
export interface EnvConfig {
    cloudProvider: CloudProvider;
    port: number;
    useMockAI: boolean;
    gcpProjectId: string;
    gcpLocation: string;
    geminiModel: string;
    gcsBucketName: string;
    imageGenModel: string;
    awsRegion: string;
    s3BucketName: string;
    bedrockNovaModel: string;
    bedrockTitanImageModel: string;
}
export declare function loadEnvConfig(): EnvConfig;
//# sourceMappingURL=env.d.ts.map