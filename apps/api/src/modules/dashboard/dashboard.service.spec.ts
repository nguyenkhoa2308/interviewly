import { jest } from '@jest/globals';
import {
    CVJDMatchStatus,
    InterviewEvaluationStatus,
    InterviewStatus,
    InterviewType,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { dashboardSummarySchema } from './contracts/dashboard-summary.contract';
import { DashboardService } from './dashboard.service';
import { DashboardRange } from './dto/dashboard-summary-query.dto';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const INTERVIEW_ID = '00000000-0000-4000-8000-000000000002';
const NOW = new Date('2026-11-06T08:00:00.000Z');

describe('DashboardService', () => {
    const prisma = {
        cV: { count: jest.fn(), findMany: jest.fn() },
        cVAnalysis: { findMany: jest.fn() },
        jobDescription: { count: jest.fn(), findMany: jest.fn() },
        jDAnalysis: { findMany: jest.fn() },
        cVJDMatch: {
            count: jest.fn(),
            aggregate: jest.fn(),
            findMany: jest.fn(),
        },
        interview: {
            count: jest.fn(),
            groupBy: jest.fn(),
            findMany: jest.fn(),
        },
        interviewSession: { findMany: jest.fn() },
        interviewEvaluation: {
            aggregate: jest.fn(),
            findMany: jest.fn(),
        },
    };
    let service: DashboardService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DashboardService(prisma as unknown as PrismaService);

        prisma.cV.count.mockResolvedValue(0);
        prisma.cV.findMany.mockResolvedValue([]);
        prisma.cVAnalysis.findMany.mockResolvedValue([]);
        prisma.jobDescription.count.mockResolvedValue(0);
        prisma.jobDescription.findMany.mockResolvedValue([]);
        prisma.jDAnalysis.findMany.mockResolvedValue([]);
        prisma.cVJDMatch.count.mockResolvedValue(0);
        prisma.cVJDMatch.aggregate.mockResolvedValue({
            _avg: { matchScore: null },
        });
        prisma.cVJDMatch.findMany.mockResolvedValue([]);
        prisma.interview.count.mockResolvedValue(0);
        prisma.interview.groupBy.mockResolvedValue([]);
        prisma.interview.findMany.mockResolvedValue([]);
        prisma.interviewSession.findMany.mockResolvedValue([]);
        prisma.interviewEvaluation.aggregate.mockResolvedValue({
            _avg: { overallScore: null },
        });
        prisma.interviewEvaluation.findMany.mockResolvedValue([]);
    });

    it('returns contract-valid deterministic empty state', async () => {
        const result = await service.getSummary(USER_ID);

        expect(dashboardSummarySchema.parse(result)).toEqual(result);
        expect(result).toEqual({
            overview: {
                cvs: { total: 0, ready: 0, trend: unchangedTrend() },
                jobDescriptions: {
                    total: 0,
                    analyzed: 0,
                    trend: unchangedTrend(),
                },
                matches: {
                    total: 0,
                    completed: 0,
                    averageScore: null,
                    trend: unchangedTrend(),
                },
            },
            interviewSummary: {
                total: 0,
                draft: 0,
                ready: 0,
                inProgress: 0,
                completed: 0,
                averageScore: null,
                trend: unchangedTrend(),
            },
            performanceHistory: [],
            recentInterviews: [],
            recentActivity: [],
        });
    });

    it('scopes every aggregation to the authenticated user and active parents', async () => {
        await service.getSummary(USER_ID);

        expect(prisma.cV.count).toHaveBeenCalledWith({
            where: expect.objectContaining({
                userId: USER_ID,
                deletedAt: null,
                createdAt: expect.objectContaining({
                    gte: expect.any(Date),
                    lt: expect.any(Date),
                }),
            }),
        });
        expect(prisma.jobDescription.count).toHaveBeenCalledWith({
            where: expect.objectContaining({
                userId: USER_ID,
                deletedAt: null,
                analyses: { some: { status: 'COMPLETED' } },
            }),
        });
        expect(prisma.cVJDMatch.aggregate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    userId: USER_ID,
                    status: CVJDMatchStatus.COMPLETED,
                }),
            }),
        );
        expect(prisma.interviewEvaluation.aggregate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: InterviewEvaluationStatus.COMPLETED,
                    overallScore: { not: null, gte: 0, lte: 10 },
                    interview: {
                        userId: USER_ID,
                        status: InterviewStatus.COMPLETED,
                    },
                }),
            }),
        );
        expect(prisma.interview.findMany).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                where: expect.objectContaining({
                    userId: USER_ID,
                    createdAt: expect.any(Object),
                }),
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: 12,
            }),
        );
    });

    it('keeps total-only statuses, rounds averages, and preserves a zero score', async () => {
        prisma.cV.count.mockResolvedValueOnce(4).mockResolvedValueOnce(3);
        prisma.jobDescription.count
            .mockResolvedValueOnce(5)
            .mockResolvedValueOnce(2);
        prisma.cVJDMatch.count
            .mockResolvedValueOnce(6)
            .mockResolvedValueOnce(4);
        prisma.cVJDMatch.aggregate.mockResolvedValue({
            _avg: { matchScore: 73.456 },
        });
        prisma.interview.count.mockResolvedValueOnce(8).mockResolvedValue(0);
        prisma.interview.groupBy.mockResolvedValue([
            { status: InterviewStatus.DRAFT, _count: { _all: 1 } },
            { status: InterviewStatus.PLANNING, _count: { _all: 2 } },
            { status: InterviewStatus.READY, _count: { _all: 1 } },
            { status: InterviewStatus.IN_PROGRESS, _count: { _all: 1 } },
            { status: InterviewStatus.COMPLETED, _count: { _all: 2 } },
            { status: InterviewStatus.CANCELLED, _count: { _all: 1 } },
        ]);
        prisma.interviewEvaluation.aggregate.mockResolvedValue({
            _avg: { overallScore: 7.258 },
        });
        prisma.interviewEvaluation.findMany.mockResolvedValueOnce([
            {
                id: INTERVIEW_ID,
                overallScore: 0,
                completedAt: NOW,
                interview: { targetRole: 'Frontend Developer' },
            },
        ]);
        prisma.interview.findMany
            .mockResolvedValueOnce([
                {
                    id: INTERVIEW_ID,
                    targetRole: 'Frontend Developer',
                    interviewType: InterviewType.TECHNICAL,
                    status: InterviewStatus.COMPLETED,
                    createdAt: NOW,
                    session: { completedAt: NOW },
                    evaluation: {
                        status: InterviewEvaluationStatus.COMPLETED,
                        overallScore: 0,
                    },
                },
            ])
            .mockResolvedValueOnce([]);

        const result = await service.getSummary(USER_ID);

        expect(result.overview.matches.averageScore).toBe(73.46);
        expect(result.interviewSummary).toEqual({
            total: 8,
            draft: 1,
            ready: 1,
            inProgress: 1,
            completed: 2,
            averageScore: 7.26,
            trend: {
                currentPeriod: 8,
                previousPeriod: 0,
                percentageChange: 100,
                direction: 'UP',
            },
        });
        expect(result.recentInterviews[0]).toEqual(
            expect.objectContaining({
                score: 0,
                completedAt: NOW.toISOString(),
                href: `/interviews/${INTERVIEW_ID}/report`,
            }),
        );
        expect(result.performanceHistory).toEqual([
            {
                id: INTERVIEW_ID,
                targetRole: 'Frontend Developer',
                score: 0,
                completedAt: NOW.toISOString(),
            },
        ]);
    });

    it('merges persisted activities with deterministic sorting and a fixed limit', async () => {
        prisma.cV.findMany.mockResolvedValue(
            Array.from({ length: 10 }, (_, index) => ({
                id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
                name: `CV ${index}`,
                createdAt: new Date(NOW.getTime() - index * 1_000),
            })),
        );
        prisma.jobDescription.findMany.mockResolvedValue([
            {
                id: '00000000-0000-4000-8000-000000000099',
                title: 'Backend Developer',
                company: null,
                createdAt: new Date(NOW.getTime() + 1_000),
            },
        ]);

        const result = await service.getSummary(USER_ID);

        expect(result.recentActivity).toHaveLength(10);
        expect(result.recentActivity[0]).toEqual(
            expect.objectContaining({
                type: 'JOB_DESCRIPTION_CREATED',
                occurredAt: '2026-11-06T08:00:01.000Z',
            }),
        );
        expect(
            result.recentActivity.every((item) =>
                item.id.startsWith(`${item.type}:`),
            ),
        ).toBe(true);
    });

    it('compares creation counts with the immediately preceding selected period', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(NOW);

        prisma.cV.count
            .mockResolvedValueOnce(3)
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(2);
        prisma.jobDescription.count
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(2);
        prisma.cVJDMatch.count
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(2)
            .mockResolvedValueOnce(0);
        prisma.interview.count
            .mockResolvedValueOnce(1)
            .mockResolvedValueOnce(1);

        const result = await service.getSummary(
            USER_ID,
            DashboardRange.LAST_7_DAYS,
        );

        expect(result.overview.cvs.trend).toEqual({
            currentPeriod: 3,
            previousPeriod: 2,
            percentageChange: 50,
            direction: 'UP',
        });
        expect(result.overview.jobDescriptions.trend).toEqual({
            currentPeriod: 0,
            previousPeriod: 2,
            percentageChange: -100,
            direction: 'DOWN',
        });
        expect(result.overview.matches.trend).toEqual({
            currentPeriod: 2,
            previousPeriod: 0,
            percentageChange: 100,
            direction: 'UP',
        });
        expect(result.interviewSummary.trend).toEqual({
            currentPeriod: 1,
            previousPeriod: 1,
            percentageChange: 0,
            direction: 'UNCHANGED',
        });
        expect(prisma.cV.count).toHaveBeenLastCalledWith({
            where: {
                userId: USER_ID,
                deletedAt: null,
                createdAt: {
                    gte: new Date('2026-10-23T08:00:00.000Z'),
                    lt: new Date('2026-10-30T08:00:00.000Z'),
                },
            },
        });

        jest.useRealTimers();
    });
});

function unchangedTrend() {
    return {
        currentPeriod: 0,
        previousPeriod: 0,
        percentageChange: 0,
        direction: 'UNCHANGED',
    };
}
