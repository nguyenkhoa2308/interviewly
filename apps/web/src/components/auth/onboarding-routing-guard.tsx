'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { ErrorState } from '@/components/common/error-state';
import { useMe } from '@/hooks/auth/use-me';

const ONBOARDING_REQUIRED_ROUTES = [
    '/dashboard',
    '/practice',
    '/history',
    '/settings',
];
const ONBOARDING_ROUTE = '/onboarding';

interface OnboardingRoutingGuardProps {
    children: ReactNode;
}

export function OnboardingRoutingGuard({
    children,
}: OnboardingRoutingGuardProps) {
    const pathname = usePathname();
    const router = useRouter();
    const requiresCompletedOnboarding = ONBOARDING_REQUIRED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
    const isOnboardingRoute =
        pathname === ONBOARDING_ROUTE ||
        pathname.startsWith(`${ONBOARDING_ROUTE}/`);

    const { data, isPending, isError, refetch } = useMe({
        enabled: requiresCompletedOnboarding || isOnboardingRoute,
    });
    const user = data?.data;
    const redirectDestination =
        requiresCompletedOnboarding && user?.onboardingCompletedAt === null
            ? ONBOARDING_ROUTE
            : isOnboardingRoute &&
                user !== undefined &&
                user.onboardingCompletedAt !== null
              ? '/dashboard'
              : null;

    useEffect(() => {
        if (redirectDestination) {
            router.replace(redirectDestination);
        }
    }, [redirectDestination, router]);

    if (!requiresCompletedOnboarding && !isOnboardingRoute) {
        return children;
    }

    if (isPending || redirectDestination) {
        return null;
    }

    if (isError) {
        return (
            <ErrorState
                title="Không thể kiểm tra tài khoản"
                description="Vui lòng thử lại để tiếp tục."
                onRetry={() => void refetch()}
            />
        );
    }

    return children;
}
