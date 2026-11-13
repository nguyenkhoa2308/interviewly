import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardSummary } from '@/types/dashboard';
import { dashboardKeys } from './dashboard-keys';
import { useDashboardSummary } from './use-dashboard-summary';

const service = vi.hoisted(() => ({ getDashboardSummary: vi.fn() }));
vi.mock('@/services/dashboard.service', () => service);

const unchangedTrend = {
    currentPeriod: 0,
    previousPeriod: 0,
    percentageChange: 0,
    direction: 'UNCHANGED' as const,
};

const emptySummary: DashboardSummary = {
    overview: {
        cvs: { total: 0, ready: 0, trend: unchangedTrend },
        jobDescriptions: { total: 0, analyzed: 0, trend: unchangedTrend },
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
};

function setup() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, wrapper };
}

describe('Dashboard summary hook', () => {
    beforeEach(() => vi.clearAllMocks());

    it('uses a stable summary key and preserves a valid empty response', async () => {
        service.getDashboardSummary.mockResolvedValue(emptySummary);
        const { client, wrapper } = setup();
        const { result } = renderHook(() => useDashboardSummary('30d'), {
            wrapper,
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(dashboardKeys.summary('30d')).toEqual([
            'dashboard',
            'summary',
            '30d',
        ]);
        expect(service.getDashboardSummary).toHaveBeenCalledOnce();
        expect(result.current.data).toBe(emptySummary);
        expect(client.getQueryData(dashboardKeys.summary('30d'))).toBe(
            emptySummary,
        );
        expect(
            client
                .getQueryCache()
                .find({ queryKey: dashboardKeys.summary('30d') })?.meta,
        ).toEqual({ requiresAuth: true });
    });

    it('exposes query errors instead of replacing them with empty data', async () => {
        const error = new Error('dashboard unavailable');
        service.getDashboardSummary.mockRejectedValue(error);
        const { wrapper } = setup();
        const { result } = renderHook(() => useDashboardSummary('90d'), {
            wrapper,
        });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBe(error);
        expect(result.current.data).toBeUndefined();
    });
});
