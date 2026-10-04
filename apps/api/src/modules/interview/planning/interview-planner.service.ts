import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AiException } from '../../ai/ai.errors';
import type { AiProvider } from '../../ai/ai-provider.types';
import { AI_PROVIDER } from '../../ai/ai.tokens';
import {
    assertConfiguredQuestionCount,
    validateInterviewPlanContract,
} from './interview-plan.contract';
import {
    buildInterviewPlanPrompt,
    INTERVIEW_PLAN_MAX_INPUT_CHARS,
    INTERVIEW_PLAN_PROMPT_VERSION,
    INTERVIEW_PLAN_SYSTEM_INSTRUCTION,
} from './interview-plan.prompt';
import {
    INTERVIEW_PLAN_JSON_SCHEMA,
    InterviewPlanResultSchema,
} from './interview-plan.schema';

const contextContract = z
    .object({
        configuration: z
            .object({
                interviewType: z.string(),
                durationMinutes: z.number().int(),
                questionCount: z.number().int(),
            })
            .passthrough(),
        cv: z
            .object({
                analysis: z
                    .object({
                        projects: z.unknown().optional(),
                        workExperiences: z.unknown().optional(),
                    })
                    .passthrough(),
            })
            .passthrough(),
    })
    .passthrough();

@Injectable()
export class InterviewPlannerService {
    private readonly logger = new Logger(InterviewPlannerService.name);

    constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

    async generate(context: unknown) {
        const trusted = contextContract.safeParse(context);
        if (!trusted.success) throw new AiException('AI_INVALID_INPUT');

        const { configuration } = trusted.data;
        assertConfiguredQuestionCount(
            configuration.durationMinutes,
            configuration.questionCount,
        );

        const prompt = buildInterviewPlanPrompt(context);
        if (prompt.length > INTERVIEW_PLAN_MAX_INPUT_CHARS)
            throw new AiException('AI_INVALID_INPUT');

        const hasProjectEvidence =
            hasItems(trusted.data.cv.analysis.projects) ||
            hasItems(trusted.data.cv.analysis.workExperiences);
        let correction = '';

        for (let attempt = 1; attempt <= 2; attempt += 1) {
            const response = await this.provider.generateStructured({
                systemInstruction: INTERVIEW_PLAN_SYSTEM_INSTRUCTION,
                prompt: prompt + correction,
                responseJsonSchema: INTERVIEW_PLAN_JSON_SCHEMA,
            });
            const parsed = InterviewPlanResultSchema.safeParse(response.data);

            if (!parsed.success) {
                const diagnostic = parsed.error.issues
                    .slice(0, 8)
                    .map(
                        (issue) =>
                            `${issue.path.join('.') || 'root'}:${issue.code}`,
                    )
                    .join(', ');
                this.logger.warn(
                    `Interview plan schema validation failed (attempt ${attempt}/2): ${diagnostic}`,
                );
                if (attempt === 2)
                    throw new AiException('AI_SCHEMA_VALIDATION_FAILED', {
                        cause: parsed.error,
                    });
                correction = buildCorrection(configuration, diagnostic);
                continue;
            }

            try {
                const result = validateInterviewPlanContract(
                    parsed.data,
                    configuration,
                    { hasProjectEvidence },
                );
                return {
                    result,
                    metadata: {
                        modelProvider: this.provider.providerName,
                        modelName: response.modelName,
                        promptVersion: INTERVIEW_PLAN_PROMPT_VERSION,
                    },
                };
            } catch (error) {
                if (!(error instanceof AiException)) throw error;
                const diagnostic =
                    error.cause instanceof Error
                        ? error.cause.message
                        : 'CONTRACT_MISMATCH';
                this.logger.warn(
                    `Interview plan contract validation failed (attempt ${attempt}/2): ${diagnostic}`,
                );
                if (attempt === 2) throw error;
                correction = buildCorrection(configuration, diagnostic);
            }
        }

        throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
    }
}

function buildCorrection(
    configuration: { durationMinutes: number; questionCount: number },
    diagnostic: string,
) {
    return `\n\nYÊU CẦU SỬA LẦN TẠO TRƯỚC:\n- Lỗi: ${diagnostic}.\n- Hãy tạo lại toàn bộ JSON từ đầu.\n- Chính xác ${configuration.questionCount} câu hỏi, order liên tục từ 1 đến ${configuration.questionCount}.\n- Tổng durationMinutes của các section phải chính xác ${configuration.durationMinutes}.\n- Không bỏ thiếu field bắt buộc; field nullable phải trả null thay vì bỏ field.\n`;
}

function hasItems(value: unknown): boolean {
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
}
