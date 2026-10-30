import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiException } from '../../ai/ai.errors';
import type { AiProvider } from '../../ai/ai-provider.types';
import { AI_PROVIDER } from '../../ai/ai.tokens';
import {
    buildInterviewEvaluationPrompt,
    buildOverallEvaluationPrompt,
    buildQuestionReviewPrompt,
    INTERVIEW_EVALUATION_PROMPT_VERSION,
    INTERVIEW_EVALUATION_SYSTEM_INSTRUCTION,
    OVERALL_EVALUATION_PROMPT_VERSION,
    QUESTION_REVIEW_PROMPT_VERSION,
} from './interview-evaluation.prompt';
import {
    INTERVIEW_EVALUATION_JSON_SCHEMA,
    INTERVIEW_OVERALL_JSON_SCHEMA,
    InterviewEvaluationAiSchema,
    InterviewOverallAiSchema,
    QUESTION_REVIEW_BATCH_JSON_SCHEMA,
    QuestionReviewBatchSchema,
    type AnswerReview,
    type InterviewEvaluationAiResult,
} from './interview-evaluation.schema';

@Injectable()
export class InterviewEvaluatorService {
    private readonly logger = new Logger(InterviewEvaluatorService.name);
    constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

    async evaluateQuestionReviews(context: EvaluationContext) {
        // Smaller batches leave the model enough output budget to produce the
        // criterion-level teaching content required by the review UI.
        const batches = chunk(context.turns, 3);
        const answerReviews: AnswerReview[] = [];
        let modelName = '';

        for (const turns of batches) {
            const batchContext = { ...context, turns };
            const prompt = buildQuestionReviewPrompt(batchContext);
            let correction = '';
            let completed = false;

            for (let attempt = 1; attempt <= 3; attempt += 1) {
                const response = await this.provider.generateStructured({
                    systemInstruction: INTERVIEW_EVALUATION_SYSTEM_INSTRUCTION,
                    prompt: prompt + correction,
                    responseJsonSchema: QUESTION_REVIEW_BATCH_JSON_SCHEMA,
                    temperature: 0.2,
                    maxOutputTokens: 16_384,
                    timeoutMs: 90_000,
                });
                const parsed = QuestionReviewBatchSchema.safeParse(
                    response.data,
                );
                const expectedIds = new Set(turns.map((turn) => turn.id));
                const actualIds = parsed.success
                    ? parsed.data.answerReviews.map((review) => review.turnId)
                    : [];
                const validSet =
                    parsed.success &&
                    actualIds.length === expectedIds.size &&
                    new Set(actualIds).size === actualIds.length &&
                    actualIds.every((id) => expectedIds.has(id));
                const technicalTurnIds = new Set(
                    turns
                        .filter((turn) => turn.questionType === 'TECHNICAL')
                        .map((turn) => turn.id),
                );
                const missingCodeExampleIds = parsed.success
                    ? parsed.data.answerReviews
                          .filter(
                              (review) =>
                                  technicalTurnIds.has(review.turnId) &&
                                  !review.reviewSections.some(
                                      (section) =>
                                          section.type === 'CODE_EXAMPLE',
                                  ),
                          )
                          .map((review) => review.turnId)
                    : [];
                const validTechnicalExamples =
                    parsed.success && missingCodeExampleIds.length === 0;

                if (parsed.success && validSet && validTechnicalExamples) {
                    answerReviews.push(...parsed.data.answerReviews);
                    modelName = response.modelName;
                    completed = true;
                    break;
                }

                const diagnostic = parsed.success
                    ? !validSet
                        ? 'ANSWER_REVIEW_BATCH_SET'
                        : `MISSING_TECHNICAL_CODE_EXAMPLE:${missingCodeExampleIds.join('|')}`
                    : parsed.error.issues
                          .slice(0, 10)
                          .map(
                              (issue) =>
                                  `${issue.path.join('.')}:${issue.code}`,
                          )
                          .join(',');
                this.logger.warn(
                    `Question review batch validation failed (${attempt}/3): ${diagnostic}`,
                );
                if (attempt === 3) {
                    throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
                }
                correction = `\n\nPrevious output was invalid: ${diagnostic}. Regenerate this batch only and return exactly the supplied turn IDs. Every TECHNICAL turn must include exactly one valid CODE_EXAMPLE section.`;
            }

            if (!completed) {
                throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
            }
        }

        return {
            result: { schemaVersion: 1 as const, answerReviews },
            metadata: {
                modelProvider: this.provider.providerName,
                modelName,
                promptVersion: QUESTION_REVIEW_PROMPT_VERSION,
            },
        };
    }

