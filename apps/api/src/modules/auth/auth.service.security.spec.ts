import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';

import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import { hashValue } from './utils/hash.util';

describe('AuthService session security', () => {
    const activeUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
        status: 'ACTIVE',
    };

    const createService = () => {
        const prisma = {
            user: {
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
            session: {
                create: jest.fn(),
                findUnique: jest.fn(),
                updateMany: jest.fn(),
            },
            emailVerification: {
                create: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
            },
            oAuthAccount: { findUnique: jest.fn(), create: jest.fn() },
            $transaction: jest.fn(),
        };
        prisma.$transaction.mockImplementation(
            async (
                operation:
                    | Promise<unknown>[]
                    | ((tx: typeof prisma) => Promise<unknown>),
            ) =>
                typeof operation === 'function'
                    ? operation(prisma)
                    : Promise.all(operation),
        );

        const jwtService = {
            signAsync: jest.fn(async (payload: Record<string, unknown>) =>
                Buffer.from(JSON.stringify(payload)).toString('base64url'),
            ),
            verifyAsync: jest.fn(),
        };
        const configService = {
            getOrThrow: jest.fn((key: string) => {
                if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
                if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
                return 'x'.repeat(32);
            }),
        };
        const mailService = {
            sendVerificationOtp: jest.fn().mockResolvedValue(undefined),
        };
        const service = new AuthService(
            prisma as unknown as PrismaService,
            jwtService as unknown as JwtService,
            configService as unknown as ConfigService,
            mailService as unknown as MailService,
        );

        return { service, prisma, jwtService, mailService };
    };

    it('normalizes registration data, hashes password and never returns the hash', async () => {
        const { service, prisma } = createService();
        prisma.user.findUnique.mockResolvedValue(null);
        prisma.user.create.mockImplementation(
            async ({ data }: { data: Record<string, unknown> }) => ({
                id: 'user-1',
                email: data.email,
                fullName: data.fullName,
                emailVerifiedAt: null,
                onboardingCompletedAt: null,
                role: 'USER',
                status: 'ACTIVE',
                createdAt: new Date(),
            }),
        );
        prisma.emailVerification.create.mockResolvedValue({ id: 'otp-1' });

        const result = await service.register({
            fullName: '  Nguyễn Khoa  ',
            email: ' USER@Example.com ',
            password: 'Password@123',
        });

        const createData = prisma.user.create.mock.calls[0][0].data;
        expect(createData.email).toBe('user@example.com');
        expect(createData.fullName).toBe('Nguyễn Khoa');
        expect(createData.passwordHash).not.toBe('Password@123');
        expect(await hashMatches(createData.passwordHash, 'Password@123')).toBe(
            true,
        );
        expect(result).not.toHaveProperty('passwordHash');
    });

    it('issues a session-bound access token and a unique refresh jti', async () => {
        const { service, prisma, jwtService } = createService();
        const passwordHash = await hashValue('Password@123');
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            fullName: 'User',
            passwordHash,
            emailVerifiedAt: new Date(),
            onboardingCompletedAt: null,
        });
        prisma.session.create.mockResolvedValue({ id: 'session-1' });

        await service.login({
            email: activeUser.email,
            password: 'Password@123',
        });

        const accessPayload = jwtService.signAsync.mock.calls[0][0];
        const refreshPayload = jwtService.signAsync.mock.calls[1][0];
        expect(accessPayload).toMatchObject({
            sub: activeUser.id,
            role: 'USER',
        });
        expect(accessPayload).toHaveProperty('sid');
        expect(accessPayload).not.toHaveProperty('email');
        expect(refreshPayload).toMatchObject({ sub: activeUser.id });
        expect(refreshPayload).toHaveProperty('sid');
        expect(refreshPayload).toHaveProperty('jti');
    });

    it('rejects Google-only, suspended and deleted password login safely', async () => {
        const { service, prisma } = createService();

        for (const user of [
            { ...activeUser, passwordHash: null },
            {
                ...activeUser,
                passwordHash: await hashValue('Password@123'),
                emailVerifiedAt: new Date(),
                status: 'SUSPENDED',
            },
            {
                ...activeUser,
                passwordHash: await hashValue('Password@123'),
                emailVerifiedAt: new Date(),
                status: 'DELETED',
            },
        ]) {
            prisma.user.findUnique.mockResolvedValueOnce(user);
            await expect(
                service.login({
                    email: activeUser.email,
                    password: 'Password@123',
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        }

        expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('rotates refresh tokens atomically without creating another session', async () => {
        const { service, prisma, jwtService } = createService();
        const oldToken = 'old-refresh-token';
        const oldHash = await hashValue(oldToken);
        jwtService.verifyAsync.mockResolvedValue({
            sub: activeUser.id,
            sid: 'session-1',
        });
        prisma.session.findUnique.mockResolvedValue({
            id: 'session-1',
            userId: activeUser.id,
            refreshTokenHash: oldHash,
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            user: activeUser,
        });
        prisma.session.updateMany.mockResolvedValue({ count: 1 });

        const result = await service.refresh(oldToken);

        expect(result.refreshToken).not.toBe(oldToken);
        expect(prisma.session.create).not.toHaveBeenCalled();
        expect(prisma.session.updateMany).toHaveBeenCalledWith({
            where: expect.objectContaining({
                id: 'session-1',
                userId: activeUser.id,
                refreshTokenHash: oldHash,
                revokedAt: null,
            }),
            data: expect.objectContaining({
                refreshTokenHash: expect.any(String),
                lastUsedAt: expect.any(Date),
            }),
        });
    });

    it('rejects refresh rotation when another request already consumed it', async () => {
        const { service, prisma, jwtService } = createService();
        const oldToken = 'already-rotated-token';
        jwtService.verifyAsync.mockResolvedValue({
            sub: activeUser.id,
            sid: 'session-1',
        });
        prisma.session.findUnique.mockResolvedValue({
            id: 'session-1',
            userId: activeUser.id,
            refreshTokenHash: await hashValue(oldToken),
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            user: activeUser,
        });
        prisma.session.updateMany.mockResolvedValue({ count: 0 });

        await expect(service.refresh(oldToken)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it.each(['SUSPENDED', 'DELETED'])(
        'blocks refresh for a %s user',
        async (status) => {
            const { service, prisma, jwtService } = createService();
            const token = 'refresh-token';
            jwtService.verifyAsync.mockResolvedValue({
                sub: activeUser.id,
                sid: 'session-1',
            });
            prisma.session.findUnique.mockResolvedValue({
                id: 'session-1',
                userId: activeUser.id,
                refreshTokenHash: await hashValue(token),
                revokedAt: null,
                expiresAt: new Date(Date.now() + 60_000),
                user: { ...activeUser, status },
            });

            await expect(service.refresh(token)).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
            expect(prisma.session.updateMany).not.toHaveBeenCalled();
        },
    );

    it('rejects refresh token whose subject does not own the session', async () => {
        const { service, prisma, jwtService } = createService();
        jwtService.verifyAsync.mockResolvedValue({
            sub: 'attacker',
            sid: 'session-1',
        });
        prisma.session.findUnique.mockResolvedValue({
            id: 'session-1',
            userId: activeUser.id,
            refreshTokenHash: await hashValue('refresh-token'),
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            user: activeUser,
        });

        await expect(service.refresh('refresh-token')).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('requires Google to assert verified email ownership before linking', async () => {
        const { service, prisma } = createService();

        await expect(
            service.findOrCreateGoogleUser({
                providerId: 'google-1',
                email: activeUser.email,
                fullName: 'User',
                avatarUrl: null,
                emailVerified: false,
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        expect(prisma.oAuthAccount.findUnique).not.toHaveBeenCalled();
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('creates a session for an existing linked Google account', async () => {
        const { service, prisma } = createService();
        prisma.oAuthAccount.findUnique.mockResolvedValue({
            user: { ...activeUser, fullName: 'User' },
        });
        prisma.session.create.mockResolvedValue({ id: 'session-1' });

        const result = await service.googleLogin({
            providerId: 'google-1',
            email: activeUser.email,
            fullName: 'User',
            avatarUrl: 'https://example.com/avatar.jpg',
            emailVerified: true,
        });

        expect(result.user.id).toBe(activeUser.id);
        expect(prisma.session.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ userId: activeUser.id }),
        });
    });

    it('creates a verified user with the Google avatar and provider account', async () => {
        const { service, prisma } = createService();
        const googleUser = {
            ...activeUser,
            fullName: 'Google User',
            avatarUrl: 'https://example.com/avatar.jpg',
            emailVerifiedAt: new Date(),
            passwordHash: null,
        };
        prisma.oAuthAccount.findUnique.mockResolvedValue(null);
        prisma.user.findUnique.mockResolvedValue(null);
        prisma.user.create.mockResolvedValue(googleUser);

        await expect(
            service.findOrCreateGoogleUser({
                providerId: 'google-1',
                email: activeUser.email,
                fullName: 'Google User',
                avatarUrl: googleUser.avatarUrl,
                emailVerified: true,
            }),
        ).resolves.toEqual(googleUser);

        expect(prisma.user.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                email: activeUser.email,
                avatarUrl: googleUser.avatarUrl,
                passwordHash: null,
                emailVerifiedAt: expect.any(Date),
            }),
        });
        expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                providerAccountId: 'google-1',
                userId: activeUser.id,
            }),
        });
    });

    it.each(['SUSPENDED', 'DELETED'])(
        'does not create a Google session for a %s account',
        async (status) => {
            const { service, prisma } = createService();
            prisma.oAuthAccount.findUnique.mockResolvedValue({
                user: { ...activeUser, status },
            });

            await expect(
                service.googleLogin({
                    providerId: 'google-1',
                    email: activeUser.email,
                    fullName: 'User',
                    avatarUrl: null,
                    emailVerified: true,
                }),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            expect(prisma.session.create).not.toHaveBeenCalled();
        },
    );

    it('revokes only the session identified by a valid refresh token on logout', async () => {
        const { service, prisma, jwtService } = createService();
        jwtService.verifyAsync.mockResolvedValue({
            sub: activeUser.id,
            sid: 'session-1',
        });
        prisma.session.updateMany.mockResolvedValue({ count: 1 });

        await service.logout('refresh-token');

        expect(prisma.session.updateMany).toHaveBeenCalledWith({
            where: {
                id: 'session-1',
                userId: activeUser.id,
                revokedAt: null,
            },
            data: { revokedAt: expect.any(Date) },
        });
    });

    it('handles a missing or invalid logout token without touching sessions', async () => {
        const { service, prisma, jwtService } = createService();
        jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

        await expect(service.logout()).resolves.toBeUndefined();
        await expect(service.logout('invalid-token')).resolves.toBeUndefined();
        expect(prisma.session.updateMany).not.toHaveBeenCalled();
    });
});

async function hashMatches(hash: unknown, value: string) {
    if (typeof hash !== 'string') return false;
    const { verifyHash } = await import('./utils/hash.util');
    return verifyHash(hash, value);
}
