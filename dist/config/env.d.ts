import 'dotenv/config';
export interface EnvConfig {
    gcpProjectId: string;
    gcpLocation: string;
    geminiModel: string;
    port: number;
    useMockAI: boolean;
}
export declare function loadEnvConfig(): EnvConfig;
//# sourceMappingURL=env.d.ts.map