import { z } from 'zod';

const text = (max = 2_000) => z.string().trim().min(1).max(max);
export const CompetencyPrioritySchema = z.enum([
    'KEY',
    'HIGH',
    'MEDIUM',
    'LOW',
]);
export const CompetencyDepthSchema = z.enum([
    'FOUNDATION',
    'UNDERSTANDING',
    'APPLICATION',
    'TROUBLESHOOTING',
    'TRADE_OFF',
    'REAL_EXPERIENCE',
]);
export const CompetencySourceSchema = z.enum([
    'ROLE_BASELINE',
    'JD',
    'CV',
    'CV_JD_MATCH',
    'FOCUS_AREA',
]);
export const InterviewSectionTypeSchema = z.enum([
    'INTRODUCTION',
    'TECHNICAL',
    'PROJECT_EXPERIENCE',
    'BEHAVIORAL_WORKING_STYLE',
    'CANDIDATE_QUESTIONS',
]);
export const PlannedQuestionTypeSchema = z.enum([
    'GENERAL',
    'TECHNICAL',
    'PROJECT',
    'BEHAVIORAL',
    'CANDIDATE',
]);
const sourceEvidence = z
    .object({
        source: z.enum([
            'CV',
            'CV_ANALYSIS',
            'JD',
            'JD_ANALYSIS',
            'CV_JD_MATCH',
        ]),
        reference: text(300),
    })
    .strict();
const followUpStrategy = z
    .object({
        ifShallow: text(500).nullable(),
        ifStrong: text(500).nullable(),
        maxDepth: z.number().int().min(0).max(3),
    })
    .strict();
const plannedQuestion = z
    .object({
        order: z.number().int().min(1).max(30),
        type: PlannedQuestionTypeSchema,
        topic: text(150),
        competencyKey: z.string().trim().max(100).nullable().optional(),
        priority: CompetencyPrioritySchema.optional(),
        expectedDepth: z
            .enum(['FOUNDATION', 'PRACTICAL', 'TRADE_OFF', 'ARCHITECTURE'])
            .optional(),
        evidenceObjectives: z.array(text(250)).min(1).max(8).optional(),
        probeAreas: z.array(text(200)).max(8).optional(),
        // Optional in the parser so plans persisted before v6 remain readable.
        // The generation contract requires this field for every new plan.
        primaryIntent: z.string().trim().max(200).nullable().optional(),
        suggestedQuestion: text(500),
        objective: text(500),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).nullable(),
        reasonToAsk: text(500).nullable(),
        sourceEvidence: z.array(sourceEvidence).max(5),
        expectedSignals: z.array(text(250)).max(8),
        followUpStrategy,
    })
    .strict();

export const InterviewPlanResultSchema = z
    .object({
        summary: text(3_000),
        openingStrategy: text(1_500),
        difficultyStrategy: text(1_500),
        // Optional while reading plans created before interview-plan-v8.
        // The generation contract requires both fields for every new plan.
        roleBaseline: z
            .array(
                z
                    .object({
                        key: text(100),
                        name: text(150),
                        description: text(500),
                        expectedDepth: CompetencyDepthSchema,
                        rationale: text(500),
                    })
                    .strict(),
            )
            .min(2)
            .max(20)
            .optional(),
        competencyMap: z
            .array(
                z
                    .object({
                        key: text(100),
                        name: text(150),
                        sources: z.array(CompetencySourceSchema).min(1).max(5),
                        priority: CompetencyPrioritySchema,
                        expectedDepth: CompetencyDepthSchema,
                        evidenceNeeded: z.array(text(300)).min(1).max(8),
                        probeAreas: z.array(text(200)).max(8),
                        rationale: text(500),
                    })
                    .strict(),
            )
            .min(3)
            .max(30)
            .optional(),
        sections: z
            .array(
                z
                    .object({
                        type: InterviewSectionTypeSchema,
                        title: text(150),
                        objective: text(500),
                        durationMinutes: z.number().int().min(1).max(60),
                        questions: z.array(plannedQuestion).min(1).max(16),
                    })
                    .strict(),
            )
            .min(4)
            .max(5),
        strengthsToValidate: z.array(text(500)).max(20),
        gapsToProbe: z.array(text(500)).max(20),
        projectAreasToExplore: z.array(text(500)).max(20),
        behavioralCompetencies: z.array(text(300)).max(20),
        technicalCompetencies: z.array(text(300)).max(30),
        adaptationGuidance: z.array(text(500)).max(20),
    })
    .strict();

/** Strict contract for plans generated from interview-plan-v8 onward. */
export const GeneratedInterviewPlanResultSchema =
    InterviewPlanResultSchema.superRefine((plan, context) => {
        if (!plan.roleBaseline) {
            context.addIssue({
                code: 'custom',
                path: ['roleBaseline'],
                message: 'roleBaseline is required for a generated plan',
            });
        }
        if (!plan.competencyMap) {
            context.addIssue({
                code: 'custom',
                path: ['competencyMap'],
                message: 'competencyMap is required for a generated plan',
            });
        }
        for (const [sectionIndex, section] of plan.sections.entries()) {
            for (const [
                questionIndex,
                question,
            ] of section.questions.entries()) {
                const assessesCompetency = [
                    'TECHNICAL',
                    'PROJECT',
                    'BEHAVIORAL',
                ].includes(question.type);
                if (assessesCompetency && !question.competencyKey) {
                    context.addIssue({
                        code: 'custom',
                        path: [
                            'sections',
                            sectionIndex,
                            'questions',
                            questionIndex,
                            'competencyKey',
                        ],
                        message: 'competencyKey is required',
                    });
                }
                if (question.type !== 'CANDIDATE' && !question.primaryIntent) {
                    context.addIssue({
                        code: 'custom',
                        path: [
                            'sections',
                            sectionIndex,
                            'questions',
                            questionIndex,
                            'primaryIntent',
                        ],
                        message: 'primaryIntent is required',
                    });
                }
            }
        }
    });
export type InterviewPlanResult = z.infer<typeof InterviewPlanResultSchema>;
export type InterviewSectionType = z.infer<typeof InterviewSectionTypeSchema>;

export const INTERVIEW_PLAN_JSON_SCHEMA = (() => {
    const schema = z.toJSONSchema(GeneratedInterviewPlanResultSchema) as Record<
        string,
        unknown
    >;
    delete schema.$schema;
    const required = Array.isArray(schema.required)
        ? (schema.required as string[])
        : [];
    for (const field of ['roleBaseline', 'competencyMap']) {
        if (!required.includes(field)) required.push(field);
    }
    schema.required = required;
    return schema;
})();
