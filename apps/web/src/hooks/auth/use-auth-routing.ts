'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { authKeys } from '@/hooks/auth/use-me';
import { getMe } from '@/services/auth.service';

export function useAuthRouting() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const routeAuthenticatedUser = async () => {
        await queryClient.cancelQueries({
            queryKey: authKeys.me,
            exact: true,
        });
        queryClient.removeQueries({
            queryKey: authKeys.me,
            exact: true,
        });

        const response = await queryClient.fetchQuery({
            queryKey: authKeys.me,
            queryFn: getMe,
            staleTime: 0,
            retry: false,
        });

        router.replace(
            response.data.onboardingCompletedAt === null
                ? '/onboarding'
                : '/dashboard',
        );

        return response.data;
    };

    return { routeAuthenticatedUser };
}
