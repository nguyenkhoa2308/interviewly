import { z } from 'zod';

const envSchema = z
    .object({
        NODE_ENV: z
            .enum(['development', 'test', 'production'])
            .default('development'),
        PORT: z.coerce.number().default(8000),
        FRONTEND_URL: z.string().url(),
        DATABASE_URL: z.string().url(),

        JWT_ACCESS_SECRET: z.string().min(32),
        JWT_REFRESH_SECRET: z.string().min(32),

        JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

        MAIL_HOST: z.string().min(1),
        MAIL_PORT: z.coerce.number(),
        MAIL_SECURE: z.preprocess(
            (value) =>
                typeof value === 'string'
                    ? value.trim().toLowerCase() === 'true'
                    : value,
            z.boolean(),
        ),
        MAIL_USER: z.string().email(),
        MAIL_PASSWORD: z.string().min(1),
        MAIL_FROM: z.string().min(1),

        GOOGLE_CLIENT_ID: z.string().min(1),
        GOOGLE_CLIENT_SECRET: z.string().min(1),
        GOOGLE_CALLBACK_URL: z.string().url(),

        R2_ACCOUNT_ID: z.string().min(1),
        R2_ACCESS_KEY_ID: z.string().min(1),
        R2_SECRET_ACCESS_KEY: z.string().min(1),
        R2_BUCKET_NAME: z.string().min(1),
        R2_PRIVATE_BUCKET_NAME: z.string().min(1),
        R2_ENDPOINT: z.url(),
        R2_PUBLIC_URL: z.string().url(),

        AI_PROVIDER: z.enum(['GEMINI']).default('GEMINI'),
        GEMINI_API_KEY: z.string().min(1),
        GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
        GEMINI_FALLBACK_MODELS: z
            .string()
            .default('gemini-3.5-flash-lite,gemini-3.1-flash-lite'),
        CV_ANALYSIS_DAILY_LIMIT: z.coerce.number().int().min(1).default(10),
        JD_ANALYSIS_DAILY_LIMIT: z.coerce.number().int().min(1).default(10),
        CV_JD_MATCH_DAILY_LIMIT: z.coerce.number().int().min(1).default(10),
        AI_REQUEST_TIMEOUT_MS: z.coerce
            .number()
            .int()
            .min(1_000)
            .max(120_000)
            .default(30_000),
    })
    .refine((env) => env.R2_BUCKET_NAME !== env.R2_PRIVATE_BUCKET_NAME, {
        message: 'R2 public and private buckets must be different',
        path: ['R2_PRIVATE_BUCKET_NAME'],
    });

export function validateEnv(config: Record<string, unknown>) {
    const result = envSchema.safeParse(config);

    if (!result.success) {
        throw new Error(
            `Invalid environment variables: ${result.error.message}`,
        );
    }

    return result.data;
}
