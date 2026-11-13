import type { DashboardRange } from '@/types/dashboard';

export const dashboardKeys = {
    all: ['dashboard'] as const,
    summary: (range: DashboardRange) =>
        [...dashboardKeys.all, 'summary', range] as const,
};
