import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AiException } from '../../ai/ai.errors';
import type { AiProvider } from '../../ai/ai-provider.types';
import { AI_PROVIDER } from '../../ai/ai.tokens';
import { JD_CONTENT_MAX_LENGTH } from '../constants/job-description.constant';
import {
    buildJdAnalysisPrompt,
    JD_ANALYSIS_PROMPT_VERSION,
    JD_ANALYSIS_SYSTEM_INSTRUCTION,
} from './jd-analysis.prompt';
import {
    JD_ANALYSIS_RESPONSE_JSON_SCHEMA,
    JdAnalysisResultSchema,
    type JdAnalysisResult,
} from './jd-analysis.schema';

const InputSchema = z.object({
    title: z.string().trim().min(1).max(150),
    company: z.string().trim().max(150).nullable(),
    content: z.string().trim().min(1).max(JD_CONTENT_MAX_LENGTH),
});

@Injectable()
export class JdAnalyzerService {
    constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

    async analyze(input: z.infer<typeof InputSchema>): Promise<{
        result: JdAnalysisResult;
        metadata: {
            modelProvider: string;
            modelName: string;
            promptVersion: string;
        };
    }> {
        const parsedInput = InputSchema.safeParse(input);
        if (!parsedInput.success) {
            throw new AiException('AI_INVALID_INPUT', {
                cause: parsedInput.error,
            });
        }
        const response = await this.provider.generateStructured({
            systemInstruction: JD_ANALYSIS_SYSTEM_INSTRUCTION,
            prompt: buildJdAnalysisPrompt(
                parsedInput.data.title,
                parsedInput.data.company,
                parsedInput.data.content,
            ),
            responseJsonSchema: JD_ANALYSIS_RESPONSE_JSON_SCHEMA,
        });
        const result = JdAnalysisResultSchema.safeParse(response.data);
        if (!result.success) {
            throw new AiException('AI_SCHEMA_VALIDATION_FAILED', {
                cause: result.error,
            });
        }
        return {
            result: normalizeResult(result.data),
            metadata: {
                modelProvider: this.provider.providerName,
                modelName: response.modelName,
                promptVersion: JD_ANALYSIS_PROMPT_VERSION,
            },
        };
    }
}

function normalizeResult(result: JdAnalysisResult): JdAnalysisResult {
    const unique = (items: string[]) => [
        ...new Map(
            items.map((item) => [item.toLocaleLowerCase(), item]),
        ).values(),
    ];
    return {
        ...result,
        requiredSkills: unique(result.requiredSkills),
        preferredSkills: unique(result.preferredSkills),
        responsibilities: unique(result.responsibilities),
        requirements: unique(result.requirements),
        keywords: unique(result.keywords),
        interviewFocus: unique(result.interviewFocus),
        insights: unique(result.insights),
    };
}
