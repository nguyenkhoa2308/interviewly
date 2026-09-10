import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';

import { PrismaService } from '../../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
    const config = {
        getOrThrow: jest.fn().mockReturnValue('x'.repeat(32)),
    };
    const prisma = { session: { findFirst: jest.fn() } };
    const strategy = new JwtStrategy(
        config as unknown as ConfigService,
        prisma as unknown as PrismaService,
    );

    beforeEach(() => jest.clearAllMocks());

    it('resolves identity from an active owned session instead of JWT profile data', async () => {
        prisma.session.findFirst.mockResolvedValue({
            user: { id: 'user-1', email: 'fresh@example.com', role: 'ADMIN' },
        });

        await expect(
            strategy.validate({
                sub: 'user-1',
                sid: 'session-1',
                role: 'USER',
            }),
        ).resolves.toEqual({
            id: 'user-1',
            sessionId: 'session-1',
            email: 'fresh@example.com',
            role: 'ADMIN',
        });
        expect(prisma.session.findFirst).toHaveBeenCalledWith({
            where: {
                id: 'session-1',
                userId: 'user-1',
                revokedAt: null,
                expiresAt: { gt: expect.any(Date) },
                user: { status: 'ACTIVE', deletedAt: null },
            },
            select: {
                user: { select: { id: true, email: true, role: true } },
            },
        });
    });

    it('rejects a revoked, expired, suspended, deleted or missing session', async () => {
        prisma.session.findFirst.mockResolvedValue(null);

        await expect(
            strategy.validate({
                sub: 'user-1',
                sid: 'session-1',
                role: 'USER',
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
