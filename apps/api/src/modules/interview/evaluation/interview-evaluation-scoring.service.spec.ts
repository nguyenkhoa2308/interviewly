import { InterviewEvaluationScoringService } from './interview-evaluation-scoring.service';
import type { InterviewEvaluationAiResult } from './interview-evaluation.schema';

const base = (): InterviewEvaluationAiResult => ({
    schemaVersion: 2,
    overallSummary: 'Tổng hợp có bằng chứng.',
    demonstratedStrengths: [],
    competencies: [
        {
            competencyKey: 'core',
            name: 'Năng lực cốt lõi',
            priority: 'KEY',
            score: 8,
            coverageStatus: 'SUFFICIENT',
            confidence: 'HIGH',
            summary: 'Đáp ứng tốt.',
            strengths: ['Có bằng chứng'],
            weaknesses: [],
            evidenceTurnIds: [],
        },
        {
            competencyKey: 'support',
            name: 'Năng lực hỗ trợ',
            priority: 'LOW',
            score: 4,
            coverageStatus: 'PARTIAL',
            confidence: 'MEDIUM',
            summary: 'Còn thiếu.',
            strengths: [],
            weaknesses: ['Thiếu chiều sâu'],
            evidenceTurnIds: [],
        },
    ],
    diagnosticFindings: [],
    answerReviews: [],
    recommendations: [],
    unassessedAreas: [],
    stretchAchievements: [],
});

describe('InterviewEvaluationScoringService', () => {
    const service = new InterviewEvaluationScoringService();

    it('uses competency priority weights instead of a question average', () => {
        expect(service.calculate(base()).overallScore).toBe(7.2);
    });

    it('does not turn an unassessed competency into zero', () => {
        const result = base();
        result.competencies[1] = {
            ...result.competencies[1],
            score: null,
            coverageStatus: 'NOT_ASSESSED',
        };
        expect(service.calculate(result).overallScore).toBe(8);
    });

    it('withholds the score when key coverage is insufficient', () => {
        const result = base();
        result.competencies[0] = {
            ...result.competencies[0],
            score: null,
            coverageStatus: 'NOT_ASSESSED',
        };
        const score = service.calculate(result);
        expect(score.overallScore).toBeNull();
        expect(score.levelAssessment).toBe('INSUFFICIENT_EVIDENCE');
        expect(score.confidence).toBe('LOW');
    });

    it('caps the assessment when a KEY competency has a critical gap', () => {
        const result = base();
        result.diagnosticFindings.push({
            id: 'finding-1',
            competencyKey: 'core',
            subarea: 'Core',
            category: 'MISCONCEPTION',
            evidenceStatus: 'DEMONSTRATED_GAP',
            severity: 'CRITICAL',
            observation: 'Sai khái niệm cốt lõi.',
            expectedUnderstanding: 'Hiểu đúng khái niệm.',
            explanation: 'Ảnh hưởng trực tiếp tới công việc.',
            evidenceTurnIds: [],
            improvementAction: 'Ôn lại nền tảng.',
            suggestedPractice: 'Giải bài tập thực hành.',
        });
        expect(service.calculate(result).levelAssessment).toBe(
            'PARTIALLY_MEETS_EXPECTATIONS',
        );
    });
});