    async evaluateOverall(
        context: EvaluationContext,
        answerReviews: AnswerReview[],
    ) {
        const overallContext = {
            ...context,
            turns: context.turns.map((turn) => ({
                id: turn.id,
                competencyKey: turn.competencyKey,
                scoringImpact: turn.scoringImpact,
                probeType: turn.probeType,
                rootPlannedQuestionKey: turn.rootPlannedQuestionKey,
            })),
            questionReviews: answerReviews,
        };
        const prompt = buildOverallEvaluationPrompt(overallContext);
        let correction = '';

        for (let attempt = 1; attempt <= 3; attempt += 1) {
            const response = await this.provider.generateStructured({
                systemInstruction: INTERVIEW_EVALUATION_SYSTEM_INSTRUCTION,
                prompt: prompt + correction,
                responseJsonSchema: INTERVIEW_OVERALL_JSON_SCHEMA,
                temperature: 0.2,
                maxOutputTokens: 12_288,
                timeoutMs: 90_000,
            });
            const parsed = InterviewOverallAiSchema.safeParse(response.data);
            const combined = parsed.success
                ? ({
                      ...parsed.data,
                      answerReviews,
                  } satisfies InterviewEvaluationAiResult)
                : null;
            const normalized = combined
                ? normalizeEvidenceSemantics(
                      repairAnswerReviewSet(combined, context),
                      context,
                  )
                : null;
            const diagnostic = normalized
                ? validateContract(normalized, context)
                : !parsed.success
                  ? parsed.error.issues
                        .slice(0, 10)
                        .map((issue) => `${issue.path.join('.')}:${issue.code}`)
                        .join(',')
                  : 'NORMALIZATION_FAILED';

            if (normalized && !diagnostic) {
                return {
                    result: normalized,
                    metadata: {
                        modelProvider: this.provider.providerName,
                        modelName: response.modelName,
                        promptVersion: OVERALL_EVALUATION_PROMPT_VERSION,
                    },
                };
            }

            this.logger.warn(
                `Overall evaluation validation failed (${attempt}/3): ${diagnostic}`,
            );
            if (attempt === 3) {
                throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
            }
            correction = `\n\nPrevious output was invalid: ${diagnostic}. Regenerate the overall report only. Keep the supplied questionReviews unchanged.`;
        }

        throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
    }
    async evaluate(context: EvaluationContext) {
        const prompt = buildInterviewEvaluationPrompt(context);
        let correction = '';
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            const response = await this.provider.generateStructured({
                systemInstruction: INTERVIEW_EVALUATION_SYSTEM_INSTRUCTION,
                prompt: prompt + correction,
                responseJsonSchema: INTERVIEW_EVALUATION_JSON_SCHEMA,
                temperature: 0.2,
                maxOutputTokens: 16_384,
                // Full-session reports are substantially larger than realtime
                // AI requests and regularly need longer than the global 30s.
                timeoutMs: 90_000,
            });
            const parsed = InterviewEvaluationAiSchema.safeParse(response.data);
            const normalized = parsed.success
                ? normalizeEvidenceSemantics(
                      repairAnswerReviewSet(parsed.data, context),
                      context,
                  )
                : null;
            const diagnostic = normalized
                ? validateContract(normalized, context)
                : !parsed.success
                  ? parsed.error.issues
                        .slice(0, 10)
                        .map((issue) => `${issue.path.join('.')}:${issue.code}`)
                        .join(',')
                  : 'NORMALIZATION_FAILED';
            if (normalized && !diagnostic) {
                return {
                    result: normalized,
                    metadata: {
                        modelProvider: this.provider.providerName,
                        modelName: response.modelName,
                        promptVersion: INTERVIEW_EVALUATION_PROMPT_VERSION,
                    },
                };
            }
            this.logger.warn(
                `Evaluation validation failed (${attempt}/3): ${diagnostic}`,
            );
            if (attempt === 3)
                throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
            correction = `\n\nYour previous output was invalid: ${diagnostic}. Regenerate the complete JSON. Preserve all required competencies and answered turns.`;
        }
        throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
    }
}

export interface EvaluationContext {
    preferredLanguage: 'VI' | 'EN';
    interviewId: string;
    sessionId: string;
    interviewType: string;
    targetRole: string;
    targetLevel: string | null;
    completedAt: string;
    historicalContext: unknown;
    rubric: unknown;
    competencyMap: Array<{
        key: string;
        name: string;
        priority: string;
        expectedDepth: string;
        evidenceNeeded: string[];
        probeAreas: string[];
        sources: string[];
    }>;
    turns: Array<{
        id: string;
        runtimeOrder: number;
        rootPlannedQuestionKey: string;
        parentTurnId: string | null;
        coveredByTurnId: string | null;
        origin: string;
        competencyKey: string | null;
        sectionIndex: number;

        sectionTitle: string;

        questionType: string;

        topic: string | null;
        questionText: string;
        answerText: string;
        probeType: string;
        scoringImpact: string;
        assistanceLevel: string;
        adaptiveAction: string | null;
        coverageEvidence: unknown;
        answerAssessment: unknown;
        authoritativeObjective: string | null;
        evaluationCriteria: string[];
    }>;
}

