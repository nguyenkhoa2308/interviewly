import type { Prisma } from '../../../generated/prisma/client';
import type { CvAnalysisResult } from './cv-analysis.schema';

export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => (item === null ? null : toPrismaJson(item)));
    }

    if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                item === null ? null : toPrismaJson(item),
            ]),
        );
    }

    throw new TypeError('Giá trị không thể chuyển thành Prisma JSON.');
}

export function mapAnalysisResultToPrisma(result: CvAnalysisResult) {
    return {
        overallScore: result.overallScore,
        detectedRole: result.detectedRole,
        detectedLevel: result.detectedLevel,
        extractedSkills: toPrismaJson(result.extractedSkills),
        workExperiences: toPrismaJson(result.workExperiences),
        projects: toPrismaJson(result.projects),
        education: toPrismaJson(result.education),
        strengths: toPrismaJson(result.strengths),
        weaknesses: toPrismaJson(result.weaknesses),
        interviewRisks: toPrismaJson(result.interviewRisks),
        potentialQuestions: toPrismaJson(result.potentialQuestions),
        suggestions: toPrismaJson(result.suggestions),
    };
}
