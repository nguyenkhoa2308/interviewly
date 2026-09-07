import { useQuery } from '@tanstack/react-query';

import { getMe } from '@/services/auth.service';

export const authKeys = {
    all: ['auth'] as const,
    me: ['auth', 'me'] as const,
};

interface UseMeOptions {
    enabled?: boolean;
    refetchOnMount?: boolean | 'always';
}

export function useMe({
    enabled = true,
    refetchOnMount = true,
}: UseMeOptions = {}) {
    return useQuery({
        queryKey: authKeys.me,
        queryFn: getMe,
        retry: false,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount,
        enabled,
    });
}
