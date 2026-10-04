'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createInterview,
    deleteInterview,
    deleteInterviews,
    getInterview,
    getInterviewOptions,
    getInterviews,
    previewInterviewPlan,
    regenerateInterviewPlan,
} from '@/services/interview.service';

import { interviewKeys as keys } from './interview-keys';
import type { InterviewListSort, InterviewStatus } from '@/types/interview';

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
