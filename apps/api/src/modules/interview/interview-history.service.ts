import { Injectable, NotFoundException } from '@nestjs/common';
import {
    InterviewEvaluationStatus,
    InterviewStatus,
    Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReviewSectionSchema } from './evaluation/interview-evaluation.schema';
import {
    InterviewHistoryQueryDto,
    InterviewHistorySort,
} from './dto/interview-history-query.dto';
import { InterviewProgressQueryDto } from './dto/interview-progress-query.dto';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class InterviewHistoryService {
    constructor(private readonly prisma: PrismaService) {}

    async history(userId: string, query: InterviewHistoryQueryDto) {
        const where = this.historyWhere(userId, query);
        const orderBy: Prisma.InterviewOrderByWithRelationInput[] =
            query.sort === InterviewHistorySort.OLDEST
                ? [{ createdAt: 'asc' }, { id: 'asc' }]
                : query.sort === InterviewHistorySort.HIGHEST_SCORE
                  ? [
                        {
                            evaluation: {
                                overallScore: { sort: 'desc', nulls: 'last' },
                            },
                        },
                        { createdAt: 'desc' },
                        { id: 'desc' },
                    ]
                  : query.sort === InterviewHistorySort.LOWEST_SCORE
                    ? [
                          {
                              evaluation: {
                                  overallScore: {
                                      sort: 'asc',
                                      nulls: 'last',
                                  },
                              },
                          },
                          { createdAt: 'desc' },
                          { id: 'desc' },
                      ]
                    : [{ createdAt: 'desc' }, { id: 'desc' }];

        const [items, total] = await this.prisma.$transaction([
            this.prisma.interview.findMany({
                where,
                orderBy,
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                select: {
                    id: true,
                    status: true,
                    interviewType: true,
                    difficulty: true,
                    durationMinutes: true,
                    questionCount: true,
                    targetRole: true,
                    targetLevel: true,
                    createdAt: true,
                    updatedAt: true,
                    cv: { select: { id: true, name: true } },
                    jobDescription: {
                        select: { id: true, title: true, company: true },
                    },
                    session: {
                        select: {
                            id: true,
                            startedAt: true,
                            completedAt: true,
                            _count: { select: { turns: true } },
                        },
                    },
                    evaluation: {
                        select: {
                            status: true,
                            overallScore: true,
                            coverage: true,
                            confidence: true,
                            levelAssessment: true,
                            rubricVersion: true,
                            completedAt: true,
                        },
                    },
                },
            }),
            this.prisma.interview.count({ where }),
        ]);

        return {
            items: items.map((item) => ({
                ...item,
                session: item.session
                    ? {
                          id: item.session.id,
                          startedAt: item.session.startedAt,
                          completedAt: item.session.completedAt,
                          turnCount: item.session._count.turns,
                      }
                    : null,
                evaluation: item.evaluation
                    ? {
                          ...item.evaluation,
                          overallScore: decimal(item.evaluation.overallScore),
                          coverage: decimal(item.evaluation.coverage),
                      }
                    : null,
            })),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        };
    }

    async transcript(userId: string, interviewId: string) {
        const interview = await this.prisma.interview.findFirst({
            where: { id: interviewId, userId },
            select: {
                id: true,
                status: true,
                targetRole: true,
                targetLevel: true,
                interviewType: true,
                durationMinutes: true,
                createdAt: true,
                session: {
                    select: {
                        id: true,
                        startedAt: true,
                        completedAt: true,
                        turns: {
                            where: { answerText: { not: null } },
                            orderBy: { runtimeOrder: 'asc' },
                            select: {
                                id: true,
                                runtimeOrder: true,
                                sectionIndex: true,
                                sectionTitle: true,
                                questionType: true,
                                topic: true,
                                questionText: true,
                                answerText: true,
                                answeredAt: true,
                            },
                        },
                    },
                },
                evaluation: {
                    select: {
                        status: true,
                        reportData: true,
                        completedAt: true,
                    },
                },
            },
        });
        if (!interview)
            throw new NotFoundException({
                code: 'INTERVIEW_NOT_FOUND',
                message: 'Không tìm thấy buổi phỏng vấn.',
            });

        const report = record(interview.evaluation?.reportData);
        const reviews = arrayOfRecords(report?.answerReviews);
        const reviewByTurn = new Map(
            reviews
                .filter((review) => typeof review.turnId === 'string')
                .map((review) => [review.turnId as string, review]),
        );

        return {
            interview: {
                id: interview.id,
                status: interview.status,
                targetRole: interview.targetRole,
                targetLevel: interview.targetLevel,
                interviewType: interview.interviewType,
                durationMinutes: interview.durationMinutes,
                createdAt: interview.createdAt,
            },
            session: interview.session
                ? {
                      id: interview.session.id,
                      startedAt: interview.session.startedAt,
                      completedAt: interview.session.completedAt,
                  }
                : null,
            evaluation: interview.evaluation
                ? {
                      status: interview.evaluation.status,
                      completedAt: interview.evaluation.completedAt,
                  }
                : null,
            turns:
                interview.session?.turns.map((turn) => ({
                    ...turn,
                    feedback: sanitizeReview(reviewByTurn.get(turn.id)),
                })) ?? [],
        };
    }

    async progress(userId: string, query: InterviewProgressQueryDto) {
        const where: Prisma.InterviewEvaluationWhereInput = {
            status: InterviewEvaluationStatus.COMPLETED,
            overallScore: { not: null },
            interview: {
                userId,
                status: InterviewStatus.COMPLETED,
                ...(query.role
                    ? {
                          targetRole: {
                              equals: query.role,
                              mode: 'insensitive',
                          },
                      }
                    : {}),
                ...(query.level ? { targetLevel: query.level } : {}),
                ...(query.interviewType
                    ? { interviewType: query.interviewType }
                    : {}),
                ...dateFilter(query.from, query.to),
            },
        };
        const [completedInterviewCount, evaluations] =
            await this.prisma.$transaction([
                this.prisma.interview.count({
                    where: {
                        userId,
                        status: InterviewStatus.COMPLETED,
                        ...(query.role
                            ? {
                                  targetRole: {
                                      equals: query.role,
                                      mode: 'insensitive',
                                  },
                              }
                            : {}),
                        ...(query.level ? { targetLevel: query.level } : {}),
                        ...(query.interviewType
                            ? { interviewType: query.interviewType }
                            : {}),
                        ...dateFilter(query.from, query.to),
                    },
                }),
                this.prisma.interviewEvaluation.findMany({
                    where,
                    orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
                    take: 100,
                    select: {
                        interviewId: true,
                        overallScore: true,
                        coverage: true,
                        confidence: true,
                        rubricVersion: true,
                        completedAt: true,
                        reportData: true,
                        interview: {
                            select: {
                                targetRole: true,
                                targetLevel: true,
                                interviewType: true,
                            },
                        },
                    },
                }),
            ]);

        const groups = new Map<string, typeof evaluations>();
        for (const item of evaluations) {
            const key = comparisonKey(item);
            groups.set(key, [...(groups.get(key) ?? []), item]);
        }
        const latest = evaluations.at(-1);
        const activeKey = latest ? comparisonKey(latest) : null;
        const comparable = activeKey ? (groups.get(activeKey) ?? []) : [];

        const competencySeries = new Map<
            string,
            {
                competencyKey: string;
                name: string;
                points: Array<{
                    interviewId: string;
                    score: number;
                    date: Date | null;
                    coverageStatus: string;
                    confidence: string;
                }>;
            }
        >();
        const weaknessGroups = new Map<
            string,
            {
                competencyKey: string;
                subarea: string;
                category: string;
                occurrences: Array<{
                    interviewId: string;
                    date: Date | null;
                    severity: string;
                    observation: string;
                }>;
            }
        >();

        for (const item of comparable) {
            const report = record(item.reportData);
            for (const competency of arrayOfRecords(report?.competencies)) {
                if (
                    typeof competency.competencyKey !== 'string' ||
                    typeof competency.name !== 'string' ||
                    typeof competency.score !== 'number'
                )
                    continue;
                const current = competencySeries.get(
                    competency.competencyKey,
                ) ?? {
                    competencyKey: competency.competencyKey,
                    name: competency.name,
                    points: [],
                };
                current.points.push({
                    interviewId: item.interviewId,
                    score: competency.score,
                    date: item.completedAt,
                    coverageStatus:
                        typeof competency.coverageStatus === 'string'
                            ? competency.coverageStatus
                            : 'UNKNOWN',
                    confidence:
                        typeof competency.confidence === 'string'
                            ? competency.confidence
                            : 'LOW',
                });
                competencySeries.set(competency.competencyKey, current);
            }
            for (const finding of arrayOfRecords(report?.diagnosticFindings)) {
                if (
                    typeof finding.competencyKey !== 'string' ||
                    typeof finding.subarea !== 'string' ||
                    typeof finding.category !== 'string' ||
                    !['DEMONSTRATED_GAP', 'PARTIALLY_DEMONSTRATED'].includes(
                        String(finding.evidenceStatus),
                    )
                )
                    continue;
                const key = [
                    finding.competencyKey,
                    normalize(finding.subarea),
                    finding.category,
                ].join(':');
                const current = weaknessGroups.get(key) ?? {
                    competencyKey: finding.competencyKey,
                    subarea: finding.subarea,
                    category: finding.category,
                    occurrences: [],
                };
                current.occurrences.push({
                    interviewId: item.interviewId,
                    date: item.completedAt,
                    severity:
                        typeof finding.severity === 'string'
                            ? finding.severity
                            : 'MEDIUM',
                    observation:
                        typeof finding.observation === 'string'
                            ? finding.observation
                            : '',
                });
                weaknessGroups.set(key, current);
            }
        }

        const overallSeries = comparable.map((item) => ({
            interviewId: item.interviewId,
            score: decimal(item.overallScore)!,
            coverage: decimal(item.coverage),
            confidence: item.confidence,
            date: item.completedAt,
        }));
        return {
            summary: {
                completedInterviewCount,
                evaluatedInterviewCount: evaluations.length,
                comparableInterviewCount: comparable.length,
                latestScore: overallSeries.at(-1)?.score ?? null,
                averageCoverage:
                    comparable.length === 0
                        ? null
                        : round(
                              comparable.reduce(
                                  (sum, item) =>
                                      sum + (decimal(item.coverage) ?? 0),
                                  0,
                              ) / comparable.length,
                          ),
            },
            activeComparison: latest
                ? {
                      key: activeKey,
                      role: latest.interview.targetRole,
                      level: latest.interview.targetLevel,
                      interviewType: latest.interview.interviewType,
                      rubricVersion: latest.rubricVersion,
                  }
                : null,
            comparisonGroups: [...groups.entries()].map(([key, items]) => ({
                key,
                role: items[0].interview.targetRole,
                level: items[0].interview.targetLevel,
                interviewType: items[0].interview.interviewType,
                rubricVersion: items[0].rubricVersion,
                count: items.length,
            })),
            overallSeries,
            competencySeries: [...competencySeries.values()].filter(
                (series) => series.points.length > 0,
            ),
            recurringWeaknesses: [...weaknessGroups.values()]
                .filter((group) => group.occurrences.length >= 2)
                .sort((a, b) => b.occurrences.length - a.occurrences.length),
            limitations:
                groups.size > 1
                    ? [
                          'Chỉ các buổi có cùng vai trò, cấp độ, loại phỏng vấn và phiên bản rubric mới được đặt trong cùng một xu hướng.',
                      ]
                    : [],
        };
    }

    private historyWhere(
        userId: string,
        query: InterviewHistoryQueryDto,
    ): Prisma.InterviewWhereInput {
        const search = query.search?.trim();
        return {
            userId,
            ...(query.status ? { status: query.status } : {}),
            ...(query.role
                ? {
                      targetRole: {
                          equals: query.role,
                          mode: 'insensitive',
                      },
                  }
                : {}),
            ...(query.level ? { targetLevel: query.level } : {}),
            ...(query.interviewType
                ? { interviewType: query.interviewType }
                : {}),
            ...dateFilter(query.from, query.to),
            ...(search
                ? {
                      OR: [
                          {
                              targetRole: {
                                  contains: search,
                                  mode: 'insensitive',
                              },
                          },
                          {
                              cv: {
                                  name: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                          },
                          {
                              jobDescription: {
                                  OR: [
                                      {
                                          title: {
                                              contains: search,
                                              mode: 'insensitive',
                                          },
                                      },
                                      {
                                          company: {
                                              contains: search,
                                              mode: 'insensitive',
                                          },
                                      },
                                  ],
                              },
                          },
                      ],
                  }
                : {}),
        };
    }
}

function dateFilter(from?: string, to?: string): Prisma.InterviewWhereInput {
    if (!from && !to) return {};
    return {
        createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
        },
    };
}

