import { validateEnv } from './env.config';

const validEnv = {
    FRONTEND_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/interviewly',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MAIL_HOST: 'smtp.example.com',
    MAIL_PORT: '587',
    MAIL_SECURE: 'false',
    MAIL_USER: 'mail@example.com',
    MAIL_PASSWORD: 'secret',
    MAIL_FROM: 'Interviewly <mail@example.com>',
    GOOGLE_CLIENT_ID: 'google-client',
    GOOGLE_CLIENT_SECRET: 'google-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:8000/api/v1/auth/google/callback',
    R2_ACCOUNT_ID: 'account',
    R2_ACCESS_KEY_ID: 'access',
    R2_SECRET_ACCESS_KEY: 'secret',
    R2_BUCKET_NAME: 'avatars',
    R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    R2_PUBLIC_URL: 'https://cdn.example.com',
};

describe('validateEnv', () => {
    it('preserves production mode for Secure auth cookies', () => {
        expect(
            validateEnv({ ...validEnv, NODE_ENV: 'production' }).NODE_ENV,
        ).toBe('production');
    });

    it('parses the string false as false', () => {
        expect(validateEnv(validEnv).MAIL_SECURE).toBe(false);
    });

    it('rejects short JWT secrets', () => {
        expect(() =>
            validateEnv({ ...validEnv, JWT_ACCESS_SECRET: 'short' }),
        ).toThrow('Invalid environment variables');
    });
});
