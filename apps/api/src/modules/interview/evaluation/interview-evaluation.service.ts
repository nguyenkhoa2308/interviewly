import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import {
    InterviewEvaluationStatus,
    InterviewStatus,
    Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { InterviewPlanResultSchema } from '../planning/interview-plan.schema';
import {
    AnswerReviewSchema,
    type AnswerReview,
} from './interview-evaluation.schema';
import { InterviewEvaluationScoringService } from './interview-evaluation-scoring.service';
import { QUESTION_REVIEW_PROMPT_VERSION } from './interview-evaluation.prompt';
import { InterviewEvaluatorService } from './interview-evaluator.service';

export const EVALUATION_STALE_PROCESSING_MS = 5 * 60_000;
export const EVALUATION_SWEEP_INTERVAL_MS = 5_000;
export const EVALUATION_MAX_ATTEMPTS = 3;
const MAX_JOBS_PER_SWEEP = 3;
const MANUALLY_RECOVERABLE_ERROR_CODES = new Set([
    'AI_SCHEMA_VALIDATION_FAILED',
    'AI_PROVIDER_ERROR',
    'AI_TIMEOUT',
    'AI_RATE_LIMITED',
    'AI_EMPTY_RESPONSE',
    'AI_INVALID_RESPONSE',
]);

@Injectable()
export class InterviewEvaluationService
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(InterviewEvaluationService.name);
    private sweepTimer?: NodeJS.Timeout;
    private draining = false;

    constructor(
        private readonly prisma: PrismaService,
        private readonly evaluator: InterviewEvaluatorService,
        private readonly scoring: InterviewEvaluationScoringService,
    ) {}

    onModuleInit(): void {
        void this.sweep();
        this.sweepTimer = setInterval(
            () => void this.sweep(),
            EVALUATION_SWEEP_INTERVAL_MS,
        );
        this.sweepTimer.unref();
    }

    onModuleDestroy(): void {
        if (this.sweepTimer) clearInterval(this.sweepTimer);
    }

    async get(userId: string, interviewId: string) {
        const interview = await this.findInterview(userId, interviewId);
        if (!interview.evaluation) {
            return {
                interviewId,
                status: 'NOT_STARTED' as const,
                report: null,
                canRetry: false,
                attemptCount: 0,
            };
        }
        return this.serialize(
            interview.evaluation,
            interview.session?.turns ?? [],
        );
    }

    /**
     * Durable enqueue operation. The HTTP request never waits for Gemini.
     * A persisted PENDING row is processed by the local worker and recovered
     * by later sweeps after a process restart.
     */
    async getQuestionReviews(userId: string, interviewId: string) {
        const interview = await this.findInterview(userId, interviewId);
        const evaluation = interview.evaluation;
        if (!evaluation) {
            return {
                interviewId,
                status: 'NOT_STARTED' as const,
                reviews: null,
                errorCode: null,
                canRetry: false,
                attemptCount: 0,
            };
        }
        return {
            interviewId,
            status: evaluation.questionReviewStatus,
            reviews: this.hydrateAnswerReviewMetadata(
                evaluation.questionReviewData,
                interview.session?.turns ?? [],
            ),
            errorCode: evaluation.questionReviewErrorCode,
            canRetry:
                evaluation.questionReviewStatus ===
                InterviewEvaluationStatus.FAILED,
            attemptCount: evaluation.questionReviewAttemptCount,
            completedAt: evaluation.questionReviewCompletedAt,
            updatedAt: evaluation.updatedAt,
        };
    }

    async reanalyzeQuestionReviews(userId: string, interviewId: string) {
        const interview = await this.findInterview(userId, interviewId);
        this.assertEvaluable(interview);
        const evaluation = await this.prisma.interviewEvaluation.upsert({
            where: { interviewId },
            create: {
                interviewId,
                sessionId: interview.session!.id,
                status: InterviewEvaluationStatus.PENDING,
                questionReviewStatus: InterviewEvaluationStatus.PENDING,
            },
            update: {
                status: InterviewEvaluationStatus.PENDING,
                errorCode: null,
                errorMessage: null,
                processingAt: null,
                attemptCount: 0,
                questionReviewStatus: InterviewEvaluationStatus.PENDING,
                questionReviewData: Prisma.DbNull,
                questionReviewErrorCode: null,
                questionReviewErrorMessage: null,
                questionReviewProcessingAt: null,
                questionReviewCompletedAt: null,
                questionReviewAttemptCount: 0,
            },
        });
        void this.drainQueue();
        return this.getQuestionReviews(userId, evaluation.interviewId);
    }
    async trigger(userId: string, interviewId: string, retry = false) {
        const interview = await this.findInterview(userId, interviewId);
        this.assertEvaluable(interview);

        const evaluation = await this.prisma.interviewEvaluation.upsert({
            where: { interviewId },
            create: {
                interviewId,
                sessionId: interview.session!.id,
                status: InterviewEvaluationStatus.PENDING,
            },
            update: {},
        });

        if (retry && evaluation.status === InterviewEvaluationStatus.FAILED) {
            const canResetAttemptBudget =
                evaluation.errorCode !== null &&
                MANUALLY_RECOVERABLE_ERROR_CODES.has(evaluation.errorCode);
            if (
                evaluation.attemptCount >= EVALUATION_MAX_ATTEMPTS &&
                !canResetAttemptBudget
            ) {
                throw new ConflictException({
                    code: 'INTERVIEW_EVALUATION_RETRY_LIMIT',
                    message: 'Báo cáo đã đạt giới hạn thử lại.',
                });
            }
            await this.prisma.interviewEvaluation.updateMany({
                where: {
                    id: evaluation.id,
                    status: InterviewEvaluationStatus.FAILED,
                },
                data: {
                    status: InterviewEvaluationStatus.PENDING,
                    errorCode: null,
                    errorMessage: null,
                    processingAt: null,
                    ...(canResetAttemptBudget ? { attemptCount: 0 } : {}),
                },
            });
        }

        void this.drainQueue();
        return this.get(userId, interviewId);
    }

    /**
     * Queue a fresh evaluation without deleting the last successful report.
     * Keeping reportData makes the report page useful while the replacement is
     * processing and also provides a safe fallback if the provider fails.
     */
    async reanalyze(userId: string, interviewId: string) {
        const interview = await this.findInterview(userId, interviewId);
        this.assertEvaluable(interview);

        const evaluation = interview.evaluation;
        if (!evaluation?.reportData) {
            throw new ConflictException({
                code: 'INTERVIEW_EVALUATION_NOT_AVAILABLE',
                message: 'Chưa có báo cáo hoàn chỉnh để phân tích lại.',
            });
        }

        const queued = await this.prisma.interviewEvaluation.updateMany({
            where: {
                id: evaluation.id,
                status: {
                    in: [
                        InterviewEvaluationStatus.COMPLETED,
                        InterviewEvaluationStatus.FAILED,
                    ],
                },
            },
            data: {
                status: InterviewEvaluationStatus.PENDING,
                errorCode: null,
                errorMessage: null,
                processingAt: null,
                attemptCount: 0,
            },
        });

        if (queued.count === 0) {
            throw new ConflictException({
                code: 'INTERVIEW_EVALUATION_ALREADY_PROCESSING',
                message: 'Báo cáo đang được phân tích.',
            });
        }

        void this.drainQueue();
        return this.get(userId, interviewId);
    }

    /** Exposed for deterministic lifecycle tests and operational recovery. */
    async sweep(now = new Date()): Promise<void> {
        try {
            await this.recoverStale(now);
            await this.enqueueCompletedInterviews();
            await this.drainQueue();
        } catch (error) {
            this.logger.error(
                'Interview evaluation sweep failed.',
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    private async recoverStale(now: Date) {
        const staleBefore = new Date(
            now.getTime() - EVALUATION_STALE_PROCESSING_MS,
        );
        await this.prisma.interviewEvaluation.updateMany({
            where: {
                status: InterviewEvaluationStatus.PROCESSING,
                processingAt: { lt: staleBefore },
                attemptCount: { lt: EVALUATION_MAX_ATTEMPTS },
            },
            data: {
                status: InterviewEvaluationStatus.PENDING,
                processingAt: null,
                errorCode: 'EVALUATION_PROCESSING_INTERRUPTED',
                errorMessage:
                    'Evaluation processing was interrupted and queued again.',
            },
        });
        await this.prisma.interviewEvaluation.updateMany({
            where: {
                status: InterviewEvaluationStatus.PROCESSING,
                processingAt: { lt: staleBefore },
                attemptCount: { gte: EVALUATION_MAX_ATTEMPTS },
            },
            data: {
                status: InterviewEvaluationStatus.FAILED,
                errorCode: 'EVALUATION_RETRY_LIMIT_REACHED',
                errorMessage: 'Evaluation processing exceeded the retry limit.',
            },
        });
    }

    private async enqueueCompletedInterviews() {
        const completed = await this.prisma.interview.findMany({
            where: {
                status: InterviewStatus.COMPLETED,
                evaluation: null,
                session: { completedAt: { not: null } },
            },
            select: { id: true, session: { select: { id: true } } },
            take: 20,
        });
        const rows = completed.flatMap((interview) =>
            interview.session
                ? [
                      {
                          interviewId: interview.id,
                          sessionId: interview.session.id,
                          status: InterviewEvaluationStatus.PENDING,
                      },
                  ]
                : [],
        );
        if (rows.length) {
            await this.prisma.interviewEvaluation.createMany({
                data: rows,
                skipDuplicates: true,
            });
        }
    }

    private async drainQueue() {
        if (this.draining) return;
        this.draining = true;
        try {
            for (let index = 0; index < MAX_JOBS_PER_SWEEP; index += 1) {
                const pending = await this.prisma.interviewEvaluation.findFirst(
                    {
                        where: {
                            status: InterviewEvaluationStatus.PENDING,
                            attemptCount: { lt: EVALUATION_MAX_ATTEMPTS },
                        },
                        orderBy: { createdAt: 'asc' },
                        select: { id: true },
                    },
                );
                if (!pending) break;
                const claimed =
                    await this.prisma.interviewEvaluation.updateMany({
                        where: {
                            id: pending.id,
                            status: InterviewEvaluationStatus.PENDING,
                            attemptCount: { lt: EVALUATION_MAX_ATTEMPTS },
                        },
                        data: {
                            status: InterviewEvaluationStatus.PROCESSING,
                            processingAt: new Date(),
                            attemptCount: { increment: 1 },
                            errorCode: null,
                            errorMessage: null,
                        },
                    });
                if (claimed.count === 0) continue;
                await this.processClaimed(pending.id);
            }
        } finally {
            this.draining = false;
        }
    }

    private async processClaimed(evaluationId: string) {
        const claimed = await this.prisma.interviewEvaluation.findUnique({
            where: { id: evaluationId },
            select: {
                interviewId: true,
                interview: { select: { userId: true } },
            },
        });
        if (!claimed) return;
        try {
            const interview = await this.findInterview(
                claimed.interview.userId,
                claimed.interviewId,
            );
            this.assertEvaluable(interview);
            const context = this.buildContext(interview);

            let answerReviews = this.parseQuestionReviews(
                interview.evaluation?.questionReviewData,
            );
            let questionReviewMetadata: {
                modelProvider: string;
                modelName: string;
                promptVersion: string;
            } | null = null;

            if (!answerReviews) {
                await this.prisma.interviewEvaluation.update({
                    where: { id: evaluationId },
                    data: {
                        questionReviewStatus:
                            InterviewEvaluationStatus.PROCESSING,
                        questionReviewProcessingAt: new Date(),
                        questionReviewAttemptCount: { increment: 1 },
                        questionReviewErrorCode: null,
                        questionReviewErrorMessage: null,
                    },
                });
                const questionReviewOutput =
                    await this.evaluator.evaluateQuestionReviews(context);
                answerReviews = questionReviewOutput.result.answerReviews;
                questionReviewMetadata = questionReviewOutput.metadata;
                await this.prisma.interviewEvaluation.update({
                    where: { id: evaluationId },
                    data: {
                        questionReviewStatus:
                            InterviewEvaluationStatus.COMPLETED,
                        questionReviewData: {
                            ...questionReviewOutput.result,
                            promptVersion:
                                questionReviewOutput.metadata.promptVersion,
                        },
                        questionReviewCompletedAt: new Date(),
                        questionReviewProcessingAt: null,
                    },
                });
            }

            const output = await this.evaluator.evaluateOverall(
                context,
                answerReviews,
            );
            const aggregate = this.scoring.calculate(output.result);
            const report = {
                ...output.result,
                answerReviews: output.result.answerReviews.map((review) => {
                    const turn = context.turns.find(
                        (item) => item.id === review.turnId,
                    );
                    const reviewSections = review.reviewSections
                        .map((section, index) => ({ section, index }))
                        .sort(
                            (left, right) =>
                                (left.section.order ?? left.index) -
                                (right.section.order ?? right.index),
                        )
                        .map(({ section }) => section);
                    return {
                        ...review,
                        reviewSections,
                        questionText: turn?.questionText ?? '',
                        answerText: turn?.answerText ?? '',
                        sectionIndex: turn?.sectionIndex ?? 0,
                        sectionTitle: turn?.sectionTitle ?? '',
                        questionType: turn?.questionType ?? 'GENERAL',
                        topic: turn?.topic ?? null,
                        probeType: turn?.probeType ?? 'MAIN_TARGET_LEVEL',
                        scoringImpact: turn?.scoringImpact ?? 'TARGET_LEVEL',
                    };
                }),
                ...aggregate,
                generatedAt: new Date().toISOString(),
                rubricVersion: 'evaluation-v5-split',
                questionReviewMetadata,
            };
            await this.prisma.interviewEvaluation.updateMany({
                where: {
                    id: evaluationId,
                    status: InterviewEvaluationStatus.PROCESSING,
                },
                data: {
                    status: InterviewEvaluationStatus.COMPLETED,
                    overallScore: aggregate.overallScore,
                    coverage: aggregate.coverage,
                    confidence: aggregate.confidence,
                    levelAssessment: aggregate.levelAssessment,
                    reportData: report as unknown as Prisma.InputJsonValue,
                    ...output.metadata,
                    completedAt: new Date(),
                    processingAt: null,
                },
            });
        } catch (error) {
            const code =
                error instanceof Error && 'code' in error
                    ? String(error.code)
                    : 'EVALUATION_FAILED';
            const current = await this.prisma.interviewEvaluation.findUnique({
                where: { id: evaluationId },
                select: { questionReviewStatus: true },
            });
            const questionReviewFailed =
                current?.questionReviewStatus ===
                InterviewEvaluationStatus.PROCESSING;
            await this.prisma.interviewEvaluation.updateMany({
                where: {
                    id: evaluationId,
                    status: InterviewEvaluationStatus.PROCESSING,
                },
                data: {
                    status: InterviewEvaluationStatus.FAILED,
                    errorCode: code,
                    errorMessage:
                        error instanceof Error ? error.message : String(error),
                    processingAt: null,
                    ...(questionReviewFailed
                        ? {
                              questionReviewStatus:
                                  InterviewEvaluationStatus.FAILED,
                              questionReviewErrorCode: code,
                              questionReviewErrorMessage:
                                  error instanceof Error
                                      ? error.message
                                      : String(error),
                              questionReviewProcessingAt: null,
                          }
                        : {}),
                },
            });
            this.logger.warn(`Interview evaluation failed [${code}].`);
        }
    }

    private parseQuestionReviews(value: Prisma.JsonValue | null | undefined) {
        const data = this.record(value);
        if (
            !data ||
            data.promptVersion !== QUESTION_REVIEW_PROMPT_VERSION ||
            !Array.isArray(data.answerReviews)
        )
            return null;
        const reviews: AnswerReview[] = [];
        for (const value of data.answerReviews) {
            const parsed = AnswerReviewSchema.safeParse(value);
            if (!parsed.success) return null;
            reviews.push(parsed.data);
        }
        return reviews.length > 0 ? reviews : null;
    }
    private assertEvaluable(
        interview: Awaited<ReturnType<typeof this.findInterview>>,
    ) {
        if (
            interview.status !== InterviewStatus.COMPLETED ||
            !interview.session?.completedAt
        )
            throw new ConflictException({
                code: 'INTERVIEW_NOT_COMPLETED',
                message: 'Chỉ có thể đánh giá buổi phỏng vấn đã hoàn thành.',
            });
        if (!interview.plan?.planData)
            throw new ConflictException({
                code: 'INTERVIEW_PLAN_UNAVAILABLE',
                message: 'Không tìm thấy kế hoạch dùng cho buổi phỏng vấn.',
            });
    }

    private async findInterview(userId: string, interviewId: string) {
        const interview = await this.prisma.interview.findFirst({
            where: { id: interviewId, userId },
            include: {
                evaluation: true,
                plans: {
                    where: { session: { isNot: null } },
                    take: 1,
                    orderBy: { version: 'desc' },
                },
                session: {
                    include: {
                        turns: {
                            where: { answeredAt: { not: null } },
                            orderBy: { runtimeOrder: 'asc' },
                        },
                    },
                },
            },
        });
        if (!interview)
            throw new NotFoundException({
                code: 'INTERVIEW_NOT_FOUND',
                message: 'Không tìm thấy buổi phỏng vấn.',
            });
        return { ...interview, plan: interview.plans[0] ?? null };
    }

    private buildContext(
        interview: Awaited<ReturnType<typeof this.findInterview>>,
    ) {
        const parsed = InterviewPlanResultSchema.safeParse(
            interview.plan?.planData,
        );
        if (!parsed.success || !parsed.data.competencyMap)
            throw new ConflictException({
                code: 'INTERVIEW_PLAN_INVALID',
                message: 'Kế hoạch phỏng vấn thiếu bản đồ năng lực.',
            });
        const snapshot = this.record(interview.sourceContextSnapshot);
        const profile = this.record(snapshot?.candidateProfile);
        const plannedQuestions = new Map<
            string,
            (typeof parsed.data.sections)[number]['questions'][number]
        >(
            parsed.data.sections.flatMap((section) =>
                section.questions.map(
                    (question) =>
                        [`planned:${question.order}`, question] as const,
                ),
            ),
        );
        const competencyMap = canonicalizeCompetencyMap(
            parsed.data.competencyMap,
            interview.session!.turns.map((turn) => turn.competencyKey),
        );
        const competencyKeys = new Set(competencyMap.map((item) => item.key));
        return {
            preferredLanguage:
                profile?.preferredLanguage === 'EN' ? 'EN' : 'VI',
            interviewId: interview.id,
            sessionId: interview.session!.id,
            interviewType: interview.interviewType,
            targetRole: interview.targetRole,
            targetLevel: interview.targetLevel,
            completedAt: interview.session!.completedAt!.toISOString(),
            historicalContext: {
                cv: snapshot?.cv ?? null,
                jd: snapshot?.jd ?? null,
                match: snapshot?.match ?? null,
            },
            rubric: {
                roleBaseline: (parsed.data.roleBaseline ?? []).filter((item) =>
                    competencyKeys.has(item.key),
                ),
                targetLevel: interview.targetLevel,
            },
            competencyMap: competencyMap.map((item) => ({
                key: item.key,
                name: item.name,
                priority: item.priority,
                expectedDepth: item.expectedDepth,
                evidenceNeeded: item.evidenceNeeded,
                probeAreas: item.probeAreas,
                sources: item.sources,
            })),
            turns: interview.session!.turns.map((turn) => {
                const planned = plannedQuestions.get(
                    turn.rootPlannedQuestionKey,
                );
                return {
                    id: turn.id,
                    runtimeOrder: turn.runtimeOrder,
                    rootPlannedQuestionKey: turn.rootPlannedQuestionKey,
                    parentTurnId: turn.parentTurnId,
                    coveredByTurnId: turn.coveredByTurnId,
                    origin: turn.origin,
                    competencyKey: turn.competencyKey,
                    sectionIndex: turn.sectionIndex,
                    sectionTitle: turn.sectionTitle,
                    questionType: turn.questionType,
                    topic: turn.topic,
                    questionText: turn.questionText,
                    answerText: turn.answerText ?? '',
                    probeType: turn.probeType,
                    scoringImpact: turn.scoringImpact,
                    assistanceLevel: turn.assistanceLevel,
                    adaptiveAction: turn.adaptiveAction,
                    coverageEvidence: turn.coverageEvidence,
                    answerAssessment: turn.answerAssessment,
                    authoritativeObjective:
                        turn.origin === 'PLANNED_MAIN'
                            ? (planned?.primaryIntent ??
                              planned?.objective ??
                              null)
                            : null,
                    evaluationCriteria:
                        turn.origin === 'PLANNED_MAIN'
                            ? [
                                  ...(planned?.evidenceObjectives ?? []),
                                  ...(planned?.expectedSignals ?? []),
                              ]
                            : [],
                };
            }),
        } as const;
    }

    private serialize(
        evaluation: {
            interviewId: string;
            status: InterviewEvaluationStatus;
            reportData: Prisma.JsonValue | null;
            errorCode: string | null;
            attemptCount: number;
            completedAt: Date | null;
            updatedAt: Date;
            questionReviewStatus: InterviewEvaluationStatus;
            questionReviewData: Prisma.JsonValue | null;
            questionReviewErrorCode: string | null;
            questionReviewAttemptCount: number;
            questionReviewCompletedAt: Date | null;
        },
        turns: Array<{
            id: string;
            sectionIndex: number;
            sectionTitle: string;
            questionType: string;
            topic: string | null;
            questionText: string;
            answerText: string | null;
        }> = [],
    ) {
        const report = this.hydrateAnswerReviewMetadata(
            evaluation.reportData,
            turns,
        );
        return {
            interviewId: evaluation.interviewId,
            status: evaluation.status,
            report,
            errorCode: evaluation.errorCode,
            canRetry:
                evaluation.status === InterviewEvaluationStatus.FAILED &&
                (evaluation.attemptCount < EVALUATION_MAX_ATTEMPTS ||
                    (evaluation.errorCode !== null &&
                        MANUALLY_RECOVERABLE_ERROR_CODES.has(
                            evaluation.errorCode,
                        ))),
            attemptCount: evaluation.attemptCount,
            completedAt: evaluation.completedAt,
            updatedAt: evaluation.updatedAt,
            questionReview: {
                status: evaluation.questionReviewStatus,
                data: this.hydrateAnswerReviewMetadata(
                    evaluation.questionReviewData,
                    turns,
                ),
                errorCode: evaluation.questionReviewErrorCode,
                attemptCount: evaluation.questionReviewAttemptCount,
                completedAt: evaluation.questionReviewCompletedAt,
            },
        };
    }

    private hydrateAnswerReviewMetadata(
        reportData: Prisma.JsonValue | null,
        turns: Array<{
            id: string;
            sectionIndex: number;
            sectionTitle: string;
            questionType: string;
            topic: string | null;
            questionText: string;
            answerText: string | null;
        }>,
    ): Prisma.JsonValue | null {
        const report = this.record(reportData);
        if (!report || !Array.isArray(report.answerReviews)) {
            return sanitizeCandidateFacingText(reportData) as Prisma.JsonValue;
        }

        const turnById = new Map(turns.map((turn) => [turn.id, turn]));
        const hydratedReviews = report.answerReviews.map((value) => {
            const review = this.record(value);
            const turn =
                review && typeof review.turnId === 'string'
                    ? turnById.get(review.turnId)
                    : undefined;
            if (!review || !turn) return value;
            return {
                ...review,
                sectionIndex: turn.sectionIndex,
                sectionTitle: turn.sectionTitle,
                questionType: turn.questionType,
                topic: turn.topic,
                questionText: turn.questionText,
                answerText: turn.answerText ?? '',
            };
        });
        const referencedCompetencyKeys = hydratedReviews.flatMap((value) => {
            const review = this.record(value);
            return typeof review?.competencyKey === 'string'
                ? [review.competencyKey]
                : [];
        });
        const competencies = Array.isArray(report.competencies)
            ? canonicalizeReportCompetencies(
                  report.competencies,
                  referencedCompetencyKeys,
              )
            : report.competencies;
        const retainedCompetencyKeys = new Set(
            Array.isArray(competencies)
                ? competencies.flatMap((value) => {
                      const competency = this.record(value);
                      return typeof competency?.competencyKey === 'string'
                          ? [competency.competencyKey]
                          : [];
                  })
                : [],
        );
        return sanitizeCandidateFacingText({
            ...report,
            competencies,
            unassessedAreas: Array.isArray(report.unassessedAreas)
                ? report.unassessedAreas.filter((value) => {
                      const area = this.record(value);
                      return (
                          typeof area?.competencyKey !== 'string' ||
                          retainedCompetencyKeys.has(area.competencyKey)
                      );
                  })
                : report.unassessedAreas,
            answerReviews: hydratedReviews,
        }) as Prisma.JsonObject;
    }
    private record(value: unknown): Record<string, unknown> | null {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : null;
    }
}

function canonicalizeCompetencyMap<T extends { key: string; name: string }>(
    competencies: T[],
    turnCompetencyKeys: Array<string | null>,
): T[] {
    const referencedKeys = new Set(turnCompetencyKeys.filter(Boolean));
    const referenced = competencies.filter((item) =>
        referencedKeys.has(item.key),
    );
    const coveredTokens = new Set(
        referenced.flatMap((item) => competencyTokens(item.name)),
    );

    return competencies.filter((item) => {
        if (referencedKeys.has(item.key)) return true;
        const tokens = competencyTokens(item.name);
        if (tokens.length < 2) return true;
        return !tokens.every((token) => coveredTokens.has(token));
    });
}

function canonicalizeReportCompetencies(
    values: unknown[],
    referencedKeys: string[],
): unknown[] {
    const valid = values.filter(
        (
            value,
        ): value is Record<string, unknown> & {
            competencyKey: string;
            name: string;
        } => {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return false;
            const item = value as Record<string, unknown>;
            return (
                typeof item.competencyKey === 'string' &&
                typeof item.name === 'string'
            );
        },
    );
    const canonical = canonicalizeCompetencyMap(
        valid.map((item) => ({
            ...item,
            key: item.competencyKey,
            name: item.name,
        })),
        referencedKeys,
    );
    const retained = new Set(canonical.map((item) => item.competencyKey));
    return values.filter((value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value))
            return true;
        const key = (value as Record<string, unknown>).competencyKey;
        return typeof key !== 'string' || retained.has(key);
    });
}

const COMPETENCY_UMBRELLA_WORDS = new Set([
    'and',
    'core',
    'ecosystem',
    'framework',
    'frontend',
    'fundamentals',
    'tool',
    'tools',
    'va',
    'cong',
    'cu',
    'nen',
    'tang',
    'tich',
    'hop',
    'lam',
    'viec',
]);

function competencyTokens(value: string): string[] {
    const aliases: Record<string, string> = {
        css3: 'css',
        html5: 'html',
        js: 'javascript',
        nextjs: 'next',
        reactjs: 'react',
        ts: 'typescript',
    };
    return [
        ...new Set(
            value
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, ' ')
                .trim()
                .split(/\s+/)
                .map((token) => aliases[token] ?? token)
                .filter(
                    (token) =>
                        token.length > 1 &&
                        !COMPETENCY_UMBRELLA_WORDS.has(token),
                ),
        ),
    ];
}

function sanitizeCandidateFacingText(value: unknown): unknown {
    if (typeof value === 'string') {
        return value
            .replace(/\s*\(\s*(?:turnId\s*:\s*[0-9a-f-]{36}\s*,?\s*)+\)/gi, '')
            .replace(/\s*[,;]?\s*turnId\s*:\s*[0-9a-f-]{36}/gi, '')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
    }
    if (Array.isArray(value)) return value.map(sanitizeCandidateFacingText);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
            key,
            key === 'turnId' || key === 'evidenceTurnIds'
                ? child
                : sanitizeCandidateFacingText(child),
        ]),
    );
}
