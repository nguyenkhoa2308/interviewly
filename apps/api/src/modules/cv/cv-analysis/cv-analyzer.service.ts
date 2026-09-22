import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { AiException } from '../../ai/ai.errors';
import type { AiProvider } from '../../ai/ai-provider.types';
import { AI_PROVIDER } from '../../ai/ai.tokens';
import {
    buildCvAnalysisPrompt,
    CV_ANALYSIS_MAX_INPUT_CHARS,
    CV_ANALYSIS_PROMPT_VERSION,
    CV_ANALYSIS_SYSTEM_INSTRUCTION,
} from './cv-analysis.prompt';
import {
    CV_ANALYSIS_RESPONSE_JSON_SCHEMA,
    CvAnalysisResultSchema,
    type CvAnalysisResult,
} from './cv-analysis.schema';

const CvAnalyzerInputSchema = z
    .object({
        extractedText: z
            .string()
            .trim()
            .min(1)
            .max(CV_ANALYSIS_MAX_INPUT_CHARS),
    })
    .strict();

export interface CvAnalyzerInput {
    extractedText: string;
}

export interface CvAnalyzerOutput {
    result: CvAnalysisResult;
    metadata: {
        modelProvider: string;
        modelName: string;
        promptVersion: string;
    };
}

@Injectable()
export class CvAnalyzerService {
    constructor(@Inject(AI_PROVIDER) private readonly aiProvider: AiProvider) {}

    async analyze(input: CvAnalyzerInput): Promise<CvAnalyzerOutput> {
        const parsedInput = CvAnalyzerInputSchema.safeParse(input);
        if (!parsedInput.success) {
            throw new AiException('AI_INVALID_INPUT', {
                cause: parsedInput.error,
            });
        }

        const providerResult = await this.aiProvider.generateStructured({
            systemInstruction: CV_ANALYSIS_SYSTEM_INSTRUCTION,
            prompt: buildCvAnalysisPrompt(parsedInput.data.extractedText),
            responseJsonSchema: CV_ANALYSIS_RESPONSE_JSON_SCHEMA,
        });
        const parsedResult = CvAnalysisResultSchema.safeParse(
            providerResult.data,
        );

        if (!parsedResult.success) {
            throw new AiException('AI_SCHEMA_VALIDATION_FAILED', {
                cause: parsedResult.error,
            });
        }

        return {
            result: {
                ...parsedResult.data,
                extractedSkills: this.deduplicateSkills(
                    parsedResult.data.extractedSkills,
                ),
            },
            metadata: {
                modelProvider: this.aiProvider.providerName,
                modelName: providerResult.modelName,
                promptVersion: CV_ANALYSIS_PROMPT_VERSION,
            },
        };
    }

    private deduplicateSkills(
        skills: CvAnalysisResult['extractedSkills'],
    ): CvAnalysisResult['extractedSkills'] {
        const seen = new Set<string>();

        return skills.filter((skill) => {
            const key = `${skill.name.toLocaleLowerCase()}:${skill.category?.toLocaleLowerCase() ?? ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
