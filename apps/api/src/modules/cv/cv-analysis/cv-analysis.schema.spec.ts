import { CvAnalysisResultSchema } from './cv-analysis.schema';
import { createValidAnalysisResult } from './cv-analysis.test-fixture';

describe('CvAnalysisResultSchema', () => {
    it('accepts a valid structured result', () => {
        expect(
            CvAnalysisResultSchema.safeParse(createValidAnalysisResult())
                .success,
        ).toBe(true);
    });

    it.each([0, 100])('accepts boundary score %s', (overallScore) => {
        expect(
            CvAnalysisResultSchema.safeParse({
                ...createValidAnalysisResult(),
                overallScore,
            }).success,
        ).toBe(true);
    });

    it.each([-0.01, 100.01, Number.NaN])(
        'rejects invalid score %s',
        (overallScore) => {
            expect(
                CvAnalysisResultSchema.safeParse({
                    ...createValidAnalysisResult(),
                    overallScore,
                }).success,
            ).toBe(false);
        },
    );

    it('rejects an unknown detected level', () => {
        expect(
            CvAnalysisResultSchema.safeParse({
                ...createValidAnalysisResult(),
                detectedLevel: 'SUPER_SENIOR',
            }).success,
        ).toBe(false);
    });

    it.each([
        ['extractedSkills', [{ name: 123 }]],
        ['workExperiences', [{ company: 'A' }]],
        ['projects', [{ name: 'A', technologies: 'TypeScript' }]],
        ['education', [{ institution: [] }]],
        ['strengths', ['strong']],
        ['weaknesses', [{ title: '', description: 'Missing title' }]],
        ['interviewRisks', [{ title: 'Risk' }]],
        ['potentialQuestions', [{ question: 123 }]],
        ['suggestions', [{ title: 'Improve', priority: 'URGENT' }]],
    ] as const)('rejects malformed %s', (field, value) => {
        expect(
            CvAnalysisResultSchema.safeParse({
                ...createValidAnalysisResult(),
                [field]: value,
            }).success,
        ).toBe(false);
    });

    it('rejects unknown top-level fields', () => {
        expect(
            CvAnalysisResultSchema.safeParse({
                ...createValidAnalysisResult(),
                inventedField: 'not allowed',
            }).success,
        ).toBe(false);
    });
});
