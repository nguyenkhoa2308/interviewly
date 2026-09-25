import { Inject, Injectable } from '@nestjs/common';
import { AiException } from '../../ai/ai.errors';
import type { AiProvider } from '../../ai/ai-provider.types';
import { AI_PROVIDER } from '../../ai/ai.tokens';
import {
    buildCvJdMatchPrompt,
    CV_JD_MATCH_MAX_INPUT_CHARS,
    CV_JD_MATCH_PROMPT_VERSION,
    CV_JD_MATCH_SYSTEM_INSTRUCTION,
} from './cv-jd-match.prompt';
import {
    CV_JD_MATCH_RESPONSE_JSON_SCHEMA,
    CvJdMatchAiResultSchema,
    type CvJdMatchAiResult,
    type CvJdMatchResult,
} from './cv-jd-match.schema';

@Injectable()
export class CvJdMatcherService {
    constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

    async match(input: { cv: unknown; jobDescription: unknown }): Promise<{
        result: CvJdMatchResult;
        metadata: { modelProvider: string; modelName: string; promptVersion: string };
    }> {
        const prompt = buildCvJdMatchPrompt(input);
        if (prompt.length > CV_JD_MATCH_MAX_INPUT_CHARS) {
            throw new AiException('AI_INVALID_INPUT');
        }
        const response = await this.provider.generateStructured({
            systemInstruction: CV_JD_MATCH_SYSTEM_INSTRUCTION,
            prompt,
            responseJsonSchema: CV_JD_MATCH_RESPONSE_JSON_SCHEMA,
        });
        const parsed = CvJdMatchAiResultSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new AiException('AI_SCHEMA_VALIDATION_FAILED', { cause: parsed.error });
        }
        return {
            result: withCalculatedScore(
                removeSatisfiedAlternativeGaps(parsed.data, input),
            ),
            metadata: {
                modelProvider: this.provider.providerName,
                modelName: response.modelName,
                promptVersion: CV_JD_MATCH_PROMPT_VERSION,
            },
        };
    }
}
function removeSatisfiedAlternativeGaps(
    result: CvJdMatchAiResult,
    input: { cv: unknown; jobDescription: unknown },
): CvJdMatchAiResult {
    const jdText = JSON.stringify(input.jobDescription);
    const cvEvidence = normalizeEvidence(JSON.stringify(input.cv));
    const token = '[A-Za-z][A-Za-z0-9.+#-]*';
    const expression = new RegExp(
        `(${token}(?:\\s*,\\s*${token})*\\s*(?:\\/|\\bor\\b|\\bhoặc\\b)\\s*${token}(?:\\s*(?:\\/|\\bor\\b|\\bhoặc\\b)\\s*${token})*)`,
        'gi',
    );
    const satisfiedGroups = [...jdText.matchAll(expression)]
        .map((match) => match[1].split(/\s*(?:,|\/|\bor\b|\bhoặc\b)\s*/i).filter(Boolean))
        .filter((group) => group.length > 1)
        .filter((group) => group.some((option) => cvEvidence.includes(normalizeEvidence(option))));

    if (!satisfiedGroups.length) return result;
    const belongsToSatisfiedGroup = (value: string) => {
        const normalized = normalizeEvidence(value);
        return satisfiedGroups.some((group) =>
            group.some((option) => normalized.includes(normalizeEvidence(option))),
        );
    };

    return {
        ...result,
        skillGaps: result.skillGaps.filter(
            (gap) =>
                !belongsToSatisfiedGroup(gap.name) &&
                !/đã đáp ứng|được thỏa mãn|is satisfied/i.test(gap.explanation),
        ),
        gaps: result.gaps.filter(
            (gap) =>
                !belongsToSatisfiedGroup(`${gap.title} ${gap.description}`),
        ),
    };
}

function normalizeEvidence(value: string): string {
    return value.toLocaleLowerCase().replace(/[^a-z0-9+#]/g, '');
}

function withCalculatedScore(result: CvJdMatchAiResult): CvJdMatchResult {
    const total = Object.values(result.scoreBreakdown).reduce(
        (sum, dimension) => sum + dimension.earned,
        0,
    );
    return {
        ...result,
        matchScore: Math.round(total * 100) / 100,
    };
}
