import { z } from 'zod';

const text = (max = 1000) => z.string().trim().min(1).max(max);
const priority = z.enum(['KEY', 'HIGH', 'MEDIUM', 'LOW']);
const confidence = z.enum(['HIGH', 'MEDIUM', 'LOW']);
const coverageStatus = z.enum([
    'SUFFICIENT',
    'PARTIAL',
    'INSUFFICIENT',
    'NOT_ASSESSED',
]);
const sectionMeta = {
    title: text(200),
    order: z.number().int().min(0).max(20).optional(),
};
const assessmentStatus = z.enum([
    'DEMONSTRATED',
    'PARTIALLY_DEMONSTRATED',
    'NOT_DEMONSTRATED',
    'INCORRECT',
    'INSUFFICIENT_EVIDENCE',
]);
const improvedAnswerType = z.enum([
    'PERSONALIZED_VERIFIED',
    'ILLUSTRATIVE',
    'TEMPLATE',
]);
const starContentSource = z.enum([
    'CANDIDATE_EVIDENCE',
    'GUIDANCE_PLACEHOLDER',
]);

export const AnswerStatusSchema = z.enum([
    'ANSWERED',
    'PARTIAL',
    'DONT_KNOW',
    'REFUSED',
    'OFF_TOPIC',
    'NO_RESPONSE',
]);

const scenarioStepSchema = z.preprocess(
    (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return value;
        }
        const item = value as Record<string, unknown>;
        return {
            label: firstString(item.label, item.title, item.step, item.action),
            detail: firstString(
                item.detail,
                item.description,
                item.guidance,
                item.reasoning,
                item.expectedOutcome,
            ),
        };
    },
    z.object({ label: text(160), detail: text(900) }).strict(),
);

const scenarioValidationSchema = z.preprocess((value) => {
    if (
        Array.isArray(value) &&
        value.every((item) => typeof item === 'string')
    ) {
        return value.join(' ');
    }
    if (value && typeof value === 'object') {
        const item = value as Record<string, unknown>;
        return firstString(
            item.detail,
            item.description,
            item.method,
            item.expectedOutcome,
        );
    }
    return value;
}, text(1000).nullable());

function firstString(...values: unknown[]) {
    return values.find(
        (value): value is string =>
            typeof value === 'string' && value.trim().length > 0,
    );
}

