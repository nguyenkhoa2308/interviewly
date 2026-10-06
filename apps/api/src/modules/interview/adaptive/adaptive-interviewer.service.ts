import { Inject, Injectable, Logger } from '@nestjs/common';

import { AiException } from '../../ai/ai.errors';
import type { AiProvider } from '../../ai/ai-provider.types';
import { AI_PROVIDER } from '../../ai/ai.tokens';
import { findQuestionStyleIssues } from '../question-style.validator';
import {
    ADAPTIVE_INTERVIEW_MAX_INPUT_CHARS,
    ADAPTIVE_INTERVIEW_PROMPT_VERSION,
    ADAPTIVE_INTERVIEW_SYSTEM_INSTRUCTION,
    buildAdaptiveInterviewPrompt,
} from './adaptive-interview.prompt';
import {
    ADAPTIVE_INTERVIEW_JSON_SCHEMA,
    AdaptiveInterviewResultSchema,
    type AdaptiveInterviewResult,
} from './adaptive-interview.schema';

@Injectable()
export class AdaptiveInterviewerService {
    private readonly logger = new Logger(AdaptiveInterviewerService.name);

    constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

    async evaluate(context: unknown) {
        const prompt = buildAdaptiveInterviewPrompt(context);
        if (prompt.length > ADAPTIVE_INTERVIEW_MAX_INPUT_CHARS) {
            throw new AiException('AI_INVALID_INPUT');
        }

        let correction = '';
        const maximumAttempts = 3;
        for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
            const response = await this.provider.generateStructured({
                systemInstruction: ADAPTIVE_INTERVIEW_SYSTEM_INSTRUCTION,
                prompt: prompt + correction,
                responseJsonSchema: ADAPTIVE_INTERVIEW_JSON_SCHEMA,
            });
            const parsed = AdaptiveInterviewResultSchema.safeParse(
                response.data,
            );
            if (!parsed.success) {
                const diagnostic = parsed.error.issues
                    .slice(0, 8)
                    .map(
                        (issue) =>
                            `${issue.path.join('.') || 'root'}:${issue.code}`,
                    )
                    .join(', ');
                this.logger.warn(
                    `Invalid adaptive interview response (attempt ${attempt}/${maximumAttempts}): ${diagnostic}`,
                );
                if (attempt === maximumAttempts) {
                    throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
                }
                correction = buildStyleCorrection(diagnostic);
                continue;
            }

            const decision = parsed.data;
            const diagnostic = validateDecision(decision);
            if (diagnostic) {
                this.logger.warn(
                    `Invalid adaptive interview decision (attempt ${attempt}/${maximumAttempts}): ${diagnostic}`,
                );
                if (attempt === maximumAttempts) {
                    throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
                }
                correction = buildStyleCorrection(diagnostic);
                continue;
            }

            return {
                result: decision,
                metadata: {
                    modelProvider: this.provider.providerName,
                    modelName: response.modelName,
                    promptVersion: ADAPTIVE_INTERVIEW_PROMPT_VERSION,
                },
            };
        }

        throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
    }
}

function validateDecision(decision: AdaptiveInterviewResult): string | null {
    const isAdaptiveProbe = !['NEXT', 'CHANGE_TOPIC'].includes(
        decision.decision,
    );
    if (
        (isAdaptiveProbe &&
            (!decision.nextQuestion ||
                decision.selectedPlannedQuestionKey !== null)) ||
        (!isAdaptiveProbe &&
            decision.nextQuestion !== null &&
            decision.selectedPlannedQuestionKey === null) ||
        (decision.probeType === 'STRETCH_PROBE' &&
            (decision.decision !== 'INCREASE_DEPTH' ||
                decision.scoringImpact !== 'BONUS_ONLY')) ||
        (decision.probeType !== 'STRETCH_PROBE' &&
            decision.scoringImpact !== 'TARGET_LEVEL')
    ) {
        return 'DECISION_CONTRACT';
    }

    if (decision.nextQuestion === null) {
        return decision.primaryIntent === null
            ? null
            : 'PRIMARY_INTENT_WITHOUT_QUESTION';
    }

    const styleIssues = findQuestionStyleIssues({
        questionText: decision.nextQuestion,
        primaryIntent: decision.primaryIntent,
        level: decision.questionLevel,
    });
    return styleIssues.length > 0
        ? `QUESTION_STYLE:${styleIssues.join('+')}`
        : null;
}

function buildStyleCorrection(diagnostic: string) {
    return `\n\nREGENERATE THE PREVIOUS DECISION:\n- Validation error: ${diagnostic}.\n- Return the complete JSON object matching the schema.\n- If nextQuestion is present, ask exactly one primaryIntent in natural spoken language. Do not repeat CV/JD text or the previous answer unnecessarily.\n- For Fresher/Junior, prefer one concise question; do not combine concept, application and reasoning.\n- If nextQuestion is null, primaryIntent must also be null.`;
}
