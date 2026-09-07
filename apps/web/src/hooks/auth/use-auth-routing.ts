'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { authKeys } from '@/hooks/auth/use-me';
import { getSafePostAuthRedirect } from '@/lib/auth-redirect';
import { markAuthenticatedSession } from '@/lib/auth-session';
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

        const user = await getMe();
        queryClient.setQueryData(authKeys.me, user);
        markAuthenticatedSession();

        const safeRedirect = getSafePostAuthRedirect(
            new URLSearchParams(window.location.search).get('redirect'),
        );
        router.replace(
            user.onboardingCompletedAt === null
                ? '/onboarding'
                : (safeRedirect ?? '/dashboard'),
        );

        return user;
    };

    return { routeAuthenticatedUser };
}
