import { z } from 'zod';

const envSchema = z.object({
    PORT: z.coerce.number().default(8000),
    FRONTEND_URL: z.string().url(),
    DATABASE_URL: z.string().url(),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),

    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
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
