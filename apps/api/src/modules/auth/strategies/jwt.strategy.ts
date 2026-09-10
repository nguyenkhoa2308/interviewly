import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { AUTH_ERROR_CODE } from '../constants/auth-error-code.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.access_token ?? null;
                },
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
    }

    async validate(payload: { sub: string; sid: string; role: string }) {
        const session = await this.prisma.session.findFirst({
            where: {
                id: payload.sid,
                userId: payload.sub,
                revokedAt: null,
                expiresAt: { gt: new Date() },
                user: { status: 'ACTIVE', deletedAt: null },
            },
            select: {
                user: { select: { id: true, email: true, role: true } },
            },
        });

        if (!session) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODE.INVALID_SESSION,
                message: 'Phiên làm việc đã hết hạn hoặc không hợp lệ.',
            });
        }

        return {
            id: session.user.id,
            sessionId: payload.sid,
            email: session.user.email,
            role: session.user.role,
        };
    }
}