function chunk<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        result.push(items.slice(index, index + size));
    }
    return result;
}
function validateContract(
    result: InterviewEvaluationAiResult,
    context: EvaluationContext,
) {
    const expected = new Map(
        context.competencyMap.map((item) => [item.key, item]),
    );
    const expectedKeys = new Set(expected.keys());
    const actualKeys = result.competencies.map((item) => item.competencyKey);
    if (
        actualKeys.length !== expectedKeys.size ||
        new Set(actualKeys).size !== actualKeys.length ||
        actualKeys.some((key) => !expectedKeys.has(key))
    )
        return 'COMPETENCY_SET';

    const turnIds = new Set(context.turns.map((turn) => turn.id));
    const turnById = new Map(context.turns.map((turn) => [turn.id, turn]));
    if (
        result.answerReviews.length !== turnIds.size ||
        new Set(result.answerReviews.map((item) => item.turnId)).size !==
            result.answerReviews.length ||
        result.answerReviews.some((item) => !turnIds.has(item.turnId))
    )
        return 'ANSWER_REVIEW_SET';
    if (
        result.answerReviews.some(
            (item) =>
                item.competencyKey !== null &&
                !expectedKeys.has(item.competencyKey),
        )
    )
        return 'ANSWER_REVIEW_COMPETENCY';

    for (const review of result.answerReviews) {
        const turn = turnById.get(review.turnId)!;
        const nonSubstantiveAnswer = isNonSubstantiveAnswer(turn.answerText);
        const sectionTypes = review.reviewSections.map(
            (section) => section.type,
        );
        const explicitOrders = review.reviewSections.flatMap((section) =>
            section.order === undefined ? [] : [section.order],
        );

        if (new Set(sectionTypes).size !== sectionTypes.length)
            return `DUPLICATE_REVIEW_SECTION:${review.turnId}`;
        if (
            turn.questionType === 'TECHNICAL' &&
            !sectionTypes.includes('CODE_EXAMPLE')
        )
            return `MISSING_TECHNICAL_CODE_EXAMPLE:${review.turnId}`;
        if (new Set(explicitOrders).size !== explicitOrders.length)
            return `DUPLICATE_REVIEW_SECTION_ORDER:${review.turnId}`;
        if (nonSubstantiveAnswer && review.correctAspects.length > 0)
            return `UNSUPPORTED_EMPTY_ANSWER_PRAISE:${review.turnId}`;
        if (
            ['DONT_KNOW', 'REFUSED', 'OFF_TOPIC', 'NO_RESPONSE'].includes(
                review.answerStatus,
            ) &&
            review.incorrectAspects.length > 0
        )
            return `NON_ANSWER_MARKED_INCORRECT:${review.turnId}`;

        const criteriaAnalysis = review.reviewSections.find(
            (section) => section.type === 'CRITERIA_ANALYSIS',
        );
        if (
            nonSubstantiveAnswer &&
            criteriaAnalysis?.data.criteria.some((criterion) =>
                ['DEMONSTRATED', 'PARTIALLY_DEMONSTRATED'].includes(
                    criterion.status,
                ),
            )
        )
            return `UNSUPPORTED_CRITERIA_EVIDENCE:${review.turnId}`;
        if (
            criteriaAnalysis?.data.criteria.some(
                (criterion) =>
                    criterion.status === 'DEMONSTRATED' &&
                    criterion.evidence === null,
            )
        )
            return `MISSING_CRITERIA_EVIDENCE:${review.turnId}`;
        if (
            sectionTypes.includes('ANSWER_COMPARISON') &&
            !sectionTypes.includes('IMPROVED_ANSWER')
        )
            return `COMPARISON_WITHOUT_IMPROVED_ANSWER:${review.turnId}`;
        if (countWords(review.improvement) < 8)
            return `THIN_REVIEW_IMPROVEMENT:${review.turnId}`;
    }

    const findingIds = new Set(
        result.diagnosticFindings.map((item) => item.id),
    );
    if (findingIds.size !== result.diagnosticFindings.length)
        return 'DUPLICATE_FINDING';
    const findingSignatures = result.diagnosticFindings.map(
        (item) =>
            `${item.competencyKey}:${normalize(item.subarea)}:${item.category}`,
    );
    if (new Set(findingSignatures).size !== findingSignatures.length)
        return 'DUPLICATE_FINDING_SEMANTIC';

    for (const competency of result.competencies) {
        const authoritative = expected.get(competency.competencyKey)!;
        if (
            competency.name !== authoritative.name ||
            competency.priority !== authoritative.priority
        )
            return `COMPETENCY_METADATA:${competency.competencyKey}`;
        if (
            (competency.coverageStatus === 'NOT_ASSESSED') !==
            (competency.score === null)
        )
            return `SCORE_COVERAGE:${competency.competencyKey}`;
        if (competency.evidenceTurnIds.some((id) => !turnIds.has(id)))
            return `UNKNOWN_EVIDENCE:${competency.competencyKey}`;
        if (
            competency.score !== null &&
            competency.evidenceTurnIds.length === 0
        )
            return `MISSING_SCORE_EVIDENCE:${competency.competencyKey}`;
        if (
            competency.coverageStatus === 'NOT_ASSESSED' &&
            (competency.evidenceTurnIds.length > 0 ||
                competency.weaknesses.length > 0)
        )
            return `UNASSESSED_CONTRADICTION:${competency.competencyKey}`;
        const findings = result.diagnosticFindings.filter(
            (item) => item.competencyKey === competency.competencyKey,
        );
        if (
            (competency.score ?? 10) < 5 &&
            findings.every(
                (item) =>
                    !['DEMONSTRATED_GAP', 'INSUFFICIENT_EVIDENCE'].includes(
                        item.evidenceStatus,
                    ),
            )
        )
            return `LOW_SCORE_WITHOUT_FINDING:${competency.competencyKey}`;
        if (competency.weaknesses.length > 0 && findings.length === 0)
            return `WEAKNESS_WITHOUT_FINDING:${competency.competencyKey}`;
        if (
            (competency.score ?? 0) >= 7 &&
            (competency.strengths.length === 0 ||
                competency.evidenceTurnIds.length === 0)
        )
            return `HIGH_SCORE_WITHOUT_EVIDENCE:${competency.competencyKey}`;
    }

    for (const finding of result.diagnosticFindings) {
        if (
            !expectedKeys.has(finding.competencyKey) ||
            finding.evidenceTurnIds.length === 0 ||
            finding.evidenceTurnIds.some((id) => !turnIds.has(id))
        )
            return `INVALID_FINDING:${finding.id}`;
        if (finding.evidenceStatus === 'NOT_ASSESSED')
            return `UNASSESSED_AS_FINDING:${finding.id}`;
        const evidence = context.turns.filter((turn) =>
            finding.evidenceTurnIds.includes(turn.id),
        );
        if (
            evidence.length > 0 &&
            evidence.every((turn) => turn.scoringImpact === 'BONUS_ONLY')
        )
            return `STRETCH_PENALTY:${finding.id}`;
    }

    const unassessed = new Set(
        result.competencies
            .filter((item) => item.coverageStatus === 'NOT_ASSESSED')
            .map((item) => item.competencyKey),
    );
    const declaredUnassessed = new Set(
        result.unassessedAreas.map((item) => item.competencyKey),
    );
    if (
        unassessed.size !== declaredUnassessed.size ||
        [...unassessed].some((key) => !declaredUnassessed.has(key)) ||
        result.unassessedAreas.some(
            (item) =>
                !expectedKeys.has(item.competencyKey) ||
                item.name !== expected.get(item.competencyKey)?.name,
        )
    )
        return 'UNASSESSED_SET';

    if (
        result.recommendations.some(
            (item) =>
                !expectedKeys.has(item.competencyKey) ||
                item.relatedFindingIds.length === 0 ||
                item.relatedFindingIds.some((id) => !findingIds.has(id)),
        )
    )
        return 'INVALID_RECOMMENDATION';
    return null;
}

