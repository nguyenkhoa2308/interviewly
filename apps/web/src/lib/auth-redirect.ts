const POST_AUTH_ROUTES = ['/dashboard', '/practice', '/history', '/settings'];

export function getSafePostAuthRedirect(value: string | null): string | null {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return null;

    try {
        const url = new URL(value, 'http://interviewly.local');
        if (url.origin !== 'http://interviewly.local') return null;

        const isAllowed = POST_AUTH_ROUTES.some(
            (route) =>
                url.pathname === route || url.pathname.startsWith(`${route}/`),
        );

        return isAllowed ? `${url.pathname}${url.search}${url.hash}` : null;
    } catch {
        return null;
    }
}

export function getAuthRouteDestination(input: {
    pathname: string;
    isProtected: boolean;
    isGuest: boolean;
    isOnboarding: boolean;
    isAuthenticated: boolean;
    isUnauthenticated: boolean;
    onboardingCompletedAt: string | null | undefined;
}): string | null {
    const {
        pathname,
        isProtected,
        isGuest,
        isOnboarding,
        isAuthenticated,
        isUnauthenticated,
        onboardingCompletedAt,
    } = input;

    if (isUnauthenticated && (isProtected || isOnboarding)) {
        return `/sign-in?redirect=${encodeURIComponent(pathname)}`;
    }
    if (!isAuthenticated) return null;
    if (onboardingCompletedAt === null && isProtected) return '/onboarding';
    if (onboardingCompletedAt !== null && isOnboarding) return '/dashboard';
    if (isGuest) {
        return onboardingCompletedAt === null ? '/onboarding' : '/dashboard';
    }
    return null;
}
