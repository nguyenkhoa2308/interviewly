import type { Response } from 'express';
import ms, { type StringValue } from 'ms';

type AuthCookieOptions = {
    isProduction: boolean;
    accessExpiresIn: string;
    refreshExpiresIn: string;
};

export function setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    options: AuthCookieOptions,
) {
    const commonOptions = {
        httpOnly: true,
        secure: options.isProduction,
        sameSite: 'lax' as const,
        path: '/',
    };

    res.cookie('access_token', accessToken, {
        ...commonOptions,
        maxAge: ms(options.accessExpiresIn as StringValue),
    });

    res.cookie('refresh_token', refreshToken, {
        ...commonOptions,
        maxAge: ms(options.refreshExpiresIn as StringValue),
    });
}

export function clearAuthCookies(res: Response, isProduction: boolean) {
    const options = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
    };

    res.clearCookie('access_token', options);
    res.clearCookie('refresh_token', options);
}
