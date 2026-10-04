import {
    buildInterviewPlanPrompt,
    INTERVIEW_PLAN_PROMPT_VERSION,
    INTERVIEW_PLAN_SYSTEM_INSTRUCTION,
} from './interview-plan.prompt';
import { planningContexts } from './interview-plan.test-fixtures';
describe('interview planning prompt', () => {
    it('uses the v4 localized realistic interview contract', () => {
        expect(INTERVIEW_PLAN_PROMPT_VERSION).toBe('interview-plan-v4');
        expect(INTERVIEW_PLAN_SYSTEM_INSTRUCTION).toContain(
            'câu hỏi chính thực sự',
        );
        expect(INTERVIEW_PLAN_SYSTEM_INSTRUCTION).toContain(
            'tiếng Việt tự nhiên, đầy đủ dấu Unicode',
        );
        expect(INTERVIEW_PLAN_SYSTEM_INSTRUCTION).toContain('50%');
        expect(INTERVIEW_PLAN_SYSTEM_INSTRUCTION).toContain(
            'không giả định kinh nghiệm công ty',
        );
    });
    it('controls technical section ordering', () =>
        expect(
            buildInterviewPlanPrompt(planningContexts.juniorWithWork),
        ).toContain(
            'INTRODUCTION -> TECHNICAL -> PROJECT_EXPERIENCE -> BEHAVIORAL_WORKING_STYLE -> CANDIDATE_QUESTIONS',
        ));
    it('carries fresher context without inventing employment', () =>
        expect(
            buildInterviewPlanPrompt(planningContexts.fresherPersonalProjects),
        ).toContain('"experienceLevel":"FRESHER"'));
    it('treats a missing JD skill as an evidence gap', () => {
        const prompt = buildInterviewPlanPrompt(
            planningContexts.missingTestingEvidence,
        );
        expect(prompt).toContain('Testing chưa có bằng chứng');
        expect(INTERVIEW_PLAN_SYSTEM_INSTRUCTION).toContain('Hỏi trung lập');
    });
    it.each(['INTERN', 'FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD'])(
        'carries the onboarding experience level %s into the planning prompt',
        (experienceLevel) => {
            const context = {
                ...planningContexts.juniorWithWork,
                candidateProfile: {
                    ...planningContexts.juniorWithWork.candidateProfile,
                    experienceLevel,
                },
            };
            expect(buildInterviewPlanPrompt(context)).toContain(
                `"experienceLevel":"${experienceLevel}"`,
            );
        },
    );
    it('protects against instructions embedded in source documents', () =>
        expect(INTERVIEW_PLAN_SYSTEM_INSTRUCTION).toContain(
            'DATA không tin cậy',
        ));
});
