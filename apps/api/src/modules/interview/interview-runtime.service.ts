import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {
    Difficulty,
    InterviewAdaptiveAction,
    InterviewAdaptiveStatus,
    InterviewPlannedQuestionStatus,
    InterviewProbeType,
    InterviewScoringImpact,
    ExperienceLevel,
    InterviewAssistanceLevel,
    InterviewPlanStatus,
    InterviewStatus,
    InterviewTurnOrigin,
    Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdaptiveInterviewerService } from './adaptive/adaptive-interviewer.service';
import type { AdaptiveInterviewResult } from './adaptive/adaptive-interview.schema';
import {
    InterviewPlanResultSchema,
    type InterviewPlanResult,
} from './planning/interview-plan.schema';

const ADAPTIVE_STALE_MS = 90_000;
const MAX_ADAPTIVE_DEPTH = 2;

@Injectable()
export class InterviewRuntimeService {
    private readonly logger = new Logger(InterviewRuntimeService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly adaptive: AdaptiveInterviewerService,
    ) {}

    async getState(userId: string, interviewId: string) {
        await this.recoverStaleAdaptiveWork(userId, interviewId);
        const interview = await this.prisma.interview.findFirst({
            where: { id: interviewId, userId },
            select: {
                id: true,
                status: true,
                interviewType: true,
                targetRole: true,
                targetLevel: true,
                durationMinutes: true,
                focusAreas: true,
                session: {
                    select: {
                        id: true,
                        startedAt: true,
                        completedAt: true,
                        plan: { select: { id: true, version: true } },
                        turns: {
                            orderBy: { runtimeOrder: 'asc' },
                            select: {
                                id: true,
                                runtimeOrder: true,
                                sectionIndex: true,
                                sectionTitle: true,
                                questionType: true,
                                questionText: true,
                                origin: true,
                                answeredAt: true,
                                adaptiveStatus: true,
                                plannedStatus: true,
                                probeType: true,
                            },
                        },
                    },
                },
            },
        });
        if (!interview) throw this.notFound();
        const session = interview.session;
        if (!session) {
            if (
                interview.status === InterviewStatus.IN_PROGRESS ||
                interview.status === InterviewStatus.COMPLETED
            ) {
                throw new ConflictException({
                    code: 'INTERVIEW_RUNTIME_CORRUPTED',
                    message: 'Trạng thái buổi phỏng vấn không nhất quán.',
                });
            }
            return this.emptyState(interview);
        }
        const processing = session.turns.some(
            (turn) =>
                turn.answeredAt !== null &&
                turn.adaptiveStatus === InterviewAdaptiveStatus.PROCESSING,
        );
        const completedQuestions = session.turns.filter(
            (turn) => turn.answeredAt !== null,
        ).length;
        const currentTurn = processing
            ? undefined
            : session.turns.find((turn) => this.isActiveTurn(turn));

        const totalSections = new Set(
            session.turns.map((turn) => turn.sectionIndex),
        ).size;
        const displayOrdinal = currentTurn
            ? session.turns.findIndex((turn) => turn.id === currentTurn.id) + 1
            : completedQuestions;
        const completed =
            interview.status === InterviewStatus.COMPLETED &&
            session.completedAt !== null;
        return {
            interview: this.summary(interview),
            session: {
                id: session.id,
                planId: session.plan.id,
                planVersion: session.plan.version,
                startedAt: session.startedAt,
                completedAt: session.completedAt,
            },
            currentTurn: currentTurn
                ? {
                      id: currentTurn.id,
                      ordinal: displayOrdinal,
                      sectionIndex: currentTurn.sectionIndex,
                      sectionTitle: currentTurn.sectionTitle,
                      questionType: currentTurn.questionType,
                      questionText: currentTurn.questionText,
                  }
                : null,
            progress: {
                currentSection: currentTurn?.sectionTitle ?? null,
                sectionNumber: currentTurn
                    ? currentTurn.sectionIndex + 1
                    : totalSections,
                totalSections,
            },
            processing,
            completed,
        };
    }

