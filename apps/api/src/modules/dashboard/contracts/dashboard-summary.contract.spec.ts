import {
    dashboardActivityItemSchema,
    dashboardRecentInterviewSchema,
    dashboardSummaryResponseSchema,
    dashboardSummarySchema,
} from './dashboard-summary.contract';

const interviewId = '11111111-1111-4111-8111-111111111111';
const unchangedTrend = {
    currentPeriod: 0,
    previousPeriod: 0,
    percentageChange: 0,
    direction: 'UNCHANGED' as const,
};

const validSummary = {
    overview: {
        cvs: { total: 3, ready: 2, trend: unchangedTrend },
        jobDescriptions: { total: 4, analyzed: 3, trend: unchangedTrend },
        matches: {
            total: 5,
            completed: 4,
            averageScore: 72.35,
            trend: unchangedTrend,
        },
    },
    interviewSummary: {
        total: 6,
        draft: 1,
        ready: 1,
        inProgress: 1,
        completed: 2,
        averageScore: 7.25,
        trend: unchangedTrend,
    },
    performanceHistory: [
        {
            id: interviewId,
            targetRole: 'Frontend Developer',
            score: 0,
            completedAt: '2026-11-05T04:00:00.000Z',
        },
    ],
    recentInterviews: [
        {
            id: interviewId,
            targetRole: 'Frontend Developer',
            interviewType: 'TECHNICAL',
            status: 'COMPLETED',
            score: 0,
            createdAt: '2026-11-05T03:00:00.000Z',
            completedAt: '2026-11-05T04:00:00.000Z',
            href: `/interviews/${interviewId}`,
        },
    ],
    recentActivity: [
        {
            id: `INTERVIEW_COMPLETED:${interviewId}`,
            type: 'INTERVIEW_COMPLETED',
            title: 'Đã hoàn thành buổi phỏng vấn',
            description: 'Frontend Developer',
            occurredAt: '2026-11-05T04:00:00.000Z',
            href: `/interviews/${interviewId}/report`,
        },
    ],
};

describe('dashboard summary contract', () => {
    it('accepts the complete response envelope', () => {
        expect(
            dashboardSummaryResponseSchema.parse({
                success: true,
                data: validSummary,
            }),
        ).toEqual({ success: true, data: validSummary });
    });

    it('accepts deterministic empty-state semantics', () => {
        expect(
            dashboardSummarySchema.parse({
                overview: {
                    cvs: { total: 0, ready: 0, trend: unchangedTrend },
                    jobDescriptions: {
                        total: 0,
                        analyzed: 0,
                        trend: unchangedTrend,
                    },
                    matches: {
                        total: 0,
                        completed: 0,
                        averageScore: null,
                        trend: unchangedTrend,
                    },
                },
                interviewSummary: {
                    total: 0,
                    draft: 0,
                    ready: 0,
                    inProgress: 0,
                    completed: 0,
                    averageScore: null,
                    trend: unchangedTrend,
                },
                performanceHistory: [],
                recentInterviews: [],
                recentActivity: [],
            }),
        ).toBeDefined();
    });

    it('preserves a legitimate zero score instead of treating it as missing', () => {
        expect(
            dashboardRecentInterviewSchema.parse(
                validSummary.recentInterviews[0],
            ).score,
        ).toBe(0);
    });

    it('rejects unsupported persisted enums', () => {
        expect(() =>
            dashboardRecentInterviewSchema.parse({
                ...validSummary.recentInterviews[0],
                status: 'ARCHIVED',
            }),
        ).toThrow();
    });

    it('rejects invalid timestamps', () => {
        expect(() =>
            dashboardActivityItemSchema.parse({
                ...validSummary.recentActivity[0],
                occurredAt: '05/11/2026',
            }),
        ).toThrow();
    });

    it('does not expose ownership identifiers', () => {
        expect(() =>
            dashboardSummarySchema.parse({
                ...validSummary,
                userId: interviewId,
            }),
        ).toThrow();

        expect(() =>
            dashboardActivityItemSchema.parse({
                ...validSummary.recentActivity[0],
                userId: interviewId,
            }),
        ).toThrow();
    });

    it('rejects out-of-scale averages and negative counts', () => {
        expect(() =>
            dashboardSummarySchema.parse({
                ...validSummary,
                overview: {
                    ...validSummary.overview,
                    cvs: { total: -1, ready: 0 },
                },
            }),
        ).toThrow();

        expect(() =>
            dashboardSummarySchema.parse({
                ...validSummary,
                interviewSummary: {
                    ...validSummary.interviewSummary,
                    averageScore: 10.01,
                },
            }),
        ).toThrow();
    });
});
