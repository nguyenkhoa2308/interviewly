import { z } from 'zod';

const envSchema = z.object({
    PORT: z.coerce.number().default(8000),
    FRONTEND_URL: z.string().url(),
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