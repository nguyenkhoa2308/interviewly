import { jest } from '@jest/globals';
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
            'YÊU CẦU SỬA LẦN TẠO TRƯỚC',
        );
    });
});