    async start(userId: string, interviewId: string) {
        const interview = await this.prisma.interview.findFirst({
            where: { id: interviewId, userId },
            select: {
                id: true,
                status: true,
                targetLevel: true,
                session: { select: { id: true } },
                plans: {
                    where: { status: InterviewPlanStatus.COMPLETED },
                    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
                    take: 1,
                    select: { id: true, planData: true },
                },
            },
        });
        if (!interview) throw this.notFound();
        if (
            interview.status === InterviewStatus.IN_PROGRESS &&
            interview.session
        )
            return this.getState(userId, interviewId);
        if (interview.status === InterviewStatus.COMPLETED)
            throw new ConflictException({
                code: 'INTERVIEW_ALREADY_COMPLETED',
                message: 'Buổi phỏng vấn này đã hoàn thành.',
            });
        if (interview.status !== InterviewStatus.READY)
            throw new ConflictException({
                code: 'INTERVIEW_NOT_READY',
                message: 'Buổi phỏng vấn chưa sẵn sàng để bắt đầu.',
            });
        const plan = interview.plans[0];
        if (!plan?.planData)
            throw new ConflictException({
                code: 'INTERVIEW_PLAN_UNAVAILABLE',
                message: 'Không có kế hoạch phỏng vấn hợp lệ để bắt đầu.',
            });
        const parsed = InterviewPlanResultSchema.safeParse(plan.planData);
        if (!parsed.success) throw this.invalidPlan();
        const turns = this.flattenPlan(parsed.data, interview.targetLevel);
        try {
            await this.prisma.$transaction(async (tx) => {
                const transitioned = await tx.interview.updateMany({
                    where: {
                        id: interviewId,
                        userId,
                        status: InterviewStatus.READY,
                    },
                    data: { status: InterviewStatus.IN_PROGRESS },
                });
                if (transitioned.count !== 1)
                    throw new ConflictException({
                        code: 'INTERVIEW_START_CONFLICT',
                        message:
                            'Buổi phỏng vấn đã được bắt đầu ở một yêu cầu khác.',
                    });
                const session = await tx.interviewSession.create({
                    data: { interviewId, planId: plan.id },
                    select: { id: true },
                });
                await tx.interviewTurn.createMany({
                    data: turns.map((turn) => ({
                        sessionId: session.id,
                        ...turn,
                    })),
                });
            });
        } catch (error) {
            const state = await this.tryGetActiveState(userId, interviewId);
            if (state) return state;
            throw error;
        }
        return this.getState(userId, interviewId);
    }

