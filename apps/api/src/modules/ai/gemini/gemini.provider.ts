import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiError, GoogleGenAI } from '@google/genai';

import { AiException } from '../ai.errors';
import type {
    AiProvider,
    GenerateStructuredRequest,
    GenerateStructuredResult,
} from '../ai-provider.types';
import { GEMINI_CLIENT } from '../ai.tokens';

@Injectable()
export class GeminiProvider implements AiProvider {
    readonly providerName = 'GEMINI';
    readonly modelName: string;
    private readonly models: string[];
    private readonly timeoutMs: number;

    constructor(
        @Inject(GEMINI_CLIENT) private readonly client: GoogleGenAI,
        configService: ConfigService,
    ) {
        this.modelName = configService.getOrThrow<string>('GEMINI_MODEL');
        this.models = [
            this.modelName,
            ...configService
                .getOrThrow<string>('GEMINI_FALLBACK_MODELS')
                .split(',')
                .map((model) => model.trim())
                .filter(Boolean),
        ].filter((model, index, models) => models.indexOf(model) === index);
        this.timeoutMs = configService.getOrThrow<number>(
            'AI_REQUEST_TIMEOUT_MS',
        );
    }

    async generateStructured(
        request: GenerateStructuredRequest,
    ): Promise<GenerateStructuredResult> {
        let lastError: AiException | undefined;

        for (const [index, model] of this.models.entries()) {
            try {
                return await this.generateWithModel(request, model);
            } catch (error) {
                const aiError =
                    error instanceof AiException
                        ? error
                        : this.mapProviderError(error);
                lastError = aiError;

                const hasNextModel = index < this.models.length - 1;
                if (!hasNextModel || !this.canFallback(aiError)) throw aiError;
            }
        }

        throw lastError ?? new AiException('AI_PROVIDER_ERROR');
    }

    private async generateWithModel(
        request: GenerateStructuredRequest,
        model: string,
    ): Promise<GenerateStructuredResult> {
        try {
            const response = await this.client.models.generateContent({
                model,
                contents: request.prompt,
                config: {
                    systemInstruction: request.systemInstruction,
                    responseMimeType: 'application/json',
                    responseJsonSchema: toGeminiResponseJsonSchema(
                        request.responseJsonSchema,
                    ),
                    temperature: 0.1,
                    maxOutputTokens: 8_192,
                    httpOptions: {
                        timeout: this.timeoutMs,
                        retryOptions: { attempts: 1 },
                    },
                },
            });

            const text = response.text?.trim();
            if (!text) throw new AiException('AI_EMPTY_RESPONSE');

            try {
                return {
                    data: JSON.parse(text) as unknown,
                    modelName: model,
                };
            } catch (error) {
                throw new AiException('AI_INVALID_RESPONSE', { cause: error });
            }
        } catch (error) {
            if (error instanceof AiException) throw error;
            throw this.mapProviderError(error);
        }
    }

    private canFallback(error: AiException): boolean {
        return new Set([
            'AI_RATE_LIMITED',
            'AI_TIMEOUT',
            'AI_PROVIDER_ERROR',
            'AI_EMPTY_RESPONSE',
            'AI_INVALID_RESPONSE',
        ]).has(error.code);
    }

    private mapProviderError(error: unknown): AiException {
        if (error instanceof ApiError) {
            if (error.status === 429) {
                return new AiException('AI_RATE_LIMITED', { cause: error });
            }
            if (error.status === 408 || error.status === 504) {
                return new AiException('AI_TIMEOUT', { cause: error });
            }
            if (
                error.status === 400 ||
                error.status === 401 ||
                error.status === 403 ||
                error.status === 404
            ) {
                return new AiException('AI_CONFIGURATION_ERROR', {
                    cause: error,
                });
            }
        }

        if (
            error instanceof Error &&
            (error.name === 'TimeoutError' ||
                error.name === 'AbortError' ||
                /timed?\s*out/i.test(error.message))
        ) {
            return new AiException('AI_TIMEOUT', { cause: error });
        }

        return new AiException('AI_PROVIDER_ERROR', { cause: error });
    }
}

const UNSUPPORTED_GEMINI_JSON_SCHEMA_KEYWORDS = new Set([
    'minLength',
    'maxLength',
    'maxItems',
]);

function toGeminiResponseJsonSchema(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(toGeminiResponseJsonSchema);
    }

    if (typeof value !== 'object' || value === null) return value;

    return Object.fromEntries(
        Object.entries(value)
            .filter(
                ([key]) => !UNSUPPORTED_GEMINI_JSON_SCHEMA_KEYWORDS.has(key),
            )
            .map(([key, nestedValue]) => [
                key,
                toGeminiResponseJsonSchema(nestedValue),
            ]),
    );
}
