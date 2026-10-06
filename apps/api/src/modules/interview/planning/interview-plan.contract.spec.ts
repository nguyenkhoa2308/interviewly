import { AiException } from '../../ai/ai.errors';
import {
    assertConfiguredQuestionCount,
    getQuestionPoolRange,
    validateInterviewPlanContract,
} from './interview-plan.contract';
import { makeValidTechnicalPlan } from './interview-plan.test-fixtures';
describe('interview plan product contract', () => {
    it('accepts controlled technical order and coherent timing', () =>
        expect(
            validateInterviewPlanContract(
                makeValidTechnicalPlan(),
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                { hasProjectEvidence: true },
            ),
        ).toBeDefined());
    it('keeps introduction small', () => {
        const p = makeValidTechnicalPlan();
        p.sections[0].questions.push({
            ...p.sections[0].questions[0],
            order: 2,
        });
        expect(() =>
            validateInterviewPlanContract(
                p,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 9,
                },
                { hasProjectEvidence: true },
            ),
        ).toThrow(AiException);
    });
    it('requires candidate questions as the closing section', () => {
        const p = makeValidTechnicalPlan();
        p.sections.reverse();
        expect(() =>
            validateInterviewPlanContract(
                p,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                { hasProjectEvidence: true },
            ),
        ).toThrow(AiException);
    });
    it('validates question count independently from duration', () => {
        expect(() => assertConfiguredQuestionCount(2)).toThrow(AiException);
        expect(() => assertConfiguredQuestionCount(31)).toThrow(AiException);
        expect(() => assertConfiguredQuestionCount(14)).not.toThrow();
    });
    it('treats questionCount as a soft target when competency coverage is complete', () => {
        const plan = makeValidTechnicalPlan();
        expect(
            plan.sections.flatMap((section) => section.questions),
        ).toHaveLength(8);
        expect(() =>
            validateInterviewPlanContract(
                plan,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 12,
                },
                { hasProjectEvidence: true },
            ),
        ).not.toThrow();
    });
    it('rejects incoherent duration allocation', () => {
        const p = makeValidTechnicalPlan();
        p.sections[1].durationMinutes = 20;
        expect(() =>
            validateInterviewPlanContract(
                p,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                { hasProjectEvidence: true },
            ),
        ).toThrow(AiException);
    });
    it('requires a project question when evidence exists', () => {
        const p = makeValidTechnicalPlan();
        p.sections[2].questions = p.sections[2].questions.map((q) => ({
            ...q,
            type: 'GENERAL',
        }));
        expect(() =>
            validateInterviewPlanContract(
                p,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                { hasProjectEvidence: true },
            ),
        ).toThrow(AiException);
    });
    it('rejects a plan when a KEY competency has no meaningful coverage', () => {
        const plan = makeValidTechnicalPlan();
        plan.competencyMap!.push({
            key: 'missing-key',
            name: 'Năng lực quan trọng bị thiếu',
            sources: ['JD'],
            priority: 'KEY',
            expectedDepth: 'APPLICATION',
            evidenceNeeded: ['Bằng chứng áp dụng thực tế.'],
            probeAreas: [],
            rationale: 'JD coi đây là yêu cầu bắt buộc.',
        });
        expect(() =>
            validateInterviewPlanContract(
                plan,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                { hasProjectEvidence: true, hasCvEvidence: true },
            ),
        ).toThrow(AiException);
    });

    it('keeps role fundamentals when JD and CV personalize the map', () => {
        const plan = makeValidTechnicalPlan();
        expect(plan.roleBaseline).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'role-foundations' }),
            ]),
        );
        expect(plan.competencyMap).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'role-foundations',
                    sources: expect.arrayContaining(['ROLE_BASELINE', 'JD']),
                }),
                expect.objectContaining({
                    key: 'project-ownership',
                    sources: expect.arrayContaining(['CV']),
                }),
            ]),
        );
        expect(() =>
            validateInterviewPlanContract(
                plan,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                { hasProjectEvidence: true, hasCvEvidence: true },
            ),
        ).not.toThrow();
    });

    it('validates a non-technical competency map without Frontend assumptions', () => {
        const plan = makeValidTechnicalPlan();
        plan.roleBaseline = [
            {
                key: 'customer-discovery',
                name: 'Khám phá nhu cầu',
                description: 'Hiểu nhu cầu khách hàng.',
                expectedDepth: 'APPLICATION',
                rationale: 'Nền tảng của Sales.',
            },
            {
                key: 'communication',
                name: 'Giao tiếp',
                description: 'Truyền đạt rõ ràng.',
                expectedDepth: 'REAL_EXPERIENCE',
                rationale: 'Cần cho Sales.',
            },
        ];
        plan.competencyMap = [
            {
                key: 'customer-discovery',
                name: 'Khám phá nhu cầu',
                sources: ['ROLE_BASELINE', 'JD'],
                priority: 'KEY',
                expectedDepth: 'APPLICATION',
                evidenceNeeded: ['Cách xác định nhu cầu.'],
                probeAreas: ['discovery'],
                rationale: 'Năng lực chính.',
            },
            {
                key: 'deal-execution',
                name: 'Thực thi cơ hội',
                sources: ['CV', 'JD'],
                priority: 'KEY',
                expectedDepth: 'REAL_EXPERIENCE',
                evidenceNeeded: ['Đóng góp trong một cơ hội thực tế.'],
                probeAreas: ['ownership'],
                rationale: 'Cá nhân hóa từ CV.',
            },
            {
                key: 'communication',
                name: 'Giao tiếp',
                sources: ['ROLE_BASELINE', 'JD'],
                priority: 'HIGH',
                expectedDepth: 'REAL_EXPERIENCE',
                evidenceNeeded: ['Giao tiếp với khách hàng.'],
                probeAreas: ['objection'],
                rationale: 'Yêu cầu công việc.',
            },
        ];
        for (const section of plan.sections) {
            for (const question of section.questions) {
                if (question.type === 'CANDIDATE') continue;
                question.competencyKey =
                    question.type === 'PROJECT'
                        ? 'deal-execution'
                        : question.type === 'TECHNICAL'
                          ? question.order === 2
                              ? 'customer-discovery'
                              : 'communication'
                          : 'communication';
            }
        }
        expect(() =>
            validateInterviewPlanContract(
                plan,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                { hasProjectEvidence: true, hasCvEvidence: true },
            ),
        ).not.toThrow();
    });
    it('requires two distinct question angles for a prioritized matched skill', () => {
        const plan = makeValidTechnicalPlan();
        expect(() =>
            validateInterviewPlanContract(
                plan,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                {
                    hasProjectEvidence: true,
                    hasCvEvidence: true,
                    requiredTechnicalSkills: ['ReactJS'],
                },
            ),
        ).toThrow(AiException);
    });
    it('rejects a technical plan that drops a matched CV/JD skill', () => {
        const plan = makeValidTechnicalPlan();
        plan.sections[1].questions[1].probeAreas = ['React lifecycle'];
        expect(() =>
            validateInterviewPlanContract(
                plan,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                {
                    hasProjectEvidence: true,
                    hasCvEvidence: true,
                    requiredTechnicalSkills: ['ReactJS', 'Next.js'],
                },
            ),
        ).toThrow(AiException);
    });
    it('expands a 60-minute runtime target into a larger adaptive pool', () => {
        expect(
            getQuestionPoolRange({ durationMinutes: 60, questionCount: 14 }),
        ).toEqual({ minimum: 18, maximum: 24 });
        expect(() =>
            validateInterviewPlanContract(
                makeValidTechnicalPlan(),
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 60,
                    questionCount: 14,
                },
                { hasProjectEvidence: true },
            ),
        ).toThrow(AiException);
    });
});