function isNonSubstantiveAnswer(value: string) {
    const normalized = normalize(value);
    if (!normalized) return true;

    const nonAnswers = new Set([
        'xin chao',
        'chao anh',
        'chao chi',
        'em chua ro',
        'em khong biet',
        'toi khong biet',
        'khong biet',
        'bo qua',
    ]);
    return nonAnswers.has(normalized);
}
function normalizeEvidenceSemantics(
    result: InterviewEvaluationAiResult,
    context: EvaluationContext,
): InterviewEvaluationAiResult {
    const turnById = new Map(context.turns.map((turn) => [turn.id, turn]));
    const statusByTurnId = new Map<
        string,
        InterviewEvaluationAiResult['answerReviews'][number]['answerStatus']
    >();

    for (const review of result.answerReviews) {
        const answer = turnById.get(review.turnId)?.answerText ?? '';
        const turn = turnById.get(review.turnId);
        const status = classifyAnswerStatus(
            answer,
            review.answerStatus,
            turn?.questionType ?? 'GENERAL',
            review.correctAspects.length > 0,
        );
        review.answerStatus = status;
        if (turn?.authoritativeObjective) {
            review.questionObjective = turn.authoritativeObjective;
        }
        if (review.exampleImprovedAnswer && !review.exampleImprovedAnswerType) {
            review.exampleImprovedAnswerType = 'ILLUSTRATIVE';
        }
        statusByTurnId.set(review.turnId, status);

        if (isNonSubstantiveAnswer(answer) || isEvidenceMissingStatus(status)) {
            review.correctAspects = [];
            const misplaced = review.incorrectAspects.splice(0);
            review.evidenceQuotes = [];
            review.missingAspects = unique([
                ...review.missingAspects,
                ...misplaced,
            ]).slice(0, 10);
        } else {
            review.evidenceQuotes = review.evidenceQuotes.filter((quote) =>
                answer
                    .toLocaleLowerCase('vi-VN')
                    .includes(quote.toLocaleLowerCase('vi-VN')),
            );
        }
        review.improvement = normalizeReviewImprovement(
            review,
            turn,
            context.preferredLanguage,
        );
        review.reviewSections = normalizeReviewSections(review, turn, status);
        if (isNonSubstantiveAnswer(answer)) {
            for (const section of review.reviewSections) {
                if (section.type !== 'CRITERIA_ANALYSIS') continue;
                section.data.criteria = section.data.criteria.map(
                    (criterion) => ({
                        ...criterion,
                        status: 'INSUFFICIENT_EVIDENCE' as const,
                        evidence: null,
                        missing:
                            criterion.missing ??
                            (context.preferredLanguage === 'VI'
                                ? 'Câu trả lời chưa cung cấp đủ thông tin để xác minh tiêu chí này.'
                                : 'The answer does not provide enough information to verify this criterion.'),
                    }),
                );
            }
        }
    }

    result.diagnosticFindings = repairLowScoreFindings(result, context);

    for (const finding of result.diagnosticFindings) {
        if (
            finding.evidenceTurnIds.length > 0 &&
            finding.evidenceTurnIds.every((id) =>
                isEvidenceMissingStatus(
                    statusByTurnId.get(id) ?? 'NO_RESPONSE',
                ),
            )
        ) {
            finding.evidenceStatus = 'INSUFFICIENT_EVIDENCE';
        }
    }

    for (const competency of result.competencies) {
        const statuses = competency.evidenceTurnIds.map(
            (id) => statusByTurnId.get(id) ?? 'NO_RESPONSE',
        );
        if (statuses.length && statuses.every(isEvidenceMissingStatus)) {
            competency.coverageStatus = 'INSUFFICIENT';
            competency.confidence = 'LOW';
        }
    }

    result.recommendations = repairRecommendations(result, context);
    return result;
}

