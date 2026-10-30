'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createInterview,
    deleteInterview,
    deleteInterviews,
    getInterview,
    getInterviewOptions,
    getInterviews,
    getInterviewRuntime,
    previewInterviewPlan,
    startInterview,
    submitInterviewAnswer,
    regenerateInterviewPlan,
    getInterviewEvaluation,
    getInterviewQuestionReviews,
    reanalyzeInterviewQuestionReviews,
    createInterviewEvaluation,
    retryInterviewEvaluation,
    reanalyzeInterviewEvaluation,
    getInterviewHistory,
    getInterviewTranscript,
    getInterviewProgress,
} from '@/services/interview.service';

import { interviewKeys as keys } from './interview-keys';
import type {
    InterviewHistoryFilters,
    InterviewListSort,
    InterviewProgressFilters,
    InterviewStatus,
} from '@/types/interview';

const meta = { requiresAuth: true } as const;

export const useInterviewOptions = () =>
    useQuery({
        queryKey: keys.options(),
        queryFn: getInterviewOptions,
        meta,
    });

export const useInterviews = (
    page = 1,
    status?: InterviewStatus,
    search?: string,
    sort?: InterviewListSort,
) =>
    useQuery({
        queryKey: keys.list(page, status, search, sort),
        queryFn: () => getInterviews(page, status, search, sort),
        placeholderData: (previousData) => previousData,
        meta,
    });

export const useInterview = (id: string) =>
    useQuery({
        queryKey: keys.detail(id),
        queryFn: () => getInterview(id),
        enabled: Boolean(id),
        meta,
    });

export function usePreviewInterviewPlan() {
    return useMutation({ mutationFn: previewInterviewPlan, retry: false });
}

export function useCreateInterview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createInterview,
        retry: false,
        onSuccess: (data) => {
            queryClient.setQueryData(keys.detail(data.id), data);
            void queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useDeleteInterview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteInterview,
        onSuccess: (_, id) => {
            queryClient.removeQueries({ queryKey: keys.detail(id) });
            void queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useDeleteInterviews() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteInterviews,
        onSuccess: (_, ids) => {
            ids.forEach((id) =>
                queryClient.removeQueries({ queryKey: keys.detail(id) }),
            );
            void queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useRegenerateInterviewPlan(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => regenerateInterviewPlan(id),
        retry: false,
        onSuccess: (data) => queryClient.setQueryData(keys.detail(id), data),
    });
}

export const useInterviewRuntime = (id: string) =>
    useQuery({
        queryKey: keys.runtime(id),
        queryFn: () => getInterviewRuntime(id),
        enabled: Boolean(id),
        refetchInterval: (query) =>
            query.state.data?.processing ? 2_000 : false,
        meta,
    });

export function useStartInterview(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => startInterview(id),
        retry: false,
        onSuccess: (data) => {
            queryClient.setQueryData(keys.runtime(id), data);
            void queryClient.invalidateQueries({ queryKey: keys.detail(id) });
            void queryClient.invalidateQueries({ queryKey: keys.all });
        },
    });
}

export function useSubmitInterviewAnswer(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: { turnId: string; answer: string }) =>
            submitInterviewAnswer(id, payload),
        retry: false,
        onSuccess: (data) => {
            queryClient.setQueryData(keys.runtime(id), data);
            if (data.completed) {
                void queryClient.invalidateQueries({
                    queryKey: keys.detail(id),
                });
                void queryClient.invalidateQueries({ queryKey: keys.all });
            }
        },
    });
}

export const useInterviewQuestionReviews = (id: string) =>
    useQuery({
        queryKey: keys.questionReviews(id),
        queryFn: () => getInterviewQuestionReviews(id),
        enabled: Boolean(id),
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (!['PENDING', 'PROCESSING'].includes(status ?? '')) return false;

            const completedPolls = query.state.dataUpdateCount;
            if (completedPolls < 4) return 3_000;
            if (completedPolls < 10) return 5_000;
            return 10_000;
        },
        meta,
    });

export function useReanalyzeInterviewQuestionReviews(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => reanalyzeInterviewQuestionReviews(id),
        retry: false,
        onSuccess: (data) => {
            queryClient.setQueryData(keys.questionReviews(id), data);
            void queryClient.invalidateQueries({
                queryKey: keys.evaluation(id),
            });
        },
    });
}

export const useInterviewEvaluation = (id: string) =>
    useQuery({
        queryKey: keys.evaluation(id),
        queryFn: () => getInterviewEvaluation(id),
        enabled: Boolean(id),
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (!['PENDING', 'PROCESSING'].includes(status ?? '')) return false;

            const completedPolls = query.state.dataUpdateCount;
            if (completedPolls < 4) return 3_000;
            if (completedPolls < 10) return 5_000;
            return 10_000;
        },
        meta,
    });

export function useCreateInterviewEvaluation(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => createInterviewEvaluation(id),
        retry: false,
        onSuccess: (data) =>
            queryClient.setQueryData(keys.evaluation(id), data),
    });
}

export function useRetryInterviewEvaluation(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => retryInterviewEvaluation(id),
        retry: false,
        onSuccess: (data) =>
            queryClient.setQueryData(keys.evaluation(id), data),
    });
}

export function useReanalyzeInterviewEvaluation(id: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => reanalyzeInterviewEvaluation(id),
        retry: false,
        onSuccess: (data) =>
            queryClient.setQueryData(keys.evaluation(id), data),
    });
}

export const useInterviewHistory = (filters: InterviewHistoryFilters) =>
    useQuery({
        queryKey: keys.history(filters),
        queryFn: () => getInterviewHistory(filters),
        placeholderData: (previousData) => previousData,
        meta,
    });

export const useInterviewTranscript = (id: string) =>
    useQuery({
        queryKey: keys.transcript(id),
        queryFn: () => getInterviewTranscript(id),
        enabled: Boolean(id),
        meta,
    });

export const useInterviewProgress = (filters: InterviewProgressFilters = {}) =>
    useQuery({
        queryKey: keys.progress(filters),
        queryFn: () => getInterviewProgress(filters),
        meta,
    });
