import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';

import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';

describe('AuthService password recovery', () => {
    const user = { id: 'user-id', email: 'user@example.com' };

    let prisma: {
        user: { findFirst: jest.Mock; update: jest.Mock };
        passwordResetToken: {
            create: jest.Mock;
            findUnique: jest.Mock;
            updateMany: jest.Mock;
        };
        session: { updateMany: jest.Mock };
        $transaction: jest.Mock;
    };
    let mailService: { sendPasswordReset: jest.Mock };
    let service: AuthService;

    beforeEach(() => {
        prisma = {
            user: {
                findFirst: jest.fn(),
                update: jest.fn().mockResolvedValue(user),
            },
            passwordResetToken: {
                create: jest.fn().mockResolvedValue({ id: 'reset-id' }),
                findUnique: jest.fn(),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            session: {
                updateMany: jest.fn().mockResolvedValue({ count: 2 }),
            },
            $transaction: jest.fn(),
        };
        prisma.$transaction.mockImplementation(
            async (
                operation:
                    | Promise<unknown>[]
                    | ((tx: typeof prisma) => Promise<unknown>),
            ) => {
                if (typeof operation === 'function') {
                    return operation(prisma);
                }
                return Promise.all(operation);
            },
        );

        mailService = {
            sendPasswordReset: jest.fn().mockResolvedValue(undefined),
        };

        const configService = {
            getOrThrow: jest.fn((key: string) => {
                if (key === 'FRONTEND_URL') return 'http://localhost:3000/';
                return 'test';
            }),
        };

        service = new AuthService(
            prisma as unknown as PrismaService,
            {} as JwtService,
            configService as unknown as ConfigService,
            mailService as unknown as MailService,
        );
    });

    it('returns the same generic result without revealing a missing email', async () => {
        prisma.user.findFirst.mockResolvedValue(null);

        const result = await service.forgotPassword('missing@example.com');

        expect(result.message).toContain('Nếu email tồn tại');
        expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
        expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('stores only a SHA-256 token hash and emails the raw token', async () => {
        prisma.user.findFirst.mockResolvedValue(user);

        const result = await service.forgotPassword(' USER@example.com ');

        expect(result.message).toContain('Nếu email tồn tại');
        expect(prisma.user.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    email: 'user@example.com',
                    status: 'ACTIVE',
                    deletedAt: null,
                },
            }),
        );

        const createData =
            prisma.passwordResetToken.create.mock.calls[0][0].data;
        const resetUrl = mailService.sendPasswordReset.mock.calls[0][1];
        const rawToken = new URL(resetUrl).searchParams.get('token');

        expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
        expect(createData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(createData.tokenHash).not.toBe(rawToken);
        expect(createData.expiresAt.getTime()).toBeGreaterThan(
            Date.now() + 29 * 60 * 1000,
        );
        expect(createData.expiresAt.getTime()).toBeLessThanOrEqual(
            Date.now() + 30 * 60 * 1000,
        );
    });

    it('invalidates active reset links before creating a new one', async () => {
        prisma.user.findFirst.mockResolvedValue(user);

        await service.forgotPassword(user.email);

        expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
            where: {
                userId: user.id,
                usedAt: null,
                expiresAt: { gt: expect.any(Date) },
            },
            data: { usedAt: expect.any(Date) },
        });
    });

    it('validates an active reset token', async () => {
        prisma.passwordResetToken.findUnique.mockResolvedValue({
            usedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            user: { status: 'ACTIVE', deletedAt: null },
        });

        await expect(service.validateResetToken('raw-token')).resolves.toEqual({
            valid: true,
        });
    });

    it.each([
        [null, 'INVALID_RESET_TOKEN'],
        [
            { usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) },
            'RESET_TOKEN_USED',
        ],
        [
            { usedAt: null, expiresAt: new Date(Date.now() - 60_000) },
            'RESET_TOKEN_EXPIRED',
        ],
    ])('rejects an unavailable reset token', async (record, code) => {
        prisma.passwordResetToken.findUnique.mockResolvedValue(record);

        await expect(
            service.validateResetToken('raw-token'),
        ).rejects.toMatchObject({
            response: expect.objectContaining({ code }),
        });
    });

    it('updates the password, consumes tokens and revokes every active session', async () => {
        prisma.passwordResetToken.findUnique.mockResolvedValue({
            id: 'reset-id',
            userId: user.id,
            usedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            user: { status: 'ACTIVE', deletedAt: null },
        });

        const result = await service.resetPassword('raw-token', 'new-password');

        expect(result.message).toBe(
            'Mật khẩu của bạn đã được đặt lại thành công.',
        );
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: user.id },
            data: { passwordHash: expect.any(String) },
        });
        expect(prisma.session.updateMany).toHaveBeenCalledWith({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
        expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: expect.any(Date) },
        });
    });

    it('prevents reuse if another request consumed the token first', async () => {
        prisma.passwordResetToken.findUnique.mockResolvedValue({
            id: 'reset-id',
            userId: user.id,
            usedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
            user: { status: 'ACTIVE', deletedAt: null },
        });
        prisma.passwordResetToken.updateMany.mockResolvedValueOnce({
            count: 0,
        });

        await expect(
            service.resetPassword('raw-token', 'new-password'),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(prisma.session.updateMany).not.toHaveBeenCalled();
    });
});