function repairRecommendations(
    result: InterviewEvaluationAiResult,
    context: EvaluationContext,
): InterviewEvaluationAiResult['recommendations'] {
    const expected = new Map(
        context.competencyMap.map((competency) => [competency.key, competency]),
    );
    const validFindingIds = new Set(
        result.diagnosticFindings.map((finding) => finding.id),
    );
    const recommendations = [...result.recommendations];
    const validRecommendations = recommendations.filter(
        (recommendation) =>
            expected.has(recommendation.competencyKey) &&
            recommendation.relatedFindingIds.length > 0 &&
            recommendation.relatedFindingIds.every((id) =>
                validFindingIds.has(id),
            ),
    );
    const coveredCompetencies = new Set(
        validRecommendations.map(
            (recommendation) => recommendation.competencyKey,
        ),
    );
    const priorityRank: Record<string, number> = {
        KEY: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
    };

    const roadmapCandidates = result.competencies
        .filter(
            (competency) =>
                competency.score !== null &&
                competency.score < 5 &&
                !coveredCompetencies.has(competency.competencyKey),
        )
        .sort(
            (left, right) =>
                (priorityRank[left.priority] ?? 9) -
                    (priorityRank[right.priority] ?? 9) ||
                (left.score ?? 10) - (right.score ?? 10),
        );

    for (const competency of roadmapCandidates) {
        const findings = result.diagnosticFindings.filter(
            (finding) =>
                finding.competencyKey === competency.competencyKey &&
                [
                    'DEMONSTRATED_GAP',
                    'PARTIALLY_DEMONSTRATED',
                    'INSUFFICIENT_EVIDENCE',
                ].includes(finding.evidenceStatus),
        );
        if (findings.length === 0) continue;

        const authoritative = expected.get(competency.competencyKey);
        const learningObjectives = unique([
            ...findings.map((finding) => finding.improvementAction),
            ...(authoritative?.evidenceNeeded ?? []),
        ]).slice(0, 8);
        const suggestedExercises = unique(
            findings.map((finding) => finding.suggestedPractice),
        ).slice(0, 8);

        recommendations.push({
            competencyKey: competency.competencyKey,
            priority: competency.priority,
            topic: competency.name,
            reason:
                findings[0]?.observation ??
                competency.weaknesses[0] ??
                competency.summary,
            learningObjectives:
                learningObjectives.length > 0
                    ? learningObjectives
                    : [
                          context.preferredLanguage === 'VI'
                              ? `Củng cố kiến thức nền tảng về ${competency.name}.`
                              : `Strengthen foundational knowledge of ${competency.name}.`,
                      ],
            suggestedExercises:
                suggestedExercises.length > 0
                    ? suggestedExercises
                    : [
                          context.preferredLanguage === 'VI'
                              ? `Luyện một bài thực hành có giải thích về ${competency.name}.`
                              : `Complete one explained practice exercise on ${competency.name}.`,
                      ],
            expectedOutcome:
                context.preferredLanguage === 'VI'
                    ? `Có thể giải thích và áp dụng ${competency.name} ở mức ${authoritative?.expectedDepth ?? 'phù hợp với vị trí'}.`
                    : `Explain and apply ${competency.name} at ${authoritative?.expectedDepth ?? 'the expected role level'}.`,
            relatedFindingIds: findings
                .map((finding) => finding.id)
                .slice(0, 12),
        });
    }

    return recommendations
        .sort(
            (left, right) =>
                (priorityRank[left.priority] ?? 9) -
                (priorityRank[right.priority] ?? 9),
        )
        .slice(0, 20);
}

