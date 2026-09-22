import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cvKeys } from './cv-keys';
import {
    useAnalyzeCv,
    useCvAnalysisHistory,
    useLatestCvAnalysis,
} from './use-cv-analysis';
import type { CvAnalysis } from '@/types/cv';

const service = vi.hoisted(() => ({
    analyzeCv: vi.fn(),
    getLatestCvAnalysis: vi.fn(),
    getCvAnalysisHistory: vi.fn(),
}));

vi.mock('@/services/cv.service', () => service);

const analysis = {
    id: 'analysis-1',
    cvId: 'cv-123',
    status: 'COMPLETED',
    overallScore: 80,
} as CvAnalysis;

function setup() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, wrapper };
}

describe('CV analysis hooks', () => {
    beforeEach(() => vi.clearAllMocks());

    it('uses the cv-scoped latest query function', async () => {
        service.getLatestCvAnalysis.mockResolvedValue(analysis);
        const { wrapper } = setup();
        const { result } = renderHook(() => useLatestCvAnalysis('cv-123'), {
            wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(service.getLatestCvAnalysis).toHaveBeenCalledWith('cv-123');
        expect(result.current.data).toBe(analysis);
    });

    it('does not query without a CV id', () => {
        const { wrapper } = setup();
        renderHook(() => useLatestCvAnalysis(undefined), { wrapper });
        expect(service.getLatestCvAnalysis).not.toHaveBeenCalled();
    });

    it('loads typed paginated history with a parameterized key', async () => {
        const history = {
            items: [],
            pagination: { page: 2, limit: 5, total: 0, totalPages: 0 },
        };
        service.getCvAnalysisHistory.mockResolvedValue(history);
        const { client, wrapper } = setup();
        const { result } = renderHook(
            () => useCvAnalysisHistory('cv-123', { page: 2, limit: 5 }),
            { wrapper },
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(service.getCvAnalysisHistory).toHaveBeenCalledWith('cv-123', {
            page: 2,
            limit: 5,
        });
        expect(
            client.getQueryData(
                cvKeys.analysisHistory('cv-123', { page: 2, limit: 5 }),
            ),
        ).toBe(history);
    });

    it('writes success to latest cache and invalidates all history pages', async () => {
        service.analyzeCv.mockResolvedValue(analysis);
        const { client, wrapper } = setup();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHook(() => useAnalyzeCv(), { wrapper });

        await act(() => result.current.mutateAsync({ cvId: 'cv-123' }));

        expect(service.analyzeCv).toHaveBeenCalledWith('cv-123');
        expect(client.getQueryData(cvKeys.analysisLatest('cv-123'))).toBe(
            analysis,
        );
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: cvKeys.analysisHistories('cv-123'),
        });
    });

    it('keeps previous latest cache when re-analysis fails', async () => {
        service.analyzeCv.mockRejectedValue(new Error('provider failed'));
        const { client, wrapper } = setup();
        const invalidate = vi.spyOn(client, 'invalidateQueries');
        client.setQueryData(cvKeys.analysisLatest('cv-123'), analysis);
        const { result } = renderHook(() => useAnalyzeCv(), { wrapper });

        await expect(
            act(() => result.current.mutateAsync({ cvId: 'cv-123' })),
        ).rejects.toThrow('provider failed');
        expect(client.getQueryData(cvKeys.analysisLatest('cv-123'))).toBe(
            analysis,
        );
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: cvKeys.analysisHistories('cv-123'),
        });
    });
});
