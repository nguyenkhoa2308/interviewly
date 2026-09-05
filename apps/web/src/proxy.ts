import { NextResponse, type NextRequest } from 'next/server';

// Các route auth không cho phép truy cập khi ĐÃ đăng nhập
const AUTH_ONLY_ROUTES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'];

// Các route yêu cầu BẮT BUỘC phải đăng nhập
const PROTECTED_ROUTES = ['/dashboard', '/onboarding', '/practice', '/history', '/settings'];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const accessToken = request.cookies.get('access_token')?.value;
    const refreshToken = request.cookies.get('refresh_token')?.value;
    const isAuthenticated = Boolean(accessToken || refreshToken);

    // 1. Đã đăng nhập nhưng cố vào /sign-in, /sign-up -> Chuyển hướng sang /dashboard
    const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route));
    if (isAuthOnlyRoute && isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 2. Chưa đăng nhập nhưng cố vào các trang được bảo vệ -> Chuyển hướng về /sign-in
    const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
    if (isProtectedRoute && !isAuthenticated) {
        const redirectUrl = new URL('/sign-in', request.url);
        redirectUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Khớp tất cả request paths ngoại trừ:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, icon.png
         * - public images/logos
         */
        '/((?!_next/static|_next/image|favicon.ico|icon.png|logos|images).*)',
    ],
};
