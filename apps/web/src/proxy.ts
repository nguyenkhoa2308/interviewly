import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
    '/dashboard',
    '/onboarding',
    '/practice',
    '/history',
    '/settings',
];

export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    const isProtectedRoute = PROTECTED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

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
