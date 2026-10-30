import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
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

export const interviewReviewSectionSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('CRITERIA_ANALYSIS'),
        ...sectionMeta,
        data: z.object({
            criteria: z
                .array(
                    z.object({
                        id: z.string().trim().max(120).optional(),
                        name: text(200),
                        status: assessmentStatus,
                        evidence: text(1000).nullable(),
                        missing: text(1000).nullable(),
                        explanation: text(1000).nullable().optional(),
                    }),
                )
                .min(1)
                .max(10),
            overallAssessment: text(1800),
        }),
    }),
    z.object({
        type: z.literal('ANSWER_STRUCTURE'),
        ...sectionMeta,
        data: z.object({
            steps: z
                .array(z.object({
                    label: text(160),
                    guidance: text(800),
                    expectedContent: text(800).nullable().optional(),
                    speakingTimeSeconds: z.number().int().min(5).max(600).nullable().optional(),
                }))
                .min(2)
                .max(8),
        }),
    }),
    z.object({
        type: z.literal('KNOWLEDGE_EXPLANATION'),
        ...sectionMeta,
        data: z.object({
            explanation: text(1800),
            concepts: z.array(text(300)).max(8).optional(),
            keyPoints: z.array(text(600)).min(1).max(8),
            examples: z.array(text(900)).max(5).optional(),
            caveats: z.array(text(700)).max(5).optional(),
            commonMisconception: text(800).nullable(),
        }),
    }),
    z.object({
        type: z.literal('CODE_EXAMPLE'),
        ...sectionMeta,
        data: z.object({
            language: text(40),
            code: text(4000),
            explanation: text(1200),
            expectedBehavior: text(1000).nullable().optional(),
        }),
    }),
    z.object({
        type: z.literal('SCENARIO_APPROACH'),
        ...sectionMeta,
        data: z.object({
            steps: z
                .array(z.object({ label: text(160), detail: text(900) }))
                .min(2)
                .max(10),
            reasoning: text(1400).nullable().optional(),
            alternatives: z.array(z.object({
                option: text(180),
                whenToUse: text(800),
            })).max(5).optional(),
            validation: text(1000).nullable(),
        }),
    }),
    z.object({
        type: z.literal('TRADEOFF_ANALYSIS'),
        ...sectionMeta,
        data: z.object({
            options: z
                .array(
                    z.object({
                        name: text(180),
                        advantages: z.array(text(600)).max(6),
                        disadvantages: z.array(text(600)).max(6),
                        whenToUse: text(900),
                    }),
                )
                .min(2)
                .max(5),
            decisionCriteria: z.array(text(600)).max(8).optional(),
            recommendation: text(1000).nullable(),
        }),
    }),
    z.object({
        type: z.literal('STAR_ANALYSIS'),
        ...sectionMeta,
        data: z.object({
            situation: text(1000).nullable(),
            task: text(1000).nullable(),
            action: text(1200).nullable(),
            result: text(1000).nullable(),
            missingParts: z
                .array(z.enum(['SITUATION', 'TASK', 'ACTION', 'RESULT']))
                .max(4),
            contentSource: z.enum([
                'CANDIDATE_EVIDENCE',
                'GUIDANCE_PLACEHOLDER',
            ]).optional(),
        }),
    }),
    z.object({
        type: z.literal('INTERVIEWER_PERSPECTIVE'),
        ...sectionMeta,
        data: z.object({
            positiveSignals: z.array(text(700)).max(8),
            concerns: z.array(text(700)).max(8),
            likelyFollowUps: z.array(text(700)).max(8),
        }),
    }),
    z.object({
        type: z.literal('IMPROVED_ANSWER'),
        ...sectionMeta,
        data: z.object({
            answer: text(3000),
            answerType: z
                .enum(['PERSONALIZED_VERIFIED', 'ILLUSTRATIVE', 'TEMPLATE'])
                .optional(),
            improvements: z.array(text(700)).max(8).optional(),
        }),
    }),
    z.object({
        type: z.literal('ANSWER_COMPARISON'),
        ...sectionMeta,
        data: z.object({
            originalAnswer: z.string().max(10000).nullable().optional(),
            improvedAnswer: text(3000).nullable().optional(),
            changes: z
                .array(
                    z.object({
                        area: text(180),
                        original: text(1000).nullable(),
                        improved: text(1000),
                        reason: text(1000),
                    }),
                )
                .min(1)
                .max(8),
            summary: text(1200),
        }),
    }),
    z.object({
        type: z.literal('SCENARIO_ANALYSIS'),
        ...sectionMeta,
        data: z.object({
            approach: text(1600),
            considerations: z.array(text(600)).min(1).max(8),
            tradeOffs: z.array(text(600)).max(6),
        }),
    }),
]);

export const interviewReviewSectionsSchema = z
    .array(interviewReviewSectionSchema)
    .max(5);

export function parseInterviewReviewSections(value: unknown) {
    if (!Array.isArray(value)) return [];

    return value
        .slice(0, 5)
        .flatMap((section) => {
            const parsed = interviewReviewSectionSchema.safeParse(section);
            return parsed.success ? [parsed.data] : [];
        })
        .sort((left, right) => (left.order ?? 20) - (right.order ?? 20));
}
