import { getData } from '@/lib/api-client';
import { normalizeApiError } from '@/lib/api-error';
import type { ApiSuccessResponse } from '@/types/api';
import type { DashboardRange, DashboardSummary } from '@/types/dashboard';

export async function getDashboardSummary(
    range: DashboardRange,
): Promise<DashboardSummary> {
    try {
        const response = await getData<ApiSuccessResponse<DashboardSummary>>(
            `/dashboard/summary?range=${range}`,
        );
        return response.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}
