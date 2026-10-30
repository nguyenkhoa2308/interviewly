import { Injectable } from '@nestjs/common';
import type { InterviewEvaluationAiResult } from './interview-evaluation.schema';

const WEIGHTS = { KEY: 4, HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
const COVERAGE = {
    SUFFICIENT: 1,
    PARTIAL: 0.5,
    INSUFFICIENT: 0.25,
    NOT_ASSESSED: 0,
} as const;

@Injectable()
export class InterviewEvaluationScoringService {
    calculate(result: InterviewEvaluationAiResult) {
        const totalWeight = result.competencies.reduce(
            (sum, item) => sum + WEIGHTS[item.priority],
            0,
        );
        const observed = result.competencies.filter(
            (item) => item.score !== null,
        );
        const observedWeight = observed.reduce(
            (sum, item) => sum + WEIGHTS[item.priority],
            0,
        );
        const coverage = totalWeight
            ? result.competencies.reduce(
                  (sum, item) =>
                      sum +
                      WEIGHTS[item.priority] * COVERAGE[item.coverageStatus],
                  0,
              ) / totalWeight
            : 0;
        const keyCompetencies = result.competencies.filter(
            (item) => item.priority === 'KEY',
        );
        const keyCoverage = keyCompetencies.length
            ? keyCompetencies.reduce(
                  (sum, item) => sum + COVERAGE[item.coverageStatus],
                  0,
              ) / keyCompetencies.length
            : 1;
        const canPublishScore = coverage >= 0.6 && keyCoverage >= 0.5;
        const overallScore =
            canPublishScore && observedWeight > 0
                ? observed.reduce(
                      (sum, item) =>
                          sum + (item.score ?? 0) * WEIGHTS[item.priority],
                      0,
                  ) / observedWeight
                : null;
        const hasCriticalKeyGap = result.diagnosticFindings.some(
            (item) =>
                item.severity === 'CRITICAL' &&
                result.competencies.some(
                    (competency) =>
                        competency.competencyKey === item.competencyKey &&
                        competency.priority === 'KEY',
                ),
        );
        const confidenceWeight = { HIGH: 1, MEDIUM: 0.65, LOW: 0.3 } as const;
        const evidenceConfidence = observedWeight
            ? observed.reduce(
                  (sum, item) =>
                      sum +
                      WEIGHTS[item.priority] *
                          confidenceWeight[item.confidence],
                  0,
              ) / observedWeight
            : 0;
        const confidence =
            coverage >= 0.8 && keyCoverage >= 0.75 && evidenceConfidence >= 0.8
                ? 'HIGH'
                : coverage >= 0.6 &&
                    keyCoverage >= 0.5 &&
                    evidenceConfidence >= 0.5
                  ? 'MEDIUM'
                  : 'LOW';
        const levelAssessment =
            overallScore === null
                ? 'INSUFFICIENT_EVIDENCE'
                : hasCriticalKeyGap
                  ? overallScore >= 5
                      ? 'PARTIALLY_MEETS_EXPECTATIONS'
                      : 'BELOW_EXPECTATIONS'
                  : overallScore >= 8.5
                    ? 'ABOVE_EXPECTATIONS'
                    : overallScore >= 7
                      ? 'MEETS_EXPECTATIONS'
                      : overallScore >= 5
                        ? 'PARTIALLY_MEETS_EXPECTATIONS'
                        : 'BELOW_EXPECTATIONS';
        return {
            overallScore:
                overallScore === null
                    ? null
                    : Math.round(overallScore * 100) / 100,
            coverage: Math.round(coverage * 10_000) / 10_000,
            confidence,
            levelAssessment,
        } as const;
    }
}
