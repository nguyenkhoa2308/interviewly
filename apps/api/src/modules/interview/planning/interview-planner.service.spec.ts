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
