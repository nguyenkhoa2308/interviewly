'use client';

import { useQuery } from '@tanstack/react-query';

import { getSessions } from '@/services/auth.service';

export const sessionKeys = {
    all: ['auth', 'sessions'] as const,
};

export function useSessions(enabled = true) {
    return useQuery({
        queryKey: sessionKeys.all,
        queryFn: getSessions,
        enabled,
        retry: false,
        meta: { requiresAuth: true },
    });
}
