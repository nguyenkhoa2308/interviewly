import { Injectable } from '@nestjs/common';
import {
    CVAnalysisStatus,
    CVJDMatchStatus,
    CVProcessingStatus,
    InterviewEvaluationStatus,
    InterviewStatus,
    JDAnalysisStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
    dashboardSummarySchema,
    type DashboardActivityItem,
    type DashboardSummary,
} from './contracts/dashboard-summary.contract';
import { DashboardRange } from './dto/dashboard-summary-query.dto';

const RECENT_INTERVIEW_LIMIT = 12;
const RECENT_ACTIVITY_LIMIT = 10;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1_000;
const RANGE_DAYS: Record<DashboardRange, number> = {
    [DashboardRange.LAST_7_DAYS]: 7,
    [DashboardRange.LAST_30_DAYS]: 30,
    [DashboardRange.LAST_90_DAYS]: 90,
};

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) {}

    async getSummary(
        userId: string,
        range = DashboardRange.LAST_30_DAYS,
    ): Promise<DashboardSummary> {
        const activeCvWhere = { userId, deletedAt: null } as const;
        const activeJdWhere = { userId, deletedAt: null } as const;
        const periodDays = RANGE_DAYS[range];
        const currentPeriodEnd = new Date();
        const currentPeriodStart = new Date(
            currentPeriodEnd.getTime() - periodDays * DAY_IN_MILLISECONDS,
        );
        const previousPeriodStart = new Date(
            currentPeriodStart.getTime() - periodDays * DAY_IN_MILLISECONDS,
        );
        const currentPeriod = {
            gte: currentPeriodStart,
            lt: currentPeriodEnd,
        };
        const previousPeriod = {
            gte: previousPeriodStart,
            lt: currentPeriodStart,
        };

        const [
            cvTotal,
            cvReady,
            jdTotal,
            jdAnalyzed,
            matchTotal,
            matchCompleted,
            matchScore,
            interviewTotal,
            interviewStatuses,
            interviewScore,
            performanceHistory,
            recentInterviews,
            cvCreated,
            cvAnalysisCompleted,
            jdCreated,
            jdAnalysisCompleted,
            matchActivity,
            interviewCreated,
            interviewCompleted,
            evaluationCompleted,
            cvPreviousPeriod,
            jdPreviousPeriod,
            matchPreviousPeriod,
            interviewPreviousPeriod,
        ] = await Promise.all([
            this.prisma.cV.count({
                where: { ...activeCvWhere, createdAt: currentPeriod },
            }),
            this.prisma.cV.count({
                where: {
                    ...activeCvWhere,
                    createdAt: currentPeriod,
                    processingStatus: CVProcessingStatus.READY,
                },
            }),
            this.prisma.jobDescription.count({
                where: { ...activeJdWhere, createdAt: currentPeriod },
            }),
            this.prisma.jobDescription.count({
                where: {
                    ...activeJdWhere,
                    createdAt: currentPeriod,
                    analyses: { some: { status: JDAnalysisStatus.COMPLETED } },
                },
            }),
            this.prisma.cVJDMatch.count({
                where: { userId, createdAt: currentPeriod },
            }),
            this.prisma.cVJDMatch.count({
                where: {
                    userId,
                    status: CVJDMatchStatus.COMPLETED,
                    createdAt: currentPeriod,
                },
            }),
            this.prisma.cVJDMatch.aggregate({
                where: {
                    userId,
                    status: CVJDMatchStatus.COMPLETED,
                    completedAt: currentPeriod,
                    matchScore: { not: null, gte: 0, lte: 100 },
                },
                _avg: { matchScore: true },
            }),
            this.prisma.interview.count({
                where: { userId, createdAt: currentPeriod },
            }),
            this.prisma.interview.groupBy({
                by: ['status'],
                where: { userId, createdAt: currentPeriod },
                _count: { _all: true },
            }),
            this.prisma.interviewEvaluation.aggregate({
                where: {
                    status: InterviewEvaluationStatus.COMPLETED,
                    completedAt: currentPeriod,
                    overallScore: { not: null, gte: 0, lte: 10 },
                    interview: { userId, status: InterviewStatus.COMPLETED },
                },
                _avg: { overallScore: true },
            }),
            this.prisma.interviewEvaluation.findMany({
                where: {
                    status: InterviewEvaluationStatus.COMPLETED,
                    completedAt: currentPeriod,
                    overallScore: { not: null, gte: 0, lte: 10 },
                    interview: { userId, status: InterviewStatus.COMPLETED },
                },
                orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
                select: {
                    id: true,
                    overallScore: true,
                    completedAt: true,
                    interview: { select: { targetRole: true } },
                },
            }),
            this.prisma.interview.findMany({
                where: { userId, createdAt: currentPeriod },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: RECENT_INTERVIEW_LIMIT,
                select: {
                    id: true,
                    targetRole: true,
                    interviewType: true,
                    status: true,
                    createdAt: true,
                    session: { select: { completedAt: true } },
                    evaluation: {
                        select: { status: true, overallScore: true },
                    },
                },
            }),
            this.prisma.cV.findMany({
                where: { ...activeCvWhere, createdAt: currentPeriod },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: RECENT_ACTIVITY_LIMIT,
                select: { id: true, name: true, createdAt: true },
            }),
            this.prisma.cVAnalysis.findMany({
                where: {
                    status: CVAnalysisStatus.COMPLETED,
                    completedAt: currentPeriod,
                    cv: activeCvWhere,
                },
                orderBy: [{ completedAt: 'desc' }, { id: 'asc' }],
                take: RECENT_ACTIVITY_LIMIT,
                select: {
                    id: true,
                    completedAt: true,
                    cv: { select: { id: true, name: true } },
                },
            }),
            this.prisma.jobDescription.findMany({
                where: { ...activeJdWhere, createdAt: currentPeriod },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: RECENT_ACTIVITY_LIMIT,
                select: {
                    id: true,
                    title: true,
                    company: true,
                    createdAt: true,
                },
            }),
            this.prisma.jDAnalysis.findMany({
                where: {
                    status: JDAnalysisStatus.COMPLETED,
                    completedAt: currentPeriod,
                    jobDescription: activeJdWhere,
                },
                orderBy: [{ completedAt: 'desc' }, { id: 'asc' }],
                take: RECENT_ACTIVITY_LIMIT,
                select: {
                    id: true,
                    completedAt: true,
                    jobDescription: {
                        select: { id: true, title: true, company: true },
                    },
                },
            }),
            this.prisma.cVJDMatch.findMany({
                where: {
                    userId,
                    status: CVJDMatchStatus.COMPLETED,
                    completedAt: currentPeriod,
                },
                orderBy: [{ completedAt: 'desc' }, { id: 'asc' }],
                take: RECENT_ACTIVITY_LIMIT,
                select: {
                    id: true,
                    completedAt: true,
                    cvNameSnapshot: true,
                    jdTitleSnapshot: true,
                },
            }),
            this.prisma.interview.findMany({
                where: { userId, createdAt: currentPeriod },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: RECENT_ACTIVITY_LIMIT,
                select: { id: true, targetRole: true, createdAt: true },
            }),
            this.prisma.interviewSession.findMany({
                where: {
                    completedAt: currentPeriod,
                    interview: { userId },
                },
                orderBy: [{ completedAt: 'desc' }, { id: 'asc' }],
                take: RECENT_ACTIVITY_LIMIT,
                select: {
                    id: true,
                    completedAt: true,
                    interview: { select: { id: true, targetRole: true } },
                },
            }),
            this.prisma.interviewEvaluation.findMany({
                where: {
                    status: InterviewEvaluationStatus.COMPLETED,
                    completedAt: currentPeriod,
                    interview: { userId },
                },
                orderBy: [{ completedAt: 'desc' }, { id: 'asc' }],
                take: RECENT_ACTIVITY_LIMIT,
                select: {
                    id: true,
                    completedAt: true,
                    interview: { select: { id: true, targetRole: true } },
                },
            }),
            this.prisma.cV.count({
                where: { ...activeCvWhere, createdAt: previousPeriod },
            }),
            this.prisma.jobDescription.count({
                where: { ...activeJdWhere, createdAt: previousPeriod },
            }),
            this.prisma.cVJDMatch.count({
                where: { userId, createdAt: previousPeriod },
            }),
            this.prisma.interview.count({
                where: { userId, createdAt: previousPeriod },
            }),
        ]);

        const statusCounts = new Map(
            interviewStatuses.map((row) => [row.status, row._count._all]),
        );

        const recentActivity: DashboardActivityItem[] = [
            ...cvCreated.map((row) =>
                activity(
                    'CV_CREATED',
                    row.id,
                    'Đã thêm CV',
                    row.name,
                    row.createdAt,
                    `/cv/${row.id}`,
                ),
            ),
            ...cvAnalysisCompleted.map((row) =>
                activity(
                    'CV_ANALYSIS_COMPLETED',
                    row.id,
                    'Đã phân tích CV',
                    row.cv.name,
                    row.completedAt!,
                    `/cv/${row.cv.id}/analysis`,
                ),
            ),
            ...jdCreated.map((row) =>
                activity(
                    'JOB_DESCRIPTION_CREATED',
                    row.id,
                    'Đã thêm mô tả công việc',
                    describeJd(row.title, row.company),
                    row.createdAt,
                    `/job-descriptions/${row.id}`,
                ),
            ),
            ...jdAnalysisCompleted.map((row) =>
                activity(
                    'JOB_DESCRIPTION_ANALYSIS_COMPLETED',
                    row.id,
                    'Đã phân tích mô tả công việc',
                    describeJd(
                        row.jobDescription.title,
                        row.jobDescription.company,
                    ),
                    row.completedAt!,
                    `/job-descriptions/${row.jobDescription.id}/analysis`,
                ),
            ),
            ...matchActivity.map((row) =>
                activity(
                    'CV_JD_MATCH_COMPLETED',
                    row.id,
                    'Đã hoàn thành đối chiếu CV và JD',
                    `${row.cvNameSnapshot} · ${row.jdTitleSnapshot}`,
                    row.completedAt!,
                    `/matching/${row.id}`,
                ),
            ),
            ...interviewCreated.map((row) =>
                activity(
                    'INTERVIEW_CREATED',
                    row.id,
                    'Đã tạo buổi phỏng vấn',
                    row.targetRole,
                    row.createdAt,
                    `/interviews/${row.id}`,
                ),
            ),
            ...interviewCompleted.map((row) =>
                activity(
                    'INTERVIEW_COMPLETED',
                    row.id,
                    'Đã hoàn thành buổi phỏng vấn',
                    row.interview.targetRole,
                    row.completedAt!,
                    `/interviews/${row.interview.id}/report`,
                ),
            ),
            ...evaluationCompleted.map((row) =>
                activity(
                    'INTERVIEW_EVALUATION_COMPLETED',
                    row.id,
                    'Đã hoàn thành đánh giá phỏng vấn',
                    row.interview.targetRole,
                    row.completedAt!,
                    `/interviews/${row.interview.id}/report`,
                ),
            ),
        ]
            .sort(
                (a, b) =>
                    b.occurredAt.localeCompare(a.occurredAt) ||
                    a.id.localeCompare(b.id),
            )
            .slice(0, RECENT_ACTIVITY_LIMIT);

        return dashboardSummarySchema.parse({
            overview: {
                cvs: {
                    total: cvTotal,
                    ready: cvReady,
                    trend: calculateTrend(cvTotal, cvPreviousPeriod),
                },
                jobDescriptions: {
                    total: jdTotal,
                    analyzed: jdAnalyzed,
                    trend: calculateTrend(jdTotal, jdPreviousPeriod),
                },
                matches: {
                    total: matchTotal,
                    completed: matchCompleted,
                    averageScore: roundedAverage(matchScore._avg.matchScore),
                    trend: calculateTrend(matchTotal, matchPreviousPeriod),
                },
            },
            interviewSummary: {
                total: interviewTotal,
                draft: statusCounts.get(InterviewStatus.DRAFT) ?? 0,
                ready: statusCounts.get(InterviewStatus.READY) ?? 0,
                inProgress: statusCounts.get(InterviewStatus.IN_PROGRESS) ?? 0,
                completed: statusCounts.get(InterviewStatus.COMPLETED) ?? 0,
                averageScore: roundedAverage(interviewScore._avg.overallScore),
                trend: calculateTrend(interviewTotal, interviewPreviousPeriod),
            },
            performanceHistory: performanceHistory.map((row) => ({
                id: row.id,
                targetRole: row.interview.targetRole,
                score: validScore(row.overallScore, 10)!,
                completedAt: row.completedAt!.toISOString(),
            })),
            recentInterviews: recentInterviews.map((row) => ({
                id: row.id,
                targetRole: row.targetRole,
                interviewType: row.interviewType,
                status: row.status,
                score:
                    row.status === InterviewStatus.COMPLETED &&
                    row.evaluation?.status ===
                        InterviewEvaluationStatus.COMPLETED
                        ? validScore(row.evaluation.overallScore, 10)
                        : null,
                createdAt: row.createdAt.toISOString(),
                completedAt: row.session?.completedAt?.toISOString() ?? null,
                href:
                    row.status === InterviewStatus.COMPLETED
                        ? `/interviews/${row.id}/report`
                        : `/interviews/${row.id}`,
            })),
            recentActivity,
        });
    }
}

function calculateTrend(currentPeriod: number, previousPeriod: number) {
    const percentageChange =
        previousPeriod === 0
            ? currentPeriod === 0
                ? 0
                : 100
            : Math.round(
                  ((currentPeriod - previousPeriod) / previousPeriod) * 100,
              );

    return {
        currentPeriod,
        previousPeriod,
        percentageChange,
        direction:
            percentageChange > 0
                ? ('UP' as const)
                : percentageChange < 0
                  ? ('DOWN' as const)
                  : ('UNCHANGED' as const),
    };
}

function roundedAverage(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function validScore(value: unknown, maximum: number): number | null {
    const number = value === null || value === undefined ? NaN : Number(value);
    return Number.isFinite(number) && number >= 0 && number <= maximum
        ? number
        : null;
}

function activity(
    type: DashboardActivityItem['type'],
    sourceId: string,
    title: string,
    description: string | null,
    occurredAt: Date,
    href: string | null,
): DashboardActivityItem {
    return {
        id: `${type}:${sourceId}`,
        type,
        title,
        description,
        occurredAt: occurredAt.toISOString(),
        href,
    };
}

function describeJd(title: string, company: string | null): string {
    return company ? `${title} tại ${company}` : title;
}
