import { NextResponse, type NextRequest } from 'next/server';

import {
    ONBOARDING_ROUTE,
    PROTECTED_ROUTES,
    matchesRoute,
} from '@/lib/auth-routes';

export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const isProtectedRoute =
        matchesRoute(pathname, PROTECTED_ROUTES) ||
        pathname === ONBOARDING_ROUTE;

    if (!isProtectedRoute) return NextResponse.next();

    const hasSessionCookie = Boolean(
        request.cookies.get('access_token')?.value ||
        request.cookies.get('refresh_token')?.value,
    );

    if (hasSessionCookie) return NextResponse.next();

    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icon.png|logos|images).*)',
    ],
};
