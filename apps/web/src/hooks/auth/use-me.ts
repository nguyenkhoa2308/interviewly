import { useQuery } from '@tanstack/react-query';

import { getMe } from '@/services/auth.service';

export const authKeys = {
    me: ['auth', 'me'] as const,
};

interface UseMeOptions {
    enabled?: boolean;
}

export function useMe({ enabled = true }: UseMeOptions = {}) {
    return useQuery({
        queryKey: authKeys.me,
        queryFn: getMe,
        retry: false,
        enabled,
    });
}
