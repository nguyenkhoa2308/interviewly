'use client';

import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    analyzeJobDescription,
    createJobDescription,
    deleteJobDescription,
    getJdAnalysisHistory,
    getJobDescription,
    getJobDescriptions,
    getLatestJdAnalysis,
    updateJobDescription,
} from '@/services/job-description.service';
import type {
    JdAnalysisHistoryParams,
    JobDescriptionListSort,
    JobDescriptionListStatus,
    JobDescriptionPayload,
} from '@/types/job-description';
import { jobDescriptionKeys as keys } from './job-description-keys';

const authMeta = { requiresAuth: true } as const;
export function useJobDescriptions(
    params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: JobDescriptionListStatus;
        sort?: JobDescriptionListSort;
    } = {},
) {
    return useQuery({
        queryKey: keys.list(params),
        queryFn: () => getJobDescriptions(params),
        placeholderData: keepPreviousData,
        meta: authMeta,
    });
}
export function useJobDescription(id: string) {
    return useQuery({
        queryKey: keys.detail(id),
        queryFn: () => getJobDescription(id),
        enabled: Boolean(id),
        meta: authMeta,
    });
}
export function useLatestJdAnalysis(id: string) {
    return useQuery({
        queryKey: keys.latest(id),
        queryFn: () => getLatestJdAnalysis(id),
        enabled: Boolean(id),
        retry: false,
        meta: authMeta,
    });
}
export function useJdAnalysisHistory(
    id: string,
    params: JdAnalysisHistoryParams = {},
) {
    return useQuery({
        queryKey: keys.history(id, params),
        queryFn: () => getJdAnalysisHistory(id, params),
        enabled: Boolean(id),
        placeholderData: keepPreviousData,
        meta: authMeta,
    });
}
export function useCreateJobDescription() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: createJobDescription,
        onSuccess: () => client.invalidateQueries({ queryKey: keys.lists() }),
    });
}
export function useUpdateJobDescription(id: string) {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (payload: Partial<JobDescriptionPayload>) =>
            updateJobDescription(id, payload),
        onSuccess: (data) => {
            client.setQueryData(keys.detail(id), data);
            void client.invalidateQueries({ queryKey: keys.lists() });
        },
    });
}
export function useDeleteJobDescription() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: deleteJobDescription,
        onSuccess: (_, id) => {
            client.removeQueries({ queryKey: keys.detail(id) });
            void client.invalidateQueries({ queryKey: keys.lists() });
        },
    });
}
export function useAnalyzeJobDescription(id: string) {
    const client = useQueryClient();
    return useMutation({
        mutationFn: () => analyzeJobDescription(id),
        retry: false,
        onSuccess: (data) => {
            client.setQueryData(keys.latest(id), data);
            void client.invalidateQueries({ queryKey: keys.histories(id) });
            void client.invalidateQueries({ queryKey: keys.lists() });
        },
    });
}
