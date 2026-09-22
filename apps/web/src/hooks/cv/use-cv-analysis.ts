'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cvKeys } from '@/hooks/cv/cv-keys';
import {
    analyzeCv,
    getCvAnalysisHistory,
    getLatestCvAnalysis,
} from '@/services/cv.service';
import type {
    CvAnalysis,
    CvAnalysisHistoryParams,
    CvAnalysisHistoryResponse,
} from '@/types/cv';
import { ApiError } from '@/lib/api-error';
import { shouldRetryCvQuery } from './cv-query-retry';

export function useLatestCvAnalysis(cvId?: string) {
    return useQuery<CvAnalysis | null, ApiError>({
        queryKey: cvKeys.analysisLatest(cvId ?? ''),
        queryFn: () => getLatestCvAnalysis(cvId!),
        enabled: Boolean(cvId),
        retry: shouldRetryCvQuery,
        meta: { requiresAuth: true },
    });
}

export function useCvAnalysisHistory(
    cvId?: string,
    params: CvAnalysisHistoryParams = {},
) {
    return useQuery<CvAnalysisHistoryResponse, ApiError>({
        queryKey: cvKeys.analysisHistory(cvId ?? '', params),
        queryFn: () => getCvAnalysisHistory(cvId!, params),
        enabled: Boolean(cvId),
        retry: shouldRetryCvQuery,
        meta: { requiresAuth: true },
    });
}

export function useAnalyzeCv() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ cvId }: { cvId: string }) => analyzeCv(cvId),
        retry: false,
        onSuccess: (analysis, { cvId }) => {
            queryClient.setQueryData(cvKeys.analysisLatest(cvId), analysis);
        },
        onSettled: async (_analysis, _error, { cvId }) => {
            await queryClient.invalidateQueries({
                queryKey: cvKeys.analysisHistories(cvId),
            });
        },
    });
}
