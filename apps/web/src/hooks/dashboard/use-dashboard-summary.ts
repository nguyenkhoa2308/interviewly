'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '@/services/dashboard.service';
import type { DashboardRange } from '@/types/dashboard';
import { dashboardKeys } from './dashboard-keys';

export function useDashboardSummary(range: DashboardRange) {
    return useQuery({
        queryKey: dashboardKeys.summary(range),
        queryFn: () => getDashboardSummary(range),
        placeholderData: (previousData) => previousData,
        meta: { requiresAuth: true },
    });
}
