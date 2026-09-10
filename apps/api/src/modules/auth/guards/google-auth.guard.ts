import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { randomBytes, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';

interface GoogleAuthRequest extends Request {
    googleOAuthState?: string;
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
    constructor(private readonly configService: ConfigService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<GoogleAuthRequest>();
        const response = context.switchToHttp().getResponse<Response>();
        const isCallback = request.path.endsWith('/callback');

        if (isCallback) {
            this.assertValidState(request);
            response.clearCookie(
                'google_oauth_state',
                this.stateCookieOptions(),
            );
        } else {
            const state = randomBytes(32).toString('base64url');
            request.googleOAuthState = state;
            response.cookie('google_oauth_state', state, {
                ...this.stateCookieOptions(),
                maxAge: 10 * 60 * 1000,
            });
        }

        return (await super.canActivate(context)) as boolean;
    }

    getAuthenticateOptions(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest<GoogleAuthRequest>();
        return request.googleOAuthState
            ? { state: request.googleOAuthState }
            : undefined;
    }

    private assertValidState(request: GoogleAuthRequest) {
        const received = request.query?.state;
        const expected = request.cookies?.google_oauth_state;

        if (
            typeof received !== 'string' ||
            typeof expected !== 'string' ||
            received.length !== expected.length ||
            !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
        ) {
            throw new UnauthorizedException({
                code: 'GOOGLE_AUTH_STATE_INVALID',
                message: 'Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn.',
            });
        }
    }

    private stateCookieOptions() {
        return {
            httpOnly: true,
            secure: this.configService.get<string>('NODE_ENV') === 'production',
            sameSite: 'lax' as const,
            path: '/api/v1/auth/google/callback',
        };
    }

    handleRequest<TUser = any>(
        err: any,
        user: TUser,
        info: any,
        context: ExecutionContext,
    ): TUser {
        const request = context.switchToHttp().getRequest();

        if (request.query?.error === 'access_denied') {
            throw new UnauthorizedException({
                code: 'GOOGLE_AUTH_CANCELLED',
                message: 'Đăng nhập Google đã bị hủy.',
            });
        }

        if (err || !user) {
            throw (
                err ||
                new UnauthorizedException({
                    code: 'GOOGLE_AUTH_FAILED',
                    message: 'Không thể xác thực tài khoản Google.',
                })
            );
        }

        return user;
    }
}
