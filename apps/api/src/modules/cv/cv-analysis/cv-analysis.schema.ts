import { z } from 'zod';

import { ExperienceLevel } from '../../../generated/prisma/client';

const shortText = z.string().trim().min(1).max(150);
const nullableShortText = shortText.nullable();
const nullableDateText = z.string().trim().min(1).max(50).nullable();
const detailText = z.string().trim().min(1).max(2_000);
const nullableDetailText = detailText.nullable();

export const CvSkillSchema = z
    .object({
        name: shortText,
        category: nullableShortText,
        evidence: z.string().trim().min(1).max(500).nullable(),
    })
    .strict();

export const CvWorkExperienceSchema = z
    .object({
        company: nullableShortText,
        role: nullableShortText,
        startDate: nullableDateText,
        endDate: nullableDateText,
        description: nullableDetailText,
        technologies: z.array(shortText).max(50),
    })
    .strict();

export const CvProjectSchema = z
    .object({
        name: nullableShortText,
        description: nullableDetailText,
        technologies: z.array(shortText).max(50),
    })
    .strict();

export const CvEducationSchema = z
    .object({
        institution: nullableShortText,
        degree: nullableShortText,
        field: nullableShortText,
        startDate: nullableDateText,
        endDate: nullableDateText,
    })
    .strict();

export const CvInsightSchema = z
    .object({
        title: shortText,
        description: detailText,
        evidence: z.string().trim().min(1).max(500).nullable(),
    })
    .strict();

export const CvPotentialQuestionSchema = z
    .object({
        question: z.string().trim().min(1).max(500),
        reason: z.string().trim().min(1).max(1_000).nullable(),
        basedOn: z.string().trim().min(1).max(500).nullable(),
    })
    .strict();

export const CvSuggestionSchema = z
    .object({
        title: shortText,
        description: detailText,
        priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    })
    .strict();

export const CvAnalysisResultSchema = z
    .object({
        overallScore: z.number().finite().min(0).max(100),
        detectedRole: nullableShortText,
        detectedLevel: z.enum(ExperienceLevel).nullable(),
        extractedSkills: z.array(CvSkillSchema).max(100),
        workExperiences: z.array(CvWorkExperienceSchema).max(50),
        projects: z.array(CvProjectSchema).max(50),
        education: z.array(CvEducationSchema).max(20),
        strengths: z.array(CvInsightSchema).max(30),
        weaknesses: z.array(CvInsightSchema).max(30),
        interviewRisks: z.array(CvInsightSchema).max(30),
        potentialQuestions: z.array(CvPotentialQuestionSchema).max(50),
        suggestions: z.array(CvSuggestionSchema).max(50),
    })
    .strict();

export type CvAnalysisResult = z.infer<typeof CvAnalysisResultSchema>;

export const CV_ANALYSIS_RESPONSE_JSON_SCHEMA = (() => {
    const schema = z.toJSONSchema(CvAnalysisResultSchema) as Record<
        string,
        unknown
    >;
    delete schema.$schema;
    return schema;
})();
