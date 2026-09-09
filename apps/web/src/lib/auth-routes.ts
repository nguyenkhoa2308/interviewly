export const PROTECTED_ROUTES = [
    '/dashboard',
    '/interviews',
    '/practice',
    '/questions',
    '/cv',
    '/job-descriptions',
    '/matching',
    '/reports',
    '/skill-progress',
    '/learning-plan',
    '/history',
    '/saved',
    '/profile',
    '/settings',
] as const;

export const GUEST_AUTH_ROUTES = [
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/check-email',
    '/verify-email',
    '/reset-password',
] as const;

export const ONBOARDING_ROUTE = '/onboarding';

export function matchesRoute(
    pathname: string,
    routes: readonly string[],
): boolean {
    return routes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
}
