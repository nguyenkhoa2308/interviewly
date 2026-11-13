import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-error';
import type { DashboardSummary } from '@/types/dashboard';
import { getDashboardSummary } from './dashboard.service';

const api = vi.hoisted(() => ({ getData: vi.fn() }));

const unchangedTrend = {
    currentPeriod: 0,
    previousPeriod: 0,
    percentageChange: 0,
    direction: 'UNCHANGED' as const,
};

vi.mock('@/lib/api-client', () => ({ getData: api.getData }));

const summary: DashboardSummary = {
    overview: {
        cvs: { total: 1, ready: 1, trend: unchangedTrend },
        jobDescriptions: {
            total: 2,
            analyzed: 1,
            trend: unchangedTrend,
        },
        matches: {
            total: 1,
            completed: 1,
            averageScore: 0,
            trend: unchangedTrend,
        },
    },
    interviewSummary: {
        total: 1,
        draft: 0,
        ready: 0,
        inProgress: 0,
        completed: 1,
        averageScore: 0,
        trend: unchangedTrend,
    },
    performanceHistory: [],
    recentInterviews: [],
    recentActivity: [],
};

describe('Dashboard service', () => {
    beforeEach(() => vi.clearAllMocks());

    it('requests the summary path and unwraps the API envelope once', async () => {
        api.getData.mockResolvedValue({ success: true, data: summary });

        await expect(getDashboardSummary('30d')).resolves.toBe(summary);
        expect(api.getData).toHaveBeenCalledWith(
            '/dashboard/summary?range=30d',
        );
    });

    it('propagates a normalized API error without fabricating empty data', async () => {
        api.getData.mockRejectedValue(new Error('network failed'));

        await expect(getDashboardSummary('7d')).rejects.toBeInstanceOf(
            ApiError,
        );
    });
});