function decimal(value: Prisma.Decimal | null | undefined) {
    return value == null ? null : Number(value);
}

function record(value: unknown): JsonRecord | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as JsonRecord)
        : null;
}

function arrayOfRecords(value: unknown): JsonRecord[] {
    return Array.isArray(value)
        ? value.filter(
              (item): item is JsonRecord =>
                  typeof item === 'object' &&
                  item !== null &&
                  !Array.isArray(item),
          )
        : [];
}

function sanitizeReview(value: JsonRecord | undefined) {
    if (!value) return null;
    return {
        answerStatus:
            typeof value.answerStatus === 'string'
                ? value.answerStatus
                : 'ANSWERED',
        questionObjective:
            typeof value.questionObjective === 'string'
                ? value.questionObjective
                : '',
        evidenceQuotes: strings(value.evidenceQuotes),
        learningObjectives: strings(value.learningObjectives),
        correctAspects: strings(value.correctAspects),
        missingAspects: strings(value.missingAspects),
        incorrectAspects: strings(value.incorrectAspects),
        whyItMatters:
            typeof value.whyItMatters === 'string' ? value.whyItMatters : '',
        improvement:
            typeof value.improvement === 'string' ? value.improvement : '',
        exampleImprovedAnswer:
            typeof value.exampleImprovedAnswer === 'string'
                ? value.exampleImprovedAnswer
                : null,
        reviewSections: sanitizeReviewSections(value.reviewSections),
    };
}

function sanitizeReviewSections(value: unknown) {
    if (!Array.isArray(value)) return [];

    return value.flatMap((section) => {
        const parsed = ReviewSectionSchema.safeParse(section);
        return parsed.success ? [parsed.data] : [];
    });
}

function strings(value: unknown) {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
}

function normalize(value: string) {
    return value
        .normalize('NFKD')
        .toLocaleLowerCase('en-US')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function comparisonKey(item: {
    interview: {
        targetRole: string;
        targetLevel: string | null;
        interviewType: string;
    };
    rubricVersion: string;
}) {
    return [
        normalize(item.interview.targetRole),
        item.interview.targetLevel ?? 'UNSPECIFIED',
        item.interview.interviewType,
        item.rubricVersion,
    ].join('|');
}

function round(value: number) {
    return Math.round(value * 1000) / 1000;
}