function repairLowScoreFindings(
    result: InterviewEvaluationAiResult,
    context: EvaluationContext,
): InterviewEvaluationAiResult['diagnosticFindings'] {
    const findings = [...result.diagnosticFindings];
    const turnById = new Map(context.turns.map((turn) => [turn.id, turn]));
    const competencyByKey = new Map(
        context.competencyMap.map((competency) => [competency.key, competency]),
    );

    for (const competency of result.competencies) {
        const isLowScore = (competency.score ?? 10) < 5;
        const hasWeakness = competency.weaknesses.length > 0;
        if (!isLowScore && !hasWeakness) continue;

        const competencyFindings = findings.filter(
            (finding) => finding.competencyKey === competency.competencyKey,
        );
        const hasRequiredFinding = isLowScore
            ? competencyFindings.some((finding) =>
                  ['DEMONSTRATED_GAP', 'INSUFFICIENT_EVIDENCE'].includes(
                      finding.evidenceStatus,
                  ),
              )
            : competencyFindings.length > 0;
        if (hasRequiredFinding) continue;

        const reviews = result.answerReviews.filter(
            (review) =>
                review.competencyKey === competency.competencyKey &&
                competency.evidenceTurnIds.includes(review.turnId),
        );
        const incorrect = unique(
            reviews.flatMap((review) => review.incorrectAspects),
        );
        const missing = unique(
            reviews.flatMap((review) => review.missingAspects),
        );
        const source = competencyByKey.get(competency.competencyKey);
        const evidenceTurnIds = competency.evidenceTurnIds.filter((id) =>
            turnById.has(id),
        );

        // A scored competency already has real turn evidence. If the model
        // omitted its diagnostic finding, reconstruct only the missing
        // linkage instead of regenerating the report or inventing a claim.
        if (evidenceTurnIds.length === 0) continue;

        const demonstratedGap = incorrect.length > 0;
        const expected = unique([
            ...(source?.evidenceNeeded ?? []),
            ...(source?.probeAreas ?? []),
        ]);
        const observation =
            incorrect[0] ??
            competency.weaknesses[0] ??
            missing[0] ??
            (context.preferredLanguage === 'VI'
                ? `Chưa có đủ bằng chứng để xác nhận năng lực ${competency.name}.`
                : `There is not enough evidence to confirm ${competency.name}.`);
        const expectedUnderstanding =
            expected.join('; ') ||
            (context.preferredLanguage === 'VI'
                ? `Cần thể hiện kiến thức và cách áp dụng ${competency.name} ở mức ${source?.expectedDepth ?? 'phù hợp với vị trí'}.`
                : `Demonstrate ${competency.name} knowledge and application at ${source?.expectedDepth ?? 'the expected role level'}.`);
        const improvementAction =
            missing[0] ??
            expected[0] ??
            (context.preferredLanguage === 'VI'
                ? `Bổ sung lời giải thích cụ thể và ví dụ thực tế về ${competency.name}.`
                : `Add a concrete explanation and practical example for ${competency.name}.`);

        findings.push({
            id: `normalized-low-score-${competency.competencyKey}`.slice(
                0,
                100,
            ),
            competencyKey: competency.competencyKey,
            subarea: (source?.name ?? competency.name).slice(0, 200),
            category: demonstratedGap ? 'MISCONCEPTION' : 'KNOWLEDGE_GAP',
            evidenceStatus: demonstratedGap
                ? 'DEMONSTRATED_GAP'
                : isLowScore
                  ? 'INSUFFICIENT_EVIDENCE'
                  : 'PARTIALLY_DEMONSTRATED',
            severity:
                (competency.score ?? 0) <= 2
                    ? 'HIGH'
                    : (competency.score ?? 0) < 5
                      ? 'MEDIUM'
                      : 'LOW',
            observation,
            expectedUnderstanding,
            explanation:
                context.preferredLanguage === 'VI'
                    ? `Điểm năng lực hiện tại là ${competency.score}/10. Nhận định này chỉ dựa trên câu trả lời đã ghi nhận, không suy diễn ngoài bằng chứng.`
                    : `The current competency score is ${competency.score}/10. This finding uses only recorded answer evidence and makes no unsupported assumptions.`,
            evidenceTurnIds,
            improvementAction,
            suggestedPractice:
                context.preferredLanguage === 'VI'
                    ? `Luyện trả lời một câu hỏi thực tế về ${competency.name}, nêu rõ cách làm, lý do lựa chọn và kết quả mong đợi.`
                    : `Practice one realistic ${competency.name} question, explaining the approach, rationale, and expected outcome.`,
        });
    }

    return findings;
}

function repairAnswerReviewSet(
    result: InterviewEvaluationAiResult,
    context: EvaluationContext,
): InterviewEvaluationAiResult {
    const expectedTurnIds = new Set(context.turns.map((turn) => turn.id));
    const existingByTurnId = new Map<
        string,
        InterviewEvaluationAiResult['answerReviews'][number]
    >();

    for (const review of result.answerReviews) {
        if (
            expectedTurnIds.has(review.turnId) &&
            !existingByTurnId.has(review.turnId)
        ) {
            existingByTurnId.set(review.turnId, review);
        }
    }

    result.answerReviews = context.turns.map(
        (turn) =>
            existingByTurnId.get(turn.id) ??
            createMissingAnswerReview(turn, context),
    );
    return result;
}

function createMissingAnswerReview(
    turn: EvaluationContext['turns'][number],
    context: EvaluationContext,
): InterviewEvaluationAiResult['answerReviews'][number] {
    const language = context.preferredLanguage;
    const objective =
        turn.authoritativeObjective?.trim() ||
        turn.evaluationCriteria?.find(Boolean)?.trim() ||
        (language === 'VI'
            ? 'Cung cấp câu trả lời trực tiếp, có lập luận và bằng chứng phù hợp với câu hỏi.'
            : 'Provide a direct answer with relevant reasoning and evidence.');
    const missingAspects = unique(
        (turn.evaluationCriteria?.length ?? 0) > 0
            ? (turn.evaluationCriteria ?? [])
            : [objective],
    ).slice(0, 10);

    return {
        turnId: turn.id,
        competencyKey: context.competencyMap.some(
            (item) => item.key === turn.competencyKey,
        )
            ? turn.competencyKey
            : null,
        answerStatus: 'ANSWERED',
        questionObjective: objective,
        evidenceQuotes: [],
        correctAspects: [],
        missingAspects,
        incorrectAspects: [],
        whyItMatters:
            language === 'VI'
                ? `Câu hỏi này được dùng để thu thập bằng chứng cho mục tiêu: ${objective}`
                : `This question collects evidence for the following objective: ${objective}`,
        improvement:
            language === 'VI'
                ? 'Hãy trả lời trực tiếp câu hỏi, giải thích cách bạn suy luận và bổ sung một ví dụ cụ thể có thể kiểm chứng.'
                : 'Answer the question directly, explain your reasoning, and add one specific verifiable example.',
        exampleImprovedAnswer: null,
        exampleImprovedAnswerType: null,
        learningObjectives: missingAspects.slice(0, 6),
        reviewSections: [],
    };
}

