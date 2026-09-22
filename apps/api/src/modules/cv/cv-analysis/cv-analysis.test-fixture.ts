import { ExperienceLevel } from '../../../generated/prisma/client';

export function createValidAnalysisResult() {
    return {
        overallScore: 72,
        detectedRole: 'Backend Developer',
        detectedLevel: ExperienceLevel.JUNIOR,
        extractedSkills: [
            { name: 'NestJS', category: 'Backend', evidence: 'Skills' },
        ],
        workExperiences: [
            {
                company: 'Example Co',
                role: 'Backend Developer',
                startDate: '2024',
                endDate: null,
                description: 'Developed APIs.',
                technologies: ['NestJS'],
            },
        ],
        projects: [
            {
                name: 'Interviewly',
                description: 'Interview preparation platform.',
                technologies: ['TypeScript'],
            },
        ],
        education: [
            {
                institution: 'Example University',
                degree: 'Bachelor',
                field: 'Computer Science',
                startDate: '2020',
                endDate: '2024',
            },
        ],
        strengths: [
            {
                title: 'Backend foundation',
                description: 'Shows practical API experience.',
                evidence: 'NestJS project',
            },
        ],
        weaknesses: [
            {
                title: 'Missing metrics',
                description: 'Impact is not quantified.',
                evidence: null,
            },
        ],
        interviewRisks: [
            {
                title: 'Depth validation',
                description: 'Validate ownership of the project.',
                evidence: 'Project summary',
            },
        ],
        potentialQuestions: [
            {
                question: 'How did you design the API?',
                reason: 'Validate system design depth.',
                basedOn: 'Interviewly project',
            },
        ],
        suggestions: [
            {
                title: 'Add metrics',
                description: 'Quantify project outcomes.',
                priority: 'HIGH' as const,
            },
        ],
    };
}
