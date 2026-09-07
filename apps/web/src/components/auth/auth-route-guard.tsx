'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/error-state';
import { LoadingState } from '@/components/common/loading-state';
import { useAuth } from '@/hooks/auth/use-auth';
import { authKeys } from '@/hooks/auth/use-me';
import { onboardingKeys } from '@/hooks/onboarding/use-onboarding';
import { getAuthRouteDestination } from '@/lib/auth-redirect';
import {
    AUTH_SESSION_EXPIRED_EVENT,
    clearObservedSession,
} from '@/lib/auth-session';

const PROTECTED_ROUTES = ['/dashboard', '/practice', '/history', '/settings'];
const GUEST_ROUTES = ['/sign-in', '/sign-up'];

export function AuthRouteGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const sessionToastShown = useRef(false);
    const isProtected = matches(pathname, PROTECTED_ROUTES);
    const isGuest = matches(pathname, GUEST_ROUTES);
    const isOnboarding = matches(pathname, ['/onboarding']);
    const shouldCheckAuth = isProtected || isGuest || isOnboarding;
    const auth = useAuth({
        enabled: shouldCheckAuth,
        refetchOnMount: isGuest ? 'always' : true,
    });

    useEffect(() => {
        const handleSessionExpired = () => {
            clearObservedSession();
            void queryClient.cancelQueries({ queryKey: authKeys.all });
            queryClient.removeQueries({ queryKey: authKeys.all });
            queryClient.removeQueries({ queryKey: onboardingKeys.all });

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

    const redirectDestination = getAuthRouteDestination({
        pathname,
        isProtected,
        isGuest,
        isOnboarding,
        isAuthenticated: auth.isAuthenticated,
        isUnauthenticated: auth.isUnauthenticated,
        onboardingCompletedAt: auth.user?.onboardingCompletedAt,
    });

    useEffect(() => {
        if (redirectDestination) router.replace(redirectDestination);
    }, [redirectDestination, router]);

    if (!shouldCheckAuth) return children;
    if (auth.isInitializing || redirectDestination) {
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

function matches(pathname: string, routes: string[]): boolean {
    return routes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
}

function currentPath(): string {
    return `${window.location.pathname}${window.location.search}`;
}