function normalizeReviewImprovement(
    review: InterviewEvaluationAiResult['answerReviews'][number],
    turn: EvaluationContext['turns'][number] | undefined,
    language: EvaluationContext['preferredLanguage'],
) {
    if (countWords(review.improvement) >= 8) return review.improvement;

    const focus =
        review.incorrectAspects[0] ??
        review.missingAspects[0] ??
        turn?.evaluationCriteria?.[0] ??
        turn?.authoritativeObjective ??
        review.questionObjective;

    return language === 'VI'
        ? `Hãy làm rõ ${focus}, giải thích cách bạn suy luận và bổ sung một ví dụ cụ thể phù hợp với câu hỏi.`
        : `Clarify ${focus}, explain your reasoning, and add one specific example that directly answers the question.`;
}
function classifyAnswerStatus(
    value: string,
    proposed: InterviewEvaluationAiResult['answerReviews'][number]['answerStatus'],
    questionType: string,
    hasGroundedCorrectAspect: boolean,
) {
    const normalized = normalize(value);
    if (!normalized) return 'NO_RESPONSE' as const;
    if (/^(alo|hello test|thu mic)$/.test(normalized))
        return 'NO_RESPONSE' as const;
    if (
        /\b(khong muon tra loi|tu choi tra loi|xin phep khong tra loi|bo qua cau nay)\b/.test(
            normalized,
        )
    )
        return 'REFUSED' as const;
    if (/\b(khong biet|chua ro)\b/.test(normalized)) {
        if (/\b(dung hoi|dung co hoi|bo qua|the thoi)\b/.test(normalized))
            return 'REFUSED' as const;
        return 'DONT_KNOW' as const;
    }
    if (
        questionType === 'GENERAL' &&
        /^(xin chao|chao anh|chao chi)\b/.test(normalized) &&
        countWords(value) <= 16
    )
        return 'PARTIAL' as const;
    if (proposed === 'OFF_TOPIC' && hasGroundedCorrectAspect)
        return 'PARTIAL' as const;
    return proposed;
}

function normalizeReviewSections(
    review: InterviewEvaluationAiResult['answerReviews'][number],
    turn: EvaluationContext['turns'][number] | undefined,
    status: InterviewEvaluationAiResult['answerReviews'][number]['answerStatus'],
) {
    const sections = [...review.reviewSections];
    let criteria = sections.find(
        (section) => section.type === 'CRITERIA_ANALYSIS',
    );
    if (!criteria && turn && turn.questionType !== 'CANDIDATE') {
        const sourceCriteria = unique([
            ...(turn.evaluationCriteria ?? []),
            review.questionObjective,
        ])
            .filter(Boolean)
            .slice(0, 8);
        if (sourceCriteria.length) {
            criteria = {
                type: 'CRITERIA_ANALYSIS',
                title: '\u0110\u00e1nh gi\u00e1 theo ti\u00eau ch\u00ed',
                order: 0,
                data: {
                    criteria: sourceCriteria.map((name, index) =>
                        synthesizeCriterion(
                            review,
                            status,
                            turn.rootPlannedQuestionKey,
                            name,
                            index,
                        ),
                    ),
                    overallAssessment: review.improvement,
                },
            };
            sections.unshift(criteria);
        }
    }
    const hasAnswerStructure = sections.some(
        (section) => section.type === 'ANSWER_STRUCTURE',
    );
    if (
        !hasAnswerStructure &&
        turn?.questionType === 'GENERAL' &&
        isSelfIntroductionQuestion(turn.questionText) &&
        sections.length < 5
    ) {
        sections.push({
            type: 'ANSWER_STRUCTURE',
            title: 'Cấu trúc giới thiệu bản thân gợi ý',
            order: nextSectionOrder(sections),
            data: {
                steps: [
                    {
                        label: 'Thông tin cơ bản',
                        guidance:
                            'Nêu tên, vai trò hiện tại và vị trí đang ứng tuyển.',
                        expectedContent: null,
                        speakingTimeSeconds: 10,
                    },
                    {
                        label: 'Kinh nghiệm và kỹ năng',
                        guidance:
                            'Tóm tắt kinh nghiệm hoặc những kỹ năng phù hợp nhất với vị trí.',
                        expectedContent: null,
                        speakingTimeSeconds: 20,
                    },
                    {
                        label: 'Dự án hoặc thành tích tiêu biểu',
                        guidance:
                            'Chọn một ví dụ đã được xác minh và nêu rõ vai trò, đóng góp hoặc kết quả.',
                        expectedContent: null,
                        speakingTimeSeconds: 20,
                    },
                    {
                        label: 'Định hướng nghề nghiệp',
                        guidance:
                            'Kết nối mục tiêu sắp tới với vị trí đang ứng tuyển.',
                        expectedContent: null,
                        speakingTimeSeconds: 10,
                    },
                ],
            },
        });
    }

    let improvedAnswer = sections.find(
        (section) => section.type === 'IMPROVED_ANSWER',
    );
    if (
        !improvedAnswer &&
        review.exampleImprovedAnswer &&
        sections.length < 5
    ) {
        improvedAnswer = {
            type: 'IMPROVED_ANSWER',
            title: 'Câu trả lời tham khảo tốt hơn',
            order: nextSectionOrder(sections),
            data: {
                answer: review.exampleImprovedAnswer,
                answerType: review.exampleImprovedAnswerType ?? 'ILLUSTRATIVE',
                improvements: unique([
                    ...review.missingAspects,
                    ...review.incorrectAspects,
                ]).slice(0, 6),
            },
        };
        sections.push(improvedAnswer);
    }

    const hasComparison = sections.some(
        (section) => section.type === 'ANSWER_COMPARISON',
    );
    const comparisonItems = unique([
        ...review.missingAspects,
        ...review.incorrectAspects,
    ]).slice(0, 6);
    if (
        improvedAnswer &&
        !hasComparison &&
        sections.length < 5 &&
        comparisonItems.length > 0 &&
        (turn?.answerText ?? '').trim()
    ) {
        sections.push({
            type: 'ANSWER_COMPARISON',
            title: 'So sánh câu trả lời',
            order: nextSectionOrder(sections),
            data: {
                originalAnswer: turn?.answerText ?? '',
                improvedAnswer: improvedAnswer.data.answer,
                changes: unique([
                    ...review.missingAspects,
                    ...review.incorrectAspects,
                ])
                    .slice(0, 6)
                    .map((item, index) => ({
                        area: `Điểm cải thiện ${index + 1}`,
                        original: null,
                        improved: item,
                        reason: item,
                    })),
                summary:
                    'Bản tham khảo bổ sung trực tiếp các ý còn thiếu hoặc chưa chính xác trong câu trả lời hiện tại.',
            },
        });
    }
    for (const section of sections) {
        if (section.type === 'CRITERIA_ANALYSIS') {
            section.data.criteria.forEach((criterion, index) => {
                if (!criterion.id) {
                    criterion.id = stableCriterionId(
                        turn?.rootPlannedQuestionKey ?? review.turnId,
                        index,
                    );
                }
            });
        }
        if (section.type === 'ANSWER_COMPARISON') {
            section.data.originalAnswer = turn?.answerText ?? '';
            section.data.improvedAnswer =
                improvedAnswer?.type === 'IMPROVED_ANSWER'
                    ? improvedAnswer.data.answer
                    : null;
        }
    }
    return sections;
}

