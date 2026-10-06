import {
    GeneratedInterviewPlanResultSchema,
    INTERVIEW_PLAN_JSON_SCHEMA,
    InterviewPlanResultSchema,
} from './interview-plan.schema';
import { makeValidTechnicalPlan } from './interview-plan.test-fixtures';
describe('InterviewPlanResultSchema', () => {
    it('accepts a complete question blueprint', () =>
        expect(
            InterviewPlanResultSchema.safeParse(makeValidTechnicalPlan())
                .success,
        ).toBe(true));
    it('keeps legacy parsing compatible but requires strategy metadata for new generation', () => {
        const legacyPlan = makeValidTechnicalPlan();
        delete legacyPlan.roleBaseline;
        delete legacyPlan.competencyMap;

        expect(InterviewPlanResultSchema.safeParse(legacyPlan).success).toBe(
            true,
        );
        expect(
            GeneratedInterviewPlanResultSchema.safeParse(legacyPlan).success,
        ).toBe(false);
    });
    it('publishes role and competency strategy as required provider fields', () => {
        expect(INTERVIEW_PLAN_JSON_SCHEMA.required).toEqual(
            expect.arrayContaining(['roleBaseline', 'competencyMap']),
        );
    });
    it('allows no competency on introductory and candidate questions', () => {
        const plan = makeValidTechnicalPlan();
        const introduction = plan.sections[0].questions[0];
        introduction.competencyKey = '';

        const closing = plan.sections.at(-1)!.questions[0];
        closing.competencyKey = '';
        closing.primaryIntent = '';

        expect(GeneratedInterviewPlanResultSchema.safeParse(plan).success).toBe(
            true,
        );

        plan.sections[1].questions[0].competencyKey = '';
        expect(GeneratedInterviewPlanResultSchema.safeParse(plan).success).toBe(
            false,
        );
    });
    it('rejects an unsupported section', () => {
        const plan = makeValidTechnicalPlan() as unknown as {
            sections: Array<{ type: string }>;
        };
        plan.sections[1].type = 'SYSTEM_DESIGN';
        expect(InterviewPlanResultSchema.safeParse(plan).success).toBe(false);
    });
    it('rejects a planned question without actual wording', () => {
        const plan = makeValidTechnicalPlan();
        plan.sections[1].questions[0].suggestedQuestion = '';
        expect(InterviewPlanResultSchema.safeParse(plan).success).toBe(false);
    });
});
