import { z } from 'zod';

const text = (max = 2_000) => z.string().trim().min(1).max(max);
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
        source: z.enum(['CV', 'CV_ANALYSIS', 'JD', 'JD_ANALYSIS', 'CV_JD_MATCH']),
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

export type InterviewPlanResult = z.infer<typeof InterviewPlanResultSchema>;
export type InterviewSectionType = z.infer<typeof InterviewSectionTypeSchema>;

export const INTERVIEW_PLAN_JSON_SCHEMA = (() => {
    const schema = z.toJSONSchema(InterviewPlanResultSchema) as Record<string, unknown>;
    delete schema.$schema;
    return schema;
})();
