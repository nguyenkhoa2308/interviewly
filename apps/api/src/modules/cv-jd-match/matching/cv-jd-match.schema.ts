import { z } from 'zod';

const text = (max = 2_000) => z.string().trim().min(1).max(max);
const evidenceItem = z.object({
    name: text(150),
    evidence: text(1_000),
}).strict();
const gapItem = z.object({
    name: text(150),
    importance: z.enum(['REQUIRED', 'PREFERRED']),
    explanation: text(1_000),
}).strict();
const insight = z.object({
    title: text(150),
    description: text(2_000),
    evidence: text(1_000).nullable(),
}).strict();
const recommendation = z.object({
    title: text(150),
    description: text(2_000),
    type: z.enum(['CV_CLARITY', 'PREPARE_KNOWLEDGE', 'GAIN_EXPERIENCE']),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
}).strict();
const scoreDimension = (maximum: number) => z.object({
    earned: z.number().finite().min(0).max(maximum),
    maximum: z.literal(maximum),
    reason: text(1_000),
}).strict();

export const CvJdMatchAiResultSchema = z.object({
    scoreBreakdown: z.object({
        requiredSkills: scoreDimension(40),
        preferredSkills: scoreDimension(10),
        experienceAndRole: scoreDimension(20),
        responsibilityEvidence: scoreDimension(20),
        educationAndDomain: scoreDimension(10),
    }).strict(),
    matchSummary: text(3_000),
    matchedSkills: z.array(evidenceItem).max(50),
    skillGaps: z.array(gapItem).max(50),
    strengths: z.array(insight).max(30),
    gaps: z.array(insight).max(30),
    experienceAlignment: z.object({
        summary: text(3_000),
        jdExpectation: text(1_500).nullable(),
        cvEvidence: text(1_500).nullable(),
    }).strict(),
    recommendations: z.array(recommendation).max(30),
}).strict();

export type CvJdMatchAiResult = z.infer<typeof CvJdMatchAiResultSchema>;
export type CvJdMatchResult = CvJdMatchAiResult & { matchScore: number };

export const CV_JD_MATCH_RESPONSE_JSON_SCHEMA = (() => {
    const schema = z.toJSONSchema(CvJdMatchAiResultSchema) as Record<string, unknown>;
    delete schema.$schema;
    return schema;
})();
