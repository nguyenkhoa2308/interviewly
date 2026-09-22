import type { ConfigService } from '@nestjs/config';
import { ApiError, type GoogleGenAI } from '@google/genai';
import { jest } from '@jest/globals';

import { GeminiProvider } from './gemini.provider';

describe('GeminiProvider', () => {
    const generateContent = jest.fn<GoogleGenAI['models']['generateContent']>();
    const client = {
        models: { generateContent },
    } as unknown as GoogleGenAI;
    const configService = {
        getOrThrow: jest.fn((key: string) => {
            if (key === 'GEMINI_MODEL') return 'gemini-primary';
            if (key === 'GEMINI_FALLBACK_MODELS') {
                return 'gemini-fallback-1,gemini-fallback-2';
            }
            return 12_345;
        }),
    } as unknown as ConfigService;
    let provider: GeminiProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        provider = new GeminiProvider(client, configService);
    });

    it('uses native JSON output, timeout and no automatic retries', async () => {
        generateContent.mockResolvedValue({ text: '{"ok":true}' } as never);

        await expect(
            provider.generateStructured({
                systemInstruction: 'system',
                prompt: 'prompt',
                responseJsonSchema: { type: 'object' },
            }),
        ).resolves.toEqual({
            data: { ok: true },
            modelName: 'gemini-primary',
        });

        expect(generateContent).toHaveBeenCalledWith({
            model: 'gemini-primary',
            contents: 'prompt',
            config: expect.objectContaining({
                systemInstruction: 'system',
                responseMimeType: 'application/json',
                responseJsonSchema: { type: 'object' },
                httpOptions: {
                    timeout: 12_345,
                    retryOptions: { attempts: 1 },
                },
            }),
        });
    });

    it('falls back once a retryable model error occurs', async () => {
        generateContent
            .mockRejectedValueOnce(
                new ApiError({ status: 429, message: 'primary quota' }),
            )
            .mockResolvedValueOnce({ text: '{"ok":true}' } as never);

        await expect(
            provider.generateStructured({
                systemInstruction: 'system',
                prompt: 'prompt',
                responseJsonSchema: { type: 'object' },
            }),
        ).resolves.toEqual({
            data: { ok: true },
            modelName: 'gemini-fallback-1',
        });
        expect(generateContent).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ model: 'gemini-fallback-1' }),
        );
    });

    it('does not fallback for configuration errors', async () => {
        generateContent.mockRejectedValue(
            new ApiError({ status: 400, message: 'invalid schema' }),
        );

        await expect(
            provider.generateStructured({
                systemInstruction: 'system',
                prompt: 'prompt',
                responseJsonSchema: {},
            }),
        ).rejects.toMatchObject({ code: 'AI_CONFIGURATION_ERROR' });
        expect(generateContent).toHaveBeenCalledTimes(1);
    });

    it('removes unsupported validation keywords from Gemini schema only', async () => {
        generateContent.mockResolvedValue({
            text: '{"name":"NestJS"}',
        } as never);
        const applicationSchema = {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 150,
                },
                skills: {
                    type: 'array',
                    items: { type: 'string' },
                    maxItems: 100,
                },
                score: { type: 'number', minimum: 0, maximum: 100 },
            },
            required: ['name', 'skills', 'score'],
            additionalProperties: false,
        };

        await provider.generateStructured({
            systemInstruction: 'system',
            prompt: 'prompt',
            responseJsonSchema: applicationSchema,
        });

        const sentSchema =
            generateContent.mock.calls[0][0].config?.responseJsonSchema;
        expect(sentSchema).toEqual({
            type: 'object',
            properties: {
                name: { type: 'string' },
                skills: {
                    type: 'array',
                    items: { type: 'string' },
                },
                score: { type: 'number', minimum: 0, maximum: 100 },
            },
            required: ['name', 'skills', 'score'],
            additionalProperties: false,
        });
        expect(applicationSchema.properties.name).toEqual({
            type: 'string',
            minLength: 1,
            maxLength: 150,
        });
    });

    it('maps an empty response', async () => {
        generateContent.mockResolvedValue({ text: '   ' } as never);

        await expect(
            provider.generateStructured({
                systemInstruction: 'system',
                prompt: 'prompt',
                responseJsonSchema: {},
            }),
        ).rejects.toMatchObject({ code: 'AI_EMPTY_RESPONSE' });
    });

    it('maps malformed JSON without exposing raw content', async () => {
        generateContent.mockResolvedValue({ text: 'not-json secret' } as never);

        await expect(
            provider.generateStructured({
                systemInstruction: 'system',
                prompt: 'prompt',
                responseJsonSchema: {},
            }),
        ).rejects.toMatchObject({
            code: 'AI_INVALID_RESPONSE',
            message: 'Dịch vụ AI trả về dữ liệu không hợp lệ.',
        });
    });

    it.each([
        [429, 'AI_RATE_LIMITED'],
        [408, 'AI_TIMEOUT'],
        [504, 'AI_TIMEOUT'],
        [400, 'AI_CONFIGURATION_ERROR'],
        [401, 'AI_CONFIGURATION_ERROR'],
        [403, 'AI_CONFIGURATION_ERROR'],
        [404, 'AI_CONFIGURATION_ERROR'],
        [500, 'AI_PROVIDER_ERROR'],
    ] as const)('maps provider status %s to %s', async (status, code) => {
        generateContent.mockRejectedValue(
            new ApiError({ status, message: 'provider secret' }),
        );

        await expect(
            provider.generateStructured({
                systemInstruction: 'system',
                prompt: 'private CV',
                responseJsonSchema: {},
            }),
        ).rejects.toMatchObject({ code });
    });

    it('maps SDK timeout errors', async () => {
        const timeoutError = new Error('Request timed out');
        timeoutError.name = 'TimeoutError';
        generateContent.mockRejectedValue(timeoutError);

        await expect(
            provider.generateStructured({
                systemInstruction: 'system',
                prompt: 'private CV',
                responseJsonSchema: {},
            }),
        ).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
    });
});
