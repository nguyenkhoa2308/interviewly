import { AiException } from '../../ai/ai.errors';
import {
    assertConfiguredQuestionCount,
    getQuestionPoolRange,
    validateInterviewPlanContract,
} from './interview-plan.contract';
import { makeValidTechnicalPlan } from './interview-plan.test-fixtures';
import { getRequiredRoleBaselines } from './role-baseline.catalog';
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
            name: 'NÄƒng lá»±c quan trá»ng bá»‹ thiáº¿u',
            sources: ['JD'],
            priority: 'KEY',
            expectedDepth: 'APPLICATION',
            evidenceNeeded: ['Báº±ng chá»©ng Ã¡p dá»¥ng thá»±c táº¿.'],
            probeAreas: [],
            rationale: 'JD coi Ä‘Ã¢y lÃ  yÃªu cáº§u báº¯t buá»™c.',
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
                name: 'KhÃ¡m phÃ¡ nhu cáº§u',
                description: 'Hiá»ƒu nhu cáº§u khÃ¡ch hÃ ng.',
                expectedDepth: 'APPLICATION',
                rationale: 'Ná»n táº£ng cá»§a Sales.',
            },
            {
                key: 'communication',
                name: 'Giao tiáº¿p',
                description: 'Truyá»n Ä‘áº¡t rÃµ rÃ ng.',
                expectedDepth: 'REAL_EXPERIENCE',
                rationale: 'Cáº§n cho Sales.',
            },
        ];
        plan.competencyMap = [
            {
                key: 'customer-discovery',
                name: 'KhÃ¡m phÃ¡ nhu cáº§u',
                sources: ['ROLE_BASELINE', 'JD'],
                priority: 'KEY',
                expectedDepth: 'APPLICATION',
                evidenceNeeded: ['CÃ¡ch xÃ¡c Ä‘á»‹nh nhu cáº§u.'],
                probeAreas: ['discovery'],
                rationale: 'NÄƒng lá»±c chÃ­nh.',
            },
            {
                key: 'deal-execution',
                name: 'Thá»±c thi cÆ¡ há»™i',
                sources: ['CV', 'JD'],
                priority: 'KEY',
                expectedDepth: 'REAL_EXPERIENCE',
                evidenceNeeded: ['ÄÃ³ng gÃ³p trong má»™t cÆ¡ há»™i thá»±c táº¿.'],
                probeAreas: ['ownership'],
                rationale: 'CÃ¡ nhÃ¢n hÃ³a tá»« CV.',
            },
            {
                key: 'communication',
                name: 'Giao tiáº¿p',
                sources: ['ROLE_BASELINE', 'JD'],
                priority: 'HIGH',
                expectedDepth: 'REAL_EXPERIENCE',
                evidenceNeeded: ['Giao tiáº¿p vá»›i khÃ¡ch hÃ ng.'],
                probeAreas: ['objection'],
                rationale: 'YÃªu cáº§u cÃ´ng viá»‡c.',
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
    it('accepts one planned coverage question per matched skill because runtime follow-ups provide depth', () => {
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
        ).not.toThrow();
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
    it('rejects a Frontend plan that never asks its required foundations', () => {
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
                    requiredRoleBaselines: getRequiredRoleBaselines(
                        'Frontend Developer',
                        'TECHNICAL',
                    ),
                },
            ),
        ).toThrow(AiException);
    });

    it('accepts focused JavaScript, responsive and React questions for a Frontend plan', () => {
        const plan = makeValidTechnicalPlan();
        const roleFoundations = plan.competencyMap!.find(
            (item) => item.key === 'role-foundations',
        )!;
        roleFoundations.priority = 'HIGH';
        plan.roleBaseline!.push(
            {
                key: 'javascript-core',
                name: 'JavaScript Core',
                description: 'Ná»n táº£ng JavaScript báº¯t buá»™c cho Frontend.',
                expectedDepth: 'APPLICATION',
                rationale:
                    'Frontend cáº§n hiá»ƒu JavaScript Ä‘á»™c láº­p vá»›i framework.',
            },
            {
                key: 'html-css-responsive',
                name: 'HTML, CSS vÃ  Responsive Design',
                description: 'Ná»n táº£ng giao diá»‡n responsive.',
                expectedDepth: 'APPLICATION',
                rationale: 'Frontend cáº§n xÃ¢y dá»±ng giao diá»‡n Ä‘a thiáº¿t bá»‹.',
            },
            {
                key: 'react-core',
                name: 'React Core',
                description: 'React fundamentals for Frontend work.',
                expectedDepth: 'APPLICATION',
                rationale: 'Frontend needs component and state fundamentals.',
            },
        );
        plan.competencyMap!.push(
            {
                key: 'javascript-core',
                name: 'JavaScript Core',
                sources: ['ROLE_BASELINE'],
                priority: 'KEY',
                expectedDepth: 'APPLICATION',
                evidenceNeeded: [
                    'Giáº£i thÃ­ch closure hoáº·c event loop trong JavaScript.',
                ],
                probeAreas: ['JavaScript', 'closure', 'event loop'],
                rationale: 'NÄƒng lá»±c ná»n báº¯t buá»™c cá»§a Frontend.',
            },
            {
                key: 'html-css-responsive',
                name: 'HTML, CSS vÃ  Responsive Design',
                sources: ['ROLE_BASELINE'],
                priority: 'KEY',
                expectedDepth: 'APPLICATION',
                evidenceNeeded: ['Giáº£i thÃ­ch cÃ¡ch dÃ¹ng media query.'],
                probeAreas: ['HTML', 'CSS', 'responsive', 'media query'],
                rationale: 'NÄƒng lá»±c ná»n báº¯t buá»™c cá»§a Frontend.',
            },
            {
                key: 'react-core',
                name: 'React Core',
                sources: ['ROLE_BASELINE'],
                priority: 'KEY',
                expectedDepth: 'APPLICATION',
                evidenceNeeded: ['Explain when a React component re-renders.'],
                probeAreas: ['React', 'component', 'state', 'render'],
                rationale: 'Core React capability.',
            },
        );
        Object.assign(plan.sections[1].questions[0], {
            competencyKey: 'javascript-core',
            topic: 'JavaScript',
            primaryIntent: 'Kiá»ƒm tra hiá»ƒu biáº¿t vá» closure trong JavaScript',
            suggestedQuestion: 'Closure trong JavaScript lÃ  gÃ¬?',
            objective: 'ÄÃ¡nh giÃ¡ ná»n táº£ng JavaScript.',
            probeAreas: ['closure'],
        });
        Object.assign(plan.sections[1].questions[1], {
            competencyKey: 'html-css-responsive',
            topic: 'Responsive CSS',
            primaryIntent: 'Kiá»ƒm tra cÃ¡ch xÃ¢y dá»±ng giao diá»‡n responsive',
            suggestedQuestion: 'Media query trong CSS cÃ³ tÃ¡c dá»¥ng gÃ¬?',
            objective: 'ÄÃ¡nh giÃ¡ ná»n táº£ng responsive.',
            probeAreas: ['media query'],
        });
        Object.assign(plan.sections[1].questions[2], {
            competencyKey: 'react-core',
            topic: 'React component',
            primaryIntent: 'Check when a React component re-renders',
            suggestedQuestion: 'When does a React component re-render?',
            objective: 'Assess React fundamentals.',
            probeAreas: ['state', 'render'],
        });

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
                    requiredRoleBaselines: getRequiredRoleBaselines(
                        'Frontend Developer',
                        'TECHNICAL',
                    ),
                },
            ),
        ).not.toThrow();

        const falseJavaScriptCoverage = structuredClone(plan);
        Object.assign(falseJavaScriptCoverage.sections[1].questions[0], {
            topic: 'JavaScript & TypeScript',
            primaryIntent: 'Compare interface and type in TypeScript',
            suggestedQuestion: 'interface vÃ  type khÃ¡c nhau nhÆ° tháº¿ nÃ o?',
            objective: 'Assess TypeScript type modelling.',
            probeAreas: ['interface', 'type'],
        });
        expect(() =>
            validateInterviewPlanContract(
                falseJavaScriptCoverage,
                {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
                {
                    hasProjectEvidence: true,
                    requiredRoleBaselines: getRequiredRoleBaselines(
                        'Frontend Developer',
                        'TECHNICAL',
                    ),
                },
            ),
        ).toThrow(AiException);
    });
});
