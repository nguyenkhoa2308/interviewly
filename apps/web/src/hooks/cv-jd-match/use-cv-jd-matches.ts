'use client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCvJdMatch, getCvJdMatch, getCvJdMatches, getMatchOptions } from '@/services/cv-jd-match.service';
import { cvJdMatchKeys as keys } from './cv-jd-match-keys';
const authMeta = { requiresAuth: true } as const;
export function useMatchOptions() { return useQuery({ queryKey: keys.options(), queryFn: getMatchOptions, meta: authMeta }); }
export function useCvJdMatch(id: string) { return useQuery({ queryKey: keys.detail(id), queryFn: () => getCvJdMatch(id), enabled: Boolean(id), meta: authMeta }); }
export function useCvJdMatches(params: { page?: number; limit?: number; cvId?: string; jobDescriptionId?: string } = {}) { return useQuery({ queryKey: keys.list(params), queryFn: () => getCvJdMatches(params), placeholderData: keepPreviousData, meta: authMeta }); }
export function useCreateCvJdMatch() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: createCvJdMatch,
        retry: false,
        onSuccess: (data) => {
            client.setQueryData(keys.detail(data.id), data);
            void client.invalidateQueries({ queryKey: keys.lists() });
        },
    });
}