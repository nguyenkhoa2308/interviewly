import { jest } from '@jest/globals';
import { AiException } from '../../ai/ai.errors';
import type { AiProvider } from '../../ai/ai-provider.types';
import {
    makeValidTechnicalPlan,
    planningContexts,
} from './interview-plan.test-fixtures';
import { InterviewPlannerService } from './interview-planner.service';

describe('InterviewPlannerService', () => {
    it('retries once with validation feedback when the provider returns an invalid plan', async () => {
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockResolvedValueOnce({
                data: { summary: 'Thiếu phần bắt buộc' },
                modelName: 'test-model',
            })
            .mockResolvedValueOnce({
                data: makeValidTechnicalPlan(),
                modelName: 'test-model',
            });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;

        const result = await new InterviewPlannerService(provider).generate(
            planningContexts.juniorWithWork,
        );

        expect(result.result.sections).toHaveLength(5);
        expect(generateStructured).toHaveBeenCalledTimes(2);
        expect(generateStructured.mock.calls[1][0].prompt).toContain(
            'REGENERATE THE PREVIOUS PLAN',
        );
    });

    it('regenerates a Junior plan when a question combines independent intents', async () => {
        const invalidPlan = makeValidTechnicalPlan();
        invalidPlan.sections[1].questions[0] = {
            ...invalidPlan.sections[1].questions[0],
            primaryIntent: 'Kiểm tra useEffect và dependency array',
            suggestedQuestion:
                'Bạn thường xử lý side effect như thế nào và khi nào cần dùng dependency array trong useEffect?',
        };
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockResolvedValueOnce({
                data: invalidPlan,
                modelName: 'test-model',
            })
            .mockResolvedValueOnce({
                data: makeValidTechnicalPlan(),
                modelName: 'test-model',
            });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;

        const output = await new InterviewPlannerService(provider).generate(
            planningContexts.juniorWithWork,
        );

        expect(output.result.sections[1].questions[0].suggestedQuestion).toBe(
            'Trong React bạn thường quản lý state như thế nào?',
        );
        expect(generateStructured).toHaveBeenCalledTimes(2);
        expect(generateStructured.mock.calls[1][0].prompt).toContain(
            'QUESTION_STYLE:2:COMPOUND_QUESTION',
        );
    });
    it('uses a deterministic single-intent repair when the provider repeats the same compound question', async () => {
        const invalidPlan = makeValidTechnicalPlan();
        invalidPlan.sections[1].questions[0] = {
            ...invalidPlan.sections[1].questions[0],
            suggestedQuestion:
                'Bạn xử lý side effect như thế nào và khi nào cần dùng dependency array?',
        };
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockResolvedValue({
                data: invalidPlan,
                modelName: 'test-model',
            });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;

        const output = await new InterviewPlannerService(provider).generate(
            planningContexts.juniorWithWork,
        );

        expect(generateStructured).toHaveBeenCalledTimes(3);
        expect(output.result.sections[1].questions[0].suggestedQuestion).toBe(
            'Bạn xử lý side effect như thế nào?',
        );
    });
    it('normalizes the candidate closing section without spending an AI retry', async () => {
        const plan = makeValidTechnicalPlan();
        const closing = plan.sections.at(-1)!;
        closing.questions[0].type = 'GENERAL';
        closing.questions[0].difficulty = 'EASY';
        closing.questions.push({
            ...structuredClone(closing.questions[0]),
            order: 9,
        });
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockResolvedValue({ data: plan, modelName: 'test-model' });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;

        const output = await new InterviewPlannerService(provider).generate(
            planningContexts.juniorWithWork,
        );
        const repairedClosing = output.result.sections.at(-1)!;

        expect(generateStructured).toHaveBeenCalledTimes(1);
        expect(repairedClosing.questions).toHaveLength(1);
        expect(repairedClosing.questions[0]).toMatchObject({
            type: 'CANDIDATE',
            difficulty: null,
            order: 8,
        });
    });
    it('returns a valid near-target fallback when later expansion attempts regress', async () => {
        const nearTargetPlan = makeValidTechnicalPlan();
        nearTargetPlan.sections.forEach((section) => {
            section.durationMinutes *= 2;
        });
        const technical = nearTargetPlan.sections[1];
        const seed = structuredClone(technical.questions[0]);
        for (let index = 0; index < 5; index += 1) {
            technical.questions.push({
                ...structuredClone(seed),
                order: 9 + index,
                competencyKey:
                    index % 2 === 0 ? 'data-flow' : 'role-foundations',
                primaryIntent: `Additional technical evidence ${index + 1}`,
                suggestedQuestion: `Câu hỏi kỹ thuật bổ sung số ${index + 1}?`,
            });
        }
        const invalidDraft = { summary: 'invalid retry' };
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockResolvedValueOnce({
                data: nearTargetPlan,
                modelName: 'test-model',
            })
            .mockResolvedValue({
                data: invalidDraft,
                modelName: 'test-model',
            });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;
        const context = {
            ...planningContexts.juniorWithWork,
            configuration: {
                ...planningContexts.juniorWithWork.configuration,
                durationMinutes: 60,
                questionCount: 14,
            },
        };

        const output = await new InterviewPlannerService(provider).generate(
            context,
        );

        expect(generateStructured).toHaveBeenCalledTimes(3);
        expect(
            output.result.sections.flatMap((section) => section.questions),
        ).toHaveLength(13);
    });
    it('retries a regenerated plan when assessment intents are too similar', async () => {
        const original = makeValidTechnicalPlan();
        const varied = structuredClone(original);
        const assessmentQuestions = original.sections
            .filter(
                (section) =>
                    section.type !== 'INTRODUCTION' &&
                    section.type !== 'CANDIDATE_QUESTIONS',
            )
            .flatMap((section) => section.questions);
        const variedAssessmentQuestions = varied.sections
            .filter(
                (section) =>
                    section.type !== 'INTRODUCTION' &&
                    section.type !== 'CANDIDATE_QUESTIONS',
            )
            .flatMap((section) => section.questions);
        variedAssessmentQuestions.forEach((question, index) => {
            question.primaryIntent = `Alternative evidence goal ${index + 1}`;
        });
        const context = {
            ...planningContexts.juniorWithWork,
            regeneration: {
                previousPrimaryIntents: assessmentQuestions.flatMap(
                    (question) =>
                        question.primaryIntent ? [question.primaryIntent] : [],
                ),
                minimumNewPrimaryIntentRatio: 0.5,
            },
        };
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockResolvedValueOnce({
                data: original,
                modelName: 'test-model',
            })
            .mockResolvedValueOnce({
                data: varied,
                modelName: 'test-model',
            });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;

        const output = await new InterviewPlannerService(provider).generate(
            context,
        );

        expect(output.result.sections).toHaveLength(5);
        expect(generateStructured).toHaveBeenCalledTimes(2);
        expect(generateStructured.mock.calls[1][0].prompt).toContain(
            'REGENERATION_TOO_SIMILAR',
        );
    });
    it('accumulates diagnostics and repairs the latest draft instead of starting over', async () => {
        const firstDraft = { summary: 'first invalid draft' };
        const secondDraft = makeValidTechnicalPlan();
        secondDraft.summary = 'second invalid draft';
        secondDraft.roleBaseline = undefined;
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockResolvedValueOnce({
                data: firstDraft,
                modelName: 'test-model',
            })
            .mockResolvedValueOnce({
                data: secondDraft,
                modelName: 'test-model',
            })
            .mockResolvedValueOnce({
                data: makeValidTechnicalPlan(),
                modelName: 'test-model',
            });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;

        await new InterviewPlannerService(provider).generate(
            planningContexts.juniorWithWork,
        );

        const finalPrompt = generateStructured.mock.calls[2][0].prompt;
        expect(finalPrompt).toContain('ALL accumulated validation errors');
        expect(finalPrompt).toContain('openingStrategy:invalid_type');
        expect(finalPrompt).toContain('roleBaseline:custom');
        expect(finalPrompt).toContain('second invalid draft');
        expect(finalPrompt).toContain('<latest_draft_to_repair>');
    });

    it('retries a transient provider failure within the planner budget', async () => {
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockRejectedValueOnce(new AiException('AI_PROVIDER_ERROR'))
            .mockResolvedValueOnce({
                data: makeValidTechnicalPlan(),
                modelName: 'fallback-model',
            });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;

        const output = await new InterviewPlannerService(provider).generate(
            planningContexts.juniorWithWork,
        );

        expect(generateStructured).toHaveBeenCalledTimes(2);
        expect(output.metadata.modelName).toBe('fallback-model');
    });
    it('repairs equivalent baseline and competency keys deterministically', async () => {
        const plan = makeValidTechnicalPlan();
        plan.roleBaseline![0].key = 'ROLE_FOUNDATIONS';
        plan.competencyMap![0].sources = ['JD'];
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockResolvedValue({ data: plan, modelName: 'test-model' });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;

        const output = await new InterviewPlannerService(provider).generate(
            planningContexts.juniorWithWork,
        );

        expect(output.result.roleBaseline![0].key).toBe('role-foundations');
        expect(output.result.competencyMap![0].sources).toContain(
            'ROLE_BASELINE',
        );
        expect(generateStructured).toHaveBeenCalledTimes(1);
    });

    it('repairs a missing assessment competency key before strict validation', async () => {
        const plan = makeValidTechnicalPlan();
        plan.sections[3].questions[0].competencyKey = null;
        const generateStructured = jest
            .fn<AiProvider['generateStructured']>()
            .mockResolvedValue({ data: plan, modelName: 'test-model' });
        const provider = {
            providerName: 'TEST',
            modelName: 'test-model',
            generateStructured,
        } satisfies AiProvider;

        const output = await new InterviewPlannerService(provider).generate(
            planningContexts.juniorWithWork,
        );

        expect(
            output.result.sections[3].questions[0].competencyKey,
        ).toBeTruthy();
        expect(generateStructured).toHaveBeenCalledTimes(1);
    });
});