    async submitAnswer(
        userId: string,
        interviewId: string,
        turnId: string,
        answer: string,
    ) {
        const accepted = await this.acceptAnswer(
            userId,
            interviewId,
            turnId,
            answer,
        );
        let output:
            | Awaited<ReturnType<AdaptiveInterviewerService['evaluate']>>
            | undefined;
        try {
            output = await this.adaptive.evaluate(
                this.buildAdaptiveContext(accepted, answer),
            );
        } catch {
            this.logger.warn(
                `Adaptive AI failed for turn ${turnId}; continuing with planned fallback.`,
            );
        }
        await this.finalizeAdaptiveDecision(accepted, output);
        return this.getState(userId, interviewId);
    }
    private async acceptAnswer(
        userId: string,
        interviewId: string,
        turnId: string,
        answer: string,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const interview = await tx.interview.findFirst({
                where: { id: interviewId, userId },
                select: {
                    id: true,
                    status: true,
                    interviewType: true,
                    targetRole: true,
                    targetLevel: true,
                    durationMinutes: true,
                    sourceContextSnapshot: true,
                    session: {
                        select: {
                            id: true,
                            startedAt: true,
                            completedAt: true,
                            plan: { select: { planData: true } },
                            turns: {
                                orderBy: { runtimeOrder: 'asc' },
                                select: {
                                    id: true,
                                    ordinal: true,
                                    runtimeOrder: true,
                                    plannedQuestionKey: true,
                                    rootPlannedQuestionKey: true,
                                    sectionIndex: true,
                                    sectionTitle: true,
                                    questionType: true,
                                    topic: true,
                                    competencyKey: true,
                                    difficulty: true,
                                    questionText: true,
                                    answerText: true,
                                    answerAssessment: true,
                                    origin: true,
                                    assistanceLevel: true,
                                    depth: true,
                                    answeredAt: true,
                                    plannedStatus: true,
                                    probeType: true,
                                    questionLevel: true,
                                    scoringImpact: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!interview) throw this.notFound();
            if (
                interview.status === InterviewStatus.COMPLETED ||
                interview.session?.completedAt
            ) {
                throw new ConflictException({
                    code: 'INTERVIEW_ALREADY_COMPLETED',
                    message: 'Buổi phỏng vấn này đã hoàn thành.',
                });
            }
            if (
                interview.status !== InterviewStatus.IN_PROGRESS ||
                !interview.session
            ) {
                throw new ConflictException({
                    code: 'INTERVIEW_NOT_IN_PROGRESS',
                    message: 'Buổi phỏng vấn chưa được bắt đầu.',
                });
            }
            const current = interview.session.turns.find((turn) =>
                this.isActiveTurn(turn),
            );
            if (!current || current.id !== turnId) {
                throw new ConflictException({
                    code: 'INTERVIEW_TURN_STALE',
                    message:
                        'Câu hỏi đã thay đổi ở một phiên khác. Vui lòng tiếp tục với câu hỏi hiện tại.',
                });
            }
            const updated = await tx.interviewTurn.updateMany({
                where: {
                    id: turnId,
                    sessionId: interview.session.id,
                    answeredAt: null,
                    adaptiveStatus: InterviewAdaptiveStatus.IDLE,
                },
                data: {
                    answerText: answer,
                    answeredAt: new Date(),
                    adaptiveStatus: InterviewAdaptiveStatus.PROCESSING,
                },
            });
            if (updated.count !== 1)
                throw new ConflictException({
                    code: 'INTERVIEW_TURN_STALE',
                    message: 'Câu trả lời này đã được gửi trước đó.',
                });
            return { userId, interview, current };
        });
    }

    private buildAdaptiveContext(
        accepted: Awaited<ReturnType<InterviewRuntimeService['acceptAnswer']>>,
        candidateAnswer: string,
    ) {
        const { interview, current } = accepted;
        const turns = interview.session!.turns;
        const plan = InterviewPlanResultSchema.safeParse(
            interview.session!.plan.planData,
        );
        const plannedQuestion = plan.success
            ? plan.data.sections
                  .flatMap((section) => section.questions)
                  .find(
                      (question) =>
                          `planned:${question.order}` ===
                          current.rootPlannedQuestionKey,
                  )
            : undefined;
        const remainingPlanned = turns
            .filter(
                (turn) =>
                    turn.origin === InterviewTurnOrigin.PLANNED_MAIN &&
                    turn.plannedStatus ===
                        InterviewPlannedQuestionStatus.PENDING,
            )
            .map((turn) => ({
                key: turn.plannedQuestionKey,
                sectionIndex: turn.sectionIndex,
                section: turn.sectionTitle,
                topic: turn.topic,
                questionType: turn.questionType,
                suggestedQuestion: turn.questionText,
                ...this.plannedQuestionMetadata(
                    interview.session!.plan.planData,
                    turn.plannedQuestionKey,
                ),
            }));
        const rootTurns = turns.filter(
            (turn) =>
                turn.rootPlannedQuestionKey === current.rootPlannedQuestionKey,
        );
        return {
            role: interview.targetRole,
            level: interview.targetLevel,
            interviewType: interview.interviewType,
            preferredLanguage: this.readPreferredLanguage(
                interview.sourceContextSnapshot,
            ),
            trustedPriorities: this.pickTrustedPriorities(
                interview.sourceContextSnapshot,
            ),
            current: {
                section: current.sectionTitle,
                questionType: current.questionType,
                topic: current.topic,
                competencyKey: current.competencyKey,
                difficulty: current.difficulty,
                questionShown: current.questionText,
                depth: current.depth,
                assistanceUsed: current.assistanceLevel,
                topicPriority: this.topicPriority(
                    current.topic,
                    current.questionType,
                    interview.sourceContextSnapshot,
                ),
                plannedFollowUpGuidance:
                    plannedQuestion?.followUpStrategy ?? null,
            },
            candidateAnswer,
            strategy: plan.success
                ? {
                      roleBaseline: plan.data.roleBaseline ?? [],
                      competencyMap: plan.data.competencyMap ?? [],
                  }
                : { roleBaseline: [], competencyMap: [] },
            coverage: {
                competencies: (plan.success
                    ? (plan.data.competencyMap ?? [])
                    : []
                ).map((competency) => ({
                    ...competency,
                    answeredTurns: turns.filter(
                        (turn) =>
                            turn.competencyKey === competency.key &&
                            turn.answeredAt !== null,
                    ).length,
                    pendingQuestions: remainingPlanned.filter(
                        (question) => question.competencyKey === competency.key,
                    ).length,
                })),
                evidenceTurnsForCurrentTopic: rootTurns.length,
                adaptiveDepth: current.depth,
                remainingPlannedCount: remainingPlanned.length,
                remainingPlanned: remainingPlanned.slice(0, 12),
            },
            candidateHistory: turns
                .filter((turn) => turn.answeredAt !== null)
                .slice(-6)
                .map((turn) => ({
                    question: turn.questionText,
                    answer: turn.answerText?.slice(0, 2_000),
                    topic: turn.topic,
                    competencyKey: turn.competencyKey,
                    depth: turn.depth,
                    assistance: turn.assistanceLevel,
                    assessment: turn.answerAssessment,
                })),
        };
    }

    private async finalizeAdaptiveDecision(
        accepted: Awaited<ReturnType<InterviewRuntimeService['acceptAnswer']>>,
        output:
            | Awaited<ReturnType<AdaptiveInterviewerService['evaluate']>>
            | undefined,
    ) {
        const { interview, current, userId } = accepted;
        await this.prisma.$transaction(async (tx) => {
            const turn = await tx.interviewTurn.findFirst({
                where: {
                    id: current.id,
                    sessionId: interview.session!.id,
                    adaptiveStatus: InterviewAdaptiveStatus.PROCESSING,
                },
                select: {
                    id: true,
                    runtimeOrder: true,
                    rootPlannedQuestionKey: true,
                    sectionIndex: true,
                    sectionTitle: true,
                    questionType: true,
                    topic: true,
                    competencyKey: true,
                    difficulty: true,
                    depth: true,
                    probeType: true,
                    questionLevel: true,
                },
            });
            if (!turn) return;

            const pending = await tx.interviewTurn.findMany({
                where: {
                    sessionId: interview.session!.id,
                    origin: InterviewTurnOrigin.PLANNED_MAIN,
                    plannedStatus: InterviewPlannedQuestionStatus.PENDING,
                },
                orderBy: { runtimeOrder: 'asc' },
                select: {
                    id: true,
                    plannedQuestionKey: true,
                    questionType: true,
                    questionText: true,
                    runtimeOrder: true,
                    sectionIndex: true,
                },
            });
            const decision = output?.result;
            const coveredKeys = new Set(
                (decision?.coveredPlannedQuestionKeys ?? []).filter(
                    (key) =>
                        key !== decision?.selectedPlannedQuestionKey &&
                        pending.some(
                            (candidate) =>
                                candidate.plannedQuestionKey === key &&
                                candidate.questionType !== 'CANDIDATE' &&
                                candidate.sectionIndex <= turn.sectionIndex,
                        ),
                ),
            );
            if (coveredKeys.size > 0) {
                await tx.interviewTurn.updateMany({
                    where: {
                        sessionId: interview.session!.id,
                        plannedQuestionKey: { in: [...coveredKeys] },
                        plannedStatus: InterviewPlannedQuestionStatus.PENDING,
                    },
                    data: {
                        plannedStatus:
                            InterviewPlannedQuestionStatus.COVERED_INDIRECTLY,
                        coveredByTurnId: turn.id,
                        coverageEvidence: decision?.assessment.evidenceGained
                            ? (decision.assessment
                                  .evidenceGained as Prisma.InputJsonValue)
                            : Prisma.JsonNull,
                        dispositionReason:
                            'Evidence was already demonstrated in an earlier answer.',
                    },
                });
            }

            const redundantKeys = new Set<string>();
            if (decision?.topicSaturated && turn.competencyKey) {
                for (const candidate of pending) {
                    if (
                        candidate.questionType !== 'CANDIDATE' &&
                        candidate.sectionIndex === turn.sectionIndex &&
                        candidate.plannedQuestionKey !==
                            decision.selectedPlannedQuestionKey &&
                        this.plannedQuestionMetadata(
                            interview.session!.plan.planData,
                            candidate.plannedQuestionKey,
                        ).competencyKey === turn.competencyKey
                    ) {
                        redundantKeys.add(candidate.plannedQuestionKey);
                    }
                }
                if (redundantKeys.size > 0) {
                    await tx.interviewTurn.updateMany({
                        where: {
                            sessionId: interview.session!.id,
                            plannedQuestionKey: { in: [...redundantKeys] },
                            plannedStatus:
                                InterviewPlannedQuestionStatus.PENDING,
                        },
                        data: {
                            plannedStatus:
                                InterviewPlannedQuestionStatus.SKIPPED_REDUNDANT,
                            coveredByTurnId: turn.id,
                            dispositionReason:
                                'Competency already had sufficient evidence; redundant pool option skipped.',
                        },
                    });
                }
            }

            let candidatesAfterCoverage = pending.filter(
                (candidate) =>
                    !coveredKeys.has(candidate.plannedQuestionKey) &&
                    !redundantKeys.has(candidate.plannedQuestionKey),
            );
            const rootAdaptiveCount = await tx.interviewTurn.count({
                where: {
                    sessionId: interview.session!.id,
                    rootPlannedQuestionKey: turn.rootPlannedQuestionKey,
                    origin: InterviewTurnOrigin.ADAPTIVE,
                },
            });
            let action = this.guardDecision({
                decision,
                current: turn,
                rootAdaptiveCount,
                plannedMaxDepth: this.plannedMaxDepth(
                    interview.session!.plan.planData,
                    turn.rootPlannedQuestionKey,
                ),
                sourceContext: interview.sourceContextSnapshot,
            });
            if (
                action === InterviewAdaptiveAction.INCREASE_DEPTH &&
                !this.isValidStretch(
                    interview.targetLevel,
                    turn.probeType,
                    decision,
                )
            ) {
                action = null;
            }

            this.logger.debug(
                `Adaptive decision for turn ${turn.id}: ai=${decision?.decision ?? 'FALLBACK'}, guarded=${action ?? 'NEXT'}, saturated=${decision?.topicSaturated ?? false}, depth=${turn.depth}`,
            );

            let createdAdaptive = false;
            if (action && decision?.nextQuestion) {
                const stretch =
                    decision.probeType === 'STRETCH_PROBE' &&
                    action === InterviewAdaptiveAction.INCREASE_DEPTH;
                await tx.interviewTurn.create({
                    data: {
                        sessionId: interview.session!.id,
                        ordinal: null,
                        runtimeOrder: turn.runtimeOrder + 1,
                        plannedQuestionKey: `adaptive:${turn.id}`,
                        rootPlannedQuestionKey: turn.rootPlannedQuestionKey,
                        parentTurnId: turn.id,
                        origin: InterviewTurnOrigin.ADAPTIVE,
                        probeType: stretch
                            ? InterviewProbeType.STRETCH_PROBE
                            : InterviewProbeType.SAME_LEVEL_PROBE,
                        questionLevel: stretch
                            ? (decision.questionLevel as ExperienceLevel)
                            : interview.targetLevel,
                        scoringImpact: stretch
                            ? InterviewScoringImpact.BONUS_ONLY
                            : InterviewScoringImpact.TARGET_LEVEL,
                        adaptiveAction: action,
                        assistanceLevel: this.assistanceFor(
                            action,
                            decision.assistanceLevel,
                        ),
                        depth: turn.depth + 1,
                        sectionIndex: turn.sectionIndex,
                        sectionTitle: turn.sectionTitle,
                        questionType: turn.questionType,
                        topic: turn.topic,
                        competencyKey: turn.competencyKey,
                        difficulty: this.nextDifficulty(
                            turn.difficulty,
                            action,
                        ),
                        questionText: decision.nextQuestion,
                    },
                });
                createdAdaptive = true;
            }

            if (!createdAdaptive) {
                const available = !decision
                    ? [...candidatesAfterCoverage].sort((left, right) => {
                          const rank = (
                              candidate: (typeof pending)[number],
                          ) => {
                              if (candidate.questionType === 'CANDIDATE')
                                  return 3;
                              if (candidate.sectionIndex !== turn.sectionIndex)
                                  return 2;
                              const priority = this.plannedQuestionMetadata(
                                  interview.session!.plan.planData,
                                  candidate.plannedQuestionKey,
                              ).priority;
                              return priority === 'KEY' || priority === 'HIGH'
                                  ? 0
                                  : 1;
                          };
                          return (
                              rank(left) - rank(right) ||
                              left.runtimeOrder - right.runtimeOrder
                          );
                      })
                    : candidatesAfterCoverage;
                const next = this.chooseNextPlanned(
                    available,
                    decision?.selectedPlannedQuestionKey,
                );
                if (next) {
                    await tx.interviewTurn.updateMany({
                        where: {
                            id: next.id,
                            plannedStatus:
                                InterviewPlannedQuestionStatus.PENDING,
                        },
                        data: {
                            plannedStatus: InterviewPlannedQuestionStatus.ASKED,
                            questionText:
                                decision?.selectedPlannedQuestionKey ===
                                    next.plannedQuestionKey &&
                                decision.nextQuestion
                                    ? decision.nextQuestion
                                    : next.questionText,
                            dispositionReason:
                                decision?.reason ??
                                'Selected by deterministic coverage fallback.',
                        },
                    });
                }
            }

            await tx.interviewTurn.update({
                where: { id: turn.id },
                data: {
                    answerAssessment: decision?.assessment
                        ? (decision.assessment as Prisma.InputJsonValue)
                        : Prisma.JsonNull,
                    decisionReason:
                        decision?.reason ??
                        'Adaptive AI unavailable; continued with coverage fallback.',
                    adaptiveStatus: output
                        ? InterviewAdaptiveStatus.COMPLETED
                        : InterviewAdaptiveStatus.FAILED,
                    adaptiveProcessedAt: new Date(),
                    modelProvider: output?.metadata.modelProvider,
                    modelName: output?.metadata.modelName,
                    promptVersion: output?.metadata.promptVersion,
                },
            });

            const activeOrPending = await tx.interviewTurn.count({
                where: {
                    sessionId: interview.session!.id,
                    OR: [
                        {
                            origin: InterviewTurnOrigin.ADAPTIVE,
                            answeredAt: null,
                        },
                        {
                            origin: InterviewTurnOrigin.PLANNED_MAIN,
                            plannedStatus: {
                                in: [
                                    InterviewPlannedQuestionStatus.PENDING,
                                    InterviewPlannedQuestionStatus.ASKED,
                                ],
                            },
                            answeredAt: null,
                        },
                    ],
                },
            });
            if (activeOrPending === 0) {
                const now = new Date();
                await tx.interviewSession.updateMany({
                    where: { id: interview.session!.id, completedAt: null },
                    data: { completedAt: now },
                });
                await tx.interview.updateMany({
                    where: {
                        id: interview.id,
                        userId,
                        status: InterviewStatus.IN_PROGRESS,
                    },
                    data: { status: InterviewStatus.COMPLETED },
                });
            }
        });
    }
    private guardDecision(input: {
        decision: AdaptiveInterviewResult | undefined;
        current: { questionType: string; topic: string | null; depth: number };
        rootAdaptiveCount: number;
        plannedMaxDepth: number;
        sourceContext: Prisma.JsonValue;
    }): InterviewAdaptiveAction | null {
        const { decision, current } = input;
        if (
            !decision ||
            decision.decision === 'NEXT' ||
            decision.decision === 'CHANGE_TOPIC' ||
            decision.topicSaturated ||
            !decision.nextQuestion ||
            current.questionType === 'CANDIDATE'
        )
            return null;
        const priority = this.topicPriority(
            current.topic,
            current.questionType,
            input.sourceContext,
        );
        const priorityLimit = Math.min(
            priority === 'KEY' ? 2 : 1,
            input.plannedMaxDepth,
        );
        if (
            current.depth >= MAX_ADAPTIVE_DEPTH ||
            input.rootAdaptiveCount >= priorityLimit
        )
            return null;
        return decision.decision as InterviewAdaptiveAction;
    }

    private flattenPlan(
        plan: InterviewPlanResult,
        targetLevel: ExperienceLevel | null,
    ) {
        let expectedOrder = 1;
        return plan.sections.flatMap((section, sectionIndex) =>
            section.questions.map((question) => {
                if (question.order !== expectedOrder) throw this.invalidPlan();
                const ordinal = expectedOrder++;
                const key = `planned:${question.order}`;
                return {
                    ordinal,
                    runtimeOrder: ordinal * 100,
                    plannedQuestionKey: key,
                    rootPlannedQuestionKey: key,
                    origin: InterviewTurnOrigin.PLANNED_MAIN,
                    plannedStatus:
                        ordinal === 1
                            ? InterviewPlannedQuestionStatus.ASKED
                            : InterviewPlannedQuestionStatus.PENDING,
                    probeType: InterviewProbeType.MAIN_TARGET_LEVEL,
                    questionLevel: targetLevel,
                    scoringImpact: InterviewScoringImpact.TARGET_LEVEL,
                    sectionIndex,
                    sectionTitle: section.title,
                    questionType: question.type,
                    topic: question.topic,
                    competencyKey: question.competencyKey || null,
                    difficulty: question.difficulty,
                    questionText: question.suggestedQuestion,
                };
            }),
        );
    }

    private isActiveTurn(turn: {
        origin: InterviewTurnOrigin;
        answeredAt: Date | null;
        plannedStatus?: InterviewPlannedQuestionStatus | null;
    }) {
        if (turn.answeredAt !== null) return false;
        return (
            turn.origin === InterviewTurnOrigin.ADAPTIVE ||
            turn.plannedStatus === InterviewPlannedQuestionStatus.ASKED ||
            (turn.origin === InterviewTurnOrigin.PLANNED_MAIN &&
                turn.plannedStatus == null)
        );
    }

    private async ensureActiveTurn(userId: string, interviewId: string) {
        const interview = await this.prisma.interview.findFirst({
            where: { id: interviewId, userId },
            select: {
                session: {
                    select: {
                        id: true,
                        completedAt: true,
                        turns: {
                            orderBy: { runtimeOrder: 'asc' },
                            select: {
                                id: true,
                                origin: true,
                                answeredAt: true,
                                adaptiveStatus: true,
                                plannedStatus: true,
                                questionType: true,
                            },
                        },
                    },
                },
            },
        });
        const session = interview?.session;
        if (!session || session.completedAt) return;
        if (
            session.turns.some(
                (turn) =>
                    turn.adaptiveStatus ===
                        InterviewAdaptiveStatus.PROCESSING ||
                    this.isActiveTurn(turn),
            )
        )
            return;
        const pending = session.turns.filter(
            (turn) =>
                turn.plannedStatus === InterviewPlannedQuestionStatus.PENDING,
        );
        const next =
            pending.find((turn) => turn.questionType !== 'CANDIDATE') ??
            pending[0];
        if (!next) return;
        await this.prisma.interviewTurn.updateMany({
            where: {
                id: next.id,
                sessionId: session.id,
                plannedStatus: InterviewPlannedQuestionStatus.PENDING,
            },
            data: { plannedStatus: InterviewPlannedQuestionStatus.ASKED },
        });
    }

    private chooseNextPlanned<
        T extends {
            id: string;
            plannedQuestionKey: string;
            questionType: string;
            sectionIndex: number;
            runtimeOrder: number;
        },
    >(turns: T[], selectedKey?: string | null) {
        const nonClosing = turns.filter(
            (turn) => turn.questionType !== 'CANDIDATE',
        );
        const candidates = nonClosing.length > 0 ? nonClosing : turns;
        const earliestSectionIndex = Math.min(
            ...candidates.map((turn) => turn.sectionIndex),
        );
        const eligible = candidates
            .filter((turn) => turn.sectionIndex === earliestSectionIndex)
            .sort((left, right) => left.runtimeOrder - right.runtimeOrder);
        return (
            eligible.find((turn) => turn.plannedQuestionKey === selectedKey) ??
            eligible[0]
        );
    }

    private isValidStretch(
        targetLevel: ExperienceLevel | null,
        currentProbe: InterviewProbeType,
        decision: AdaptiveInterviewResult | undefined,
    ) {
        if (
            !targetLevel ||
            !decision ||
            decision.probeType !== 'STRETCH_PROBE' ||
            decision.scoringImpact !== 'BONUS_ONLY' ||
            currentProbe === InterviewProbeType.STRETCH_PROBE
        )
            return false;
        const levels = [
            ExperienceLevel.INTERN,
            ExperienceLevel.FRESHER,
            ExperienceLevel.JUNIOR,
            ExperienceLevel.MIDDLE,
            ExperienceLevel.SENIOR,
            ExperienceLevel.LEAD,
        ];
        const next = levels[levels.indexOf(targetLevel) + 1];
        return next !== undefined && decision.questionLevel === next;
    }

    private plannedQuestionMetadata(planData: Prisma.JsonValue, key: string) {
        const parsed = InterviewPlanResultSchema.safeParse(planData);
        if (!parsed.success) return {};
        const question = parsed.data.sections
            .flatMap((section) => section.questions)
            .find((item) => `planned:${item.order}` === key);
        if (!question) return {};
        const competency = parsed.data.competencyMap?.find(
            (item) => item.key === question.competencyKey,
        );
        return {
            competencyKey: question.competencyKey || null,
            competencyName: competency?.name ?? question.topic,
            sources: competency?.sources ?? [],
            priority: competency?.priority ?? question.priority ?? 'MEDIUM',
            expectedDepth:
                competency?.expectedDepth ?? question.expectedDepth ?? null,
            evidenceObjectives: question.evidenceObjectives ??
                competency?.evidenceNeeded ?? [question.objective],
            probeAreas: question.probeAreas ?? competency?.probeAreas ?? [],
        };
    }
    private async recoverStaleAdaptiveWork(
        userId: string,
        interviewId: string,
    ) {
        const cutoff = new Date(Date.now() - ADAPTIVE_STALE_MS);
        const stale = await this.prisma.interviewTurn.findMany({
            where: {
                adaptiveStatus: InterviewAdaptiveStatus.PROCESSING,
                answeredAt: { lt: cutoff },
                session: { interviewId, interview: { userId } },
            },
            select: { id: true, sessionId: true },
        });
        if (stale.length === 0) return;
        await this.prisma.interviewTurn.updateMany({
            where: { id: { in: stale.map((turn) => turn.id) } },
            data: {
                adaptiveStatus: InterviewAdaptiveStatus.FAILED,
                adaptiveProcessedAt: new Date(),
                decisionReason:
                    'Adaptive processing timed out; continued with planned interview.',
            },
        });
        for (const sessionId of new Set(stale.map((turn) => turn.sessionId))) {
            const remaining = await this.prisma.interviewTurn.count({
                where: { sessionId, answeredAt: null },
            });
            if (remaining !== 0) continue;
            const session = await this.prisma.interviewSession.findFirst({
                where: { id: sessionId, interview: { userId } },
                select: { interviewId: true },
            });
            if (!session) continue;
            const now = new Date();
            await this.prisma.$transaction([
                this.prisma.interviewSession.updateMany({
                    where: { id: sessionId, completedAt: null },
                    data: { completedAt: now },
                }),
                this.prisma.interview.updateMany({
                    where: {
                        id: session.interviewId,
                        userId,
                        status: InterviewStatus.IN_PROGRESS,
                    },
                    data: { status: InterviewStatus.COMPLETED },
                }),
            ]);
        }
        await this.ensureActiveTurn(userId, interviewId);
    }
    private plannedMaxDepth(planData: Prisma.JsonValue, rootKey: string) {
        const parsed = InterviewPlanResultSchema.safeParse(planData);
        if (!parsed.success) return 0;
        const question = parsed.data.sections
            .flatMap((section) => section.questions)
            .find((item) => `planned:${item.order}` === rootKey);
        return question?.followUpStrategy.maxDepth ?? 0;
    }
    private topicPriority(
        topic: string | null,
        questionType: string,
        sourceContext: Prisma.JsonValue,
    ) {
        if (questionType === 'CANDIDATE' || questionType === 'GENERAL')
            return 'LOW';
        if (!topic) return 'MEDIUM';
        const source = JSON.stringify(
            this.pickTrustedPriorities(sourceContext),
        ).toLocaleLowerCase('en-US');
        return source.includes(topic.toLocaleLowerCase('en-US'))
            ? 'KEY'
            : questionType === 'TECHNICAL' || questionType === 'PROJECT'
              ? 'HIGH'
              : 'MEDIUM';
    }

    private pickTrustedPriorities(source: Prisma.JsonValue) {
        if (!source || typeof source !== 'object' || Array.isArray(source))
            return null;
        const value = source as Record<string, unknown>;
        const jd = this.record(value.jd);
        const jdAnalysis = this.record(jd?.analysis);
        const match = this.record(value.match);
        const configuration = this.record(value.configuration);
        return {
            requiredSkills: jdAnalysis?.requiredSkills ?? [],
            preferredSkills: jdAnalysis?.preferredSkills ?? [],
            interviewFocus: jdAnalysis?.interviewFocus ?? [],
            matchGaps: match?.gaps ?? [],
            focusAreas: configuration?.focusAreas ?? [],
        };
    }

    private readPreferredLanguage(source: Prisma.JsonValue) {
        if (!source || typeof source !== 'object' || Array.isArray(source))
            return 'VI';
        const profile = this.record(
            (source as Record<string, unknown>).candidateProfile,
        );
        return profile?.preferredLanguage === 'EN' ? 'EN' : 'VI';
    }

    private record(value: unknown): Record<string, unknown> | null {
        return value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : null;
    }

    private assistanceFor(
        action: InterviewAdaptiveAction,
        suggested: AdaptiveInterviewResult['assistanceLevel'],
    ) {
        if (action === InterviewAdaptiveAction.REPHRASE)
            return InterviewAssistanceLevel.REPHRASE;
        if (action === InterviewAdaptiveAction.DECREASE_DEPTH)
            return suggested === 'LIGHT_HINT'
                ? InterviewAssistanceLevel.LIGHT_HINT
                : InterviewAssistanceLevel.SIMPLIFIED;
        return InterviewAssistanceLevel.NONE;
    }

    private nextDifficulty(
        current: Difficulty | null,
        action: InterviewAdaptiveAction,
    ) {
        if (action === InterviewAdaptiveAction.INCREASE_DEPTH)
            return Difficulty.HARD;
        if (action === InterviewAdaptiveAction.DECREASE_DEPTH)
            return Difficulty.EASY;
        return current;
    }

    private emptyState(interview: {
        id: string;
        status: InterviewStatus;
        interviewType: string;
        targetRole: string;
        targetLevel: string | null;
        durationMinutes: number;
        focusAreas?: Prisma.JsonValue;
    }) {
        return {
            interview: this.summary(interview),
            session: null,
            currentTurn: null,
            progress: {
                currentSection: null,
                sectionNumber: 0,
                totalSections: 0,
            },
            processing: false,
            completed: false,
        };
    }

    private summary(interview: {
        id: string;
        status: InterviewStatus;
        interviewType: string;
        targetRole: string;
        targetLevel: string | null;
        durationMinutes: number;
        focusAreas?: Prisma.JsonValue;
    }) {
        return {
            id: interview.id,
            status: interview.status,
            interviewType: interview.interviewType,
            targetRole: interview.targetRole,
            targetLevel: interview.targetLevel,
            durationMinutes: interview.durationMinutes,
            focusAreas: this.stringArray(interview.focusAreas),
        };
    }

    private stringArray(value: Prisma.JsonValue | undefined) {
        if (!Array.isArray(value)) return [];
        return value.filter(
            (item): item is string =>
                typeof item === 'string' && item.trim().length > 0,
        );
    }

    private async tryGetActiveState(userId: string, interviewId: string) {
        try {
            const state = await this.getState(userId, interviewId);
            return state.session ? state : null;
        } catch {
            return null;
        }
    }

    private notFound() {
        return new NotFoundException({
            code: 'INTERVIEW_NOT_FOUND',
            message: 'Không tìm thấy buổi phỏng vấn.',
        });
    }
    private invalidPlan() {
        return new ConflictException({
            code: 'INTERVIEW_PLAN_INVALID',
            message: 'Kế hoạch phỏng vấn không hợp lệ để thực thi.',
        });
    }
}