export const ReviewSectionSchema = z.discriminatedUnion('type', [
    z
        .object({
            type: z.literal('CRITERIA_ANALYSIS'),
            ...sectionMeta,
            data: z
                .object({
                    criteria: z
                        .array(
                            z
                                .object({
                                    id: z.string().trim().max(120).default(''),
                                    name: text(200),
                                    status: assessmentStatus,
                                    evidence: text(1000).nullable(),
                                    missing: text(1000).nullable(),
                                    explanation: text(1000)
                                        .nullable()
                                        .default(null),
                                })
                                .strict(),
                        )
                        .min(1)
                        .max(10),
                    overallAssessment: text(1800),
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('ANSWER_STRUCTURE'),
            ...sectionMeta,
            data: z
                .object({
                    steps: z
                        .array(
                            z
                                .object({
                                    label: text(160),
                                    guidance: text(800),
                                    expectedContent: text(800)
                                        .nullable()
                                        .optional(),
                                    speakingTimeSeconds: z
                                        .number()
                                        .int()
                                        .min(5)
                                        .max(600)
                                        .nullable()
                                        .optional(),
                                })
                                .strict(),
                        )
                        .min(2)
                        .max(8),
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('KNOWLEDGE_EXPLANATION'),
            ...sectionMeta,
            data: z
                .object({
                    explanation: text(1800),
                    concepts: z.array(text(300)).max(8).optional(),
                    keyPoints: z.array(text(600)).min(1).max(8),
                    examples: z.array(text(900)).max(5).optional(),
                    caveats: z.array(text(700)).max(5).optional(),
                    commonMisconception: text(800).nullable(),
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('CODE_EXAMPLE'),
            ...sectionMeta,
            data: z
                .object({
                    language: text(40),
                    code: text(4000),
                    explanation: text(1200),
                    expectedBehavior: text(1000).nullable().optional(),
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('SCENARIO_APPROACH'),
            ...sectionMeta,
            data: z
                .object({
                    steps: z.array(scenarioStepSchema).min(2).max(10),
                    reasoning: text(1400).nullable().optional(),
                    alternatives: z
                        .array(
                            z
                                .object({
                                    option: text(180),
                                    whenToUse: text(800),
                                })
                                .strict(),
                        )
                        .max(5)
                        .optional(),
                    validation: scenarioValidationSchema,
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('TRADEOFF_ANALYSIS'),
            ...sectionMeta,
            data: z
                .object({
                    options: z
                        .array(
                            z
                                .object({
                                    name: text(180),
                                    advantages: z.array(text(600)).max(6),
                                    disadvantages: z.array(text(600)).max(6),
                                    whenToUse: text(900),
                                })
                                .strict(),
                        )
                        .min(2)
                        .max(5),
                    decisionCriteria: z.array(text(600)).max(8).optional(),
                    recommendation: text(1000).nullable(),
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('STAR_ANALYSIS'),
            ...sectionMeta,
            data: z
                .object({
                    situation: text(1000).nullable(),
                    task: text(1000).nullable(),
                    action: text(1200).nullable(),
                    result: text(1000).nullable(),
                    missingParts: z
                        .array(
                            z.enum(['SITUATION', 'TASK', 'ACTION', 'RESULT']),
                        )
                        .max(4),
                    contentSource: starContentSource.optional(),
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('INTERVIEWER_PERSPECTIVE'),
            ...sectionMeta,
            data: z
                .object({
                    positiveSignals: z.array(text(700)).max(8),
                    concerns: z.array(text(700)).max(8),
                    likelyFollowUps: z.array(text(700)).max(8),
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('IMPROVED_ANSWER'),
            ...sectionMeta,
            data: z
                .object({
                    answer: text(3000),
                    answerType: improvedAnswerType.default('ILLUSTRATIVE'),
                    improvements: z.array(text(700)).max(8).optional(),
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('ANSWER_COMPARISON'),
            ...sectionMeta,
            data: z
                .object({
                    originalAnswer: z.string().max(10000).nullable().optional(),
                    improvedAnswer: text(3000).nullable().optional(),
                    changes: z
                        .array(
                            z
                                .object({
                                    area: text(180),
                                    original: text(1000).nullable(),
                                    improved: text(1000),
                                    reason: text(1000),
                                })
                                .strict(),
                        )
                        .min(1)
                        .max(8),
                    summary: text(1200),
                })
                .strict(),
        })
        .strict(),
    z
        .object({
            type: z.literal('SCENARIO_ANALYSIS'),
            ...sectionMeta,
            data: z
                .object({
                    approach: text(1600),
                    considerations: z.array(text(600)).min(1).max(8),
                    tradeOffs: z.array(text(600)).max(6),
                })
                .strict(),
        })
        .strict(),
]);
export const ReviewSectionsSchema = z.preprocess((value) => {
    if (!Array.isArray(value)) return value;

    return value.flatMap((section) => {
        const parsed = ReviewSectionSchema.safeParse(section);
        return parsed.success ? [parsed.data] : [];
    });
}, z.array(ReviewSectionSchema).max(5));
export const DiagnosticFindingSchema = z
    .object({
        id: text(100),
        competencyKey: text(100),
        subarea: text(200),
        category: z.enum([
            'KNOWLEDGE_GAP',
            'MISCONCEPTION',
            'SHALLOW_UNDERSTANDING',
            'APPLICATION_GAP',
            'PROBLEM_SOLVING_GAP',
            'EXPERIENCE_GAP',
            'COMMUNICATION_GAP',
        ]),
        evidenceStatus: z.enum([
            'DEMONSTRATED_GAP',
            'PARTIALLY_DEMONSTRATED',
            'INSUFFICIENT_EVIDENCE',
            'NOT_ASSESSED',
        ]),
        severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        observation: text(1200),
        expectedUnderstanding: text(1200),
        explanation: text(1600),
        evidenceTurnIds: z.array(z.string().uuid()).max(20),
        improvementAction: text(1200),
        suggestedPractice: text(1200),
    })
    .strict();

export const AnswerReviewSchema = z
    .object({
        turnId: z.string().uuid(),
        competencyKey: text(100).nullable(),
        answerStatus: AnswerStatusSchema.default('ANSWERED'),
        questionObjective: text(800).default(
            'Evidence required by the question.',
        ),
        evidenceQuotes: z.array(text(600)).max(6).default([]),
        correctAspects: z.array(text(600)).max(10),
        missingAspects: z.array(text(600)).max(10),
        incorrectAspects: z.array(text(600)).max(10),
        whyItMatters: text(1000),
        improvement: text(1400),
        exampleImprovedAnswer: text(2400).nullable(),
        exampleImprovedAnswerType: improvedAnswerType.nullable().default(null),
        learningObjectives: z.array(text(500)).max(6).default([]),
        reviewSections: ReviewSectionsSchema,
    })
    .strict();

export const QuestionReviewBatchSchema = z
    .object({ answerReviews: z.array(AnswerReviewSchema).min(1).max(5) })
    .strict();
export const InterviewEvaluationAiSchema = z
    .object({
        schemaVersion: z.literal(2),
        overallSummary: text(2400),
        demonstratedStrengths: z.array(text(800)).max(12),
        competencies: z
            .array(
                z
                    .object({
                        competencyKey: text(100),
                        name: text(200),
                        priority,
                        score: z.number().min(0).max(10).nullable(),
                        coverageStatus,
                        confidence,
                        summary: text(1600),
                        strengths: z.array(text(800)).max(10),
                        weaknesses: z.array(text(800)).max(10),
                        evidenceTurnIds: z.array(z.string().uuid()).max(30),
                    })
                    .strict(),
            )
            .min(1)
            .max(80),
        diagnosticFindings: z.array(DiagnosticFindingSchema).max(40),
        answerReviews: z.array(AnswerReviewSchema).max(100),

        recommendations: z
            .array(
                z
                    .object({
                        competencyKey: text(100),
                        priority,
                        topic: text(250),
                        reason: text(1200),
                        learningObjectives: z.array(text(500)).min(1).max(8),
                        suggestedExercises: z.array(text(700)).min(1).max(8),
                        expectedOutcome: text(1000),
                        relatedFindingIds: z.array(text(100)).max(12),
                    })
                    .strict(),
            )
            .max(20),
        unassessedAreas: z
            .array(
                z
                    .object({
                        competencyKey: text(100),
                        name: text(200),
                        reason: text(800),
                    })
                    .strict(),
            )
            .max(30),
        stretchAchievements: z.array(text(800)).max(10),
    })
    .strict();

export type InterviewEvaluationAiResult = z.infer<
    typeof InterviewEvaluationAiSchema
>;

export const INTERVIEW_EVALUATION_JSON_SCHEMA = (() => {
    const schema = z.toJSONSchema(InterviewEvaluationAiSchema) as Record<
        string,
        unknown
    >;
    delete schema.$schema;
    return schema;
})();

export const InterviewOverallAiSchema = InterviewEvaluationAiSchema.omit({
    answerReviews: true,
});

export const QUESTION_REVIEW_BATCH_JSON_SCHEMA = (() => {
    const schema = z.toJSONSchema(QuestionReviewBatchSchema) as Record<
        string,
        unknown
    >;
    delete schema.$schema;
    return schema;
})();

export const INTERVIEW_OVERALL_JSON_SCHEMA = (() => {
    const schema = z.toJSONSchema(InterviewOverallAiSchema) as Record<
        string,
        unknown
    >;
    delete schema.$schema;
    return schema;
})();

export type AnswerReview = z.infer<typeof AnswerReviewSchema>;
export type InterviewOverallAiResult = z.infer<typeof InterviewOverallAiSchema>;
