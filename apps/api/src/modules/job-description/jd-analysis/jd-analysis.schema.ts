import { z } from 'zod';

const cleanString = z.string().trim().min(1).max(2_000);
const stringList = z.array(cleanString).max(50);

export const JdAnalysisResultSchema = z
    .object({
        detectedRole: z.string().trim().min(1).max(150).nullable(),
        seniority: z.string().trim().min(1).max(100).nullable(),
        summary: z.string().trim().min(1).max(3_000).nullable(),
        requiredSkills: stringList,
        preferredSkills: stringList,
        responsibilities: stringList,
        requirements: stringList,
        keywords: stringList,
        interviewFocus: stringList,
        insights: stringList,
    })
    .strict();

export type JdAnalysisResult = z.infer<typeof JdAnalysisResultSchema>;

export const JD_ANALYSIS_RESPONSE_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'detectedRole',
        'seniority',
        'summary',
        'requiredSkills',
        'preferredSkills',
        'responsibilities',
        'requirements',
        'keywords',
        'interviewFocus',
        'insights',
    ],
    properties: {
        detectedRole: { type: ['string', 'null'] },
        seniority: { type: ['string', 'null'] },
        summary: { type: ['string', 'null'] },
        requiredSkills: { type: 'array', items: { type: 'string' } },
        preferredSkills: { type: 'array', items: { type: 'string' } },
        responsibilities: { type: 'array', items: { type: 'string' } },
        requirements: { type: 'array', items: { type: 'string' } },
        keywords: { type: 'array', items: { type: 'string' } },
        interviewFocus: { type: 'array', items: { type: 'string' } },
        insights: { type: 'array', items: { type: 'string' } },
    },
} as const;
