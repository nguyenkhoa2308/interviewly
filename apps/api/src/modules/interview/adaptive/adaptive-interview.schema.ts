import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const experienceLevel = z.enum([
    'INTERN',
    'FRESHER',
    'JUNIOR',
    'MIDDLE',
    'SENIOR',
    'LEAD',
]);

export const AdaptiveInterviewResultSchema = z
    .object({
        assessment: z
            .object({
                understanding: z.enum([
                    'STRONG',
                    'ADEQUATE',
                    'SHALLOW',
                    'WEAK',
                    'UNCLEAR',
                ]),
                relevance: z.enum([
                    'RELEVANT',
                    'PARTIALLY_RELEVANT',
                    'OFF_TOPIC',
                ]),
                confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
                evidenceSummary: text(800),
                evidenceGained: z
                    .array(
                        z
                            .object({
                                objective: text(250),
                                strength: z.enum([
                                    'CONFIRMED',
                                    'PARTIAL',
                                    'INSUFFICIENT',
                                ]),
                                detail: text(500),
                            })
                            .strict(),
                    )
                    .max(12),
                missingEvidence: z.array(text(300)).max(12),
            })
            .strict(),
        decision: z.enum([
            'NEXT',
            'FOLLOW_UP',
            'REPHRASE',
            'INCREASE_DEPTH',
            'DECREASE_DEPTH',
            'CHANGE_TOPIC',
        ]),
        reason: text(800),
        primaryIntent: text(200).nullable(),
        nextQuestion: text(500).nullable(),
        coveredPlannedQuestionKeys: z.array(text(100)).max(12),
        selectedPlannedQuestionKey: text(100).nullable(),
        probeType: z.enum([
            'MAIN_TARGET_LEVEL',
            'SAME_LEVEL_PROBE',
            'STRETCH_PROBE',
        ]),
        questionLevel: experienceLevel.nullable(),
        scoringImpact: z.enum(['TARGET_LEVEL', 'BONUS_ONLY']),
        topicSaturated: z.boolean(),
        assistanceLevel: z.enum([
            'NONE',
            'REPHRASE',
            'SIMPLIFIED',
            'LIGHT_HINT',
        ]),
    })
    .strict();

export type AdaptiveInterviewResult = z.infer<
    typeof AdaptiveInterviewResultSchema
>;

export const ADAPTIVE_INTERVIEW_JSON_SCHEMA = (() => {
    const schema = z.toJSONSchema(AdaptiveInterviewResultSchema) as Record<
        string,
        unknown
    >;
    delete schema.$schema;
    return schema;
})();