function nextSectionOrder(
    sections: InterviewEvaluationAiResult['answerReviews'][number]['reviewSections'],
) {
    return Math.max(0, ...sections.map((section) => section.order ?? 0)) + 1;
}

function isSelfIntroductionQuestion(questionText: string) {
    const value = normalize(questionText);
    return (
        (value.includes('gioi thieu') &&
            (value.includes('ban than') || value.includes('ve ban'))) ||
        value.includes('introduce yourself') ||
        value.includes('tell me about yourself')
    );
}
function synthesizeCriterion(
    review: InterviewEvaluationAiResult['answerReviews'][number],
    answerStatus: InterviewEvaluationAiResult['answerReviews'][number]['answerStatus'],
    scope: string,
    name: string,
    index: number,
) {
    const evidence =
        findRelevantAspect(name, review.evidenceQuotes) ??
        findRelevantAspect(name, review.correctAspects) ??
        review.evidenceQuotes[index] ??
        review.correctAspects[index] ??
        null;
    const incorrect =
        findRelevantAspect(name, review.incorrectAspects) ??
        review.incorrectAspects[index] ??
        null;
    const missing = isEvidenceMissingStatus(answerStatus)
        ? (review.missingAspects[index] ??
          `Câu trả lời chưa cung cấp bằng chứng cho tiêu chí "${name}".`)
        : (findRelevantAspect(name, review.missingAspects) ??
          review.missingAspects[index] ??
          incorrect);
    const criterionStatus = isEvidenceMissingStatus(answerStatus)
        ? ('INSUFFICIENT_EVIDENCE' as const)
        : incorrect
          ? ('INCORRECT' as const)
          : evidence && missing
            ? ('PARTIALLY_DEMONSTRATED' as const)
            : evidence
              ? ('DEMONSTRATED' as const)
              : missing
                ? ('NOT_DEMONSTRATED' as const)
                : ('NOT_DEMONSTRATED' as const);

    return {
        id: stableCriterionId(scope, index),
        name,
        status: criterionStatus,
        evidence,
        missing,
        explanation:
            criterionStatus === 'DEMONSTRATED'
                ? `Câu trả lời đã cung cấp bằng chứng phù hợp cho tiêu chí "${name}".`
                : criterionStatus === 'PARTIALLY_DEMONSTRATED'
                  ? `Câu trả lời mới đáp ứng một phần tiêu chí "${name}" và cần bổ sung ý còn thiếu.`
                  : criterionStatus === 'INCORRECT'
                    ? `Nội dung liên quan đến tiêu chí "${name}" có điểm chưa chính xác cần sửa.`
                    : `Chưa có đủ nội dung để xác nhận tiêu chí "${name}" trong câu trả lời này.`,
    };
}

function findRelevantAspect(criterion: string, aspects: string[]) {
    const criterionTokens = new Set(
        normalize(criterion)
            .split(/\s+/)
            .filter((token) => token.length >= 4),
    );
    if (criterionTokens.size === 0) return null;

    return (
        aspects
            .map((aspect) => ({
                aspect,
                score: normalize(aspect)
                    .split(/\s+/)
                    .filter((token) => criterionTokens.has(token)).length,
            }))
            .sort((left, right) => right.score - left.score)
            .find((candidate) => candidate.score > 0)?.aspect ?? null
    );
}
function stableCriterionId(scope: string, index: number) {
    return scope.replace(/[^a-zA-Z0-9_-]/g, '-') + '-criterion-' + (index + 1);
}

function isEvidenceMissingStatus(status: string) {
    return ['DONT_KNOW', 'REFUSED', 'OFF_TOPIC', 'NO_RESPONSE'].includes(
        status,
    );
}

function unique(values: string[]) {
    return [...new Set(values)];
}

function countWords(value: string) {
    return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalize(value: string) {
    return value
        .normalize('NFKD')
        .toLocaleLowerCase('en-US')
        .replace(/\p{M}+/gu, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}
