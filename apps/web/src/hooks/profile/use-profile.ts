import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/hooks/auth/use-me';
import { getProfile } from '@/services/profile.service';

export const profileKeys = {
    all: ['profile'] as const,
    detail: (userId: string) => ['profile', 'detail', userId] as const,
};

export function useProfile() {
    const meQuery = useMe();
    const userId = meQuery.data?.id;

    return useQuery({
        queryKey: profileKeys.detail(userId ?? 'anonymous'),
        queryFn: getProfile,
        retry: false,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        enabled: Boolean(userId),
        meta: { requiresAuth: true },
    });
}
