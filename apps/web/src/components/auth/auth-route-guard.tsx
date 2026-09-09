'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/error-state';
import { LoadingState } from '@/components/common/loading-state';
import { useAuth } from '@/hooks/auth/use-auth';
import { clearAuthenticatedQueries } from '@/lib/auth-query-cache';
import {
    GUEST_AUTH_ROUTES,
    ONBOARDING_ROUTE,
    PROTECTED_ROUTES,
    matchesRoute,
} from '@/lib/auth-routes';
import { getAuthRouteDestination } from '@/lib/auth-redirect';
import {
    AUTH_SESSION_EXPIRED_EVENT,
    clearObservedSession,
} from '@/lib/auth-session';

export function AuthRouteGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const sessionToastShown = useRef(false);
    const isProtected = matchesRoute(pathname, PROTECTED_ROUTES);
    const isGuest = matchesRoute(pathname, GUEST_AUTH_ROUTES);
    const isOnboarding = matchesRoute(pathname, [ONBOARDING_ROUTE]);
    const shouldCheckAuth = isProtected || isGuest || isOnboarding;
    const auth = useAuth({
        enabled: shouldCheckAuth,
        refetchOnMount: isGuest ? 'always' : true,
    });

    useEffect(() => {
        const handleSessionExpired = async () => {
            clearObservedSession();
            await clearAuthenticatedQueries(queryClient);

            if (!isProtected && !isOnboarding) return;

            if (!sessionToastShown.current) {
                sessionToastShown.current = true;
                toast.error(
                    'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                );
            }

            router.replace(
                `/sign-in?redirect=${encodeURIComponent(currentPath())}`,
            );
        };

        window.addEventListener(
            AUTH_SESSION_EXPIRED_EVENT,
            handleSessionExpired,
        );
        return () =>
            window.removeEventListener(
                AUTH_SESSION_EXPIRED_EVENT,
                handleSessionExpired,
            );
    }, [isOnboarding, isProtected, queryClient, router]);

    const isAuthDecisionPending =
        auth.isInitializing || (isGuest && auth.isFetching);
    const redirectDestination = isAuthDecisionPending
        ? null
        : getAuthRouteDestination({
              pathname,
              isProtected,
              isGuest,
              isOnboarding,
              isAuthenticated: auth.isAuthenticated,
              isUnauthenticated: auth.isUnauthenticated,
              onboardingCompletedAt: auth.user?.onboardingCompletedAt,
          });

    useEffect(() => {
        if (auth.isAuthenticated) sessionToastShown.current = false;
    }, [auth.isAuthenticated]);

    useEffect(() => {
        if (redirectDestination) router.replace(redirectDestination);
    }, [redirectDestination, router]);

    if (!shouldCheckAuth) return children;
    if (isAuthDecisionPending || redirectDestination) {
        return <LoadingState message="Đang kiểm tra phiên đăng nhập..." />;
    }
    if (auth.isUnexpectedError && (isProtected || isOnboarding)) {
        return (
            <ErrorState
                title="Không thể kiểm tra phiên đăng nhập"
                description="Vui lòng kiểm tra kết nối và thử lại."
                onRetry={() => void auth.refetch()}
            />
        );
    }

    return children;
}

function currentPath(): string {
    return `${window.location.pathname}${window.location.search}`;
}
