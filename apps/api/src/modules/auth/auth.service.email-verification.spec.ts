import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';

import { hashOtp } from '../../common/utils/otp.util';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';

describe('AuthService email verification security', () => {
    const user = {
        id: 'user-1',
        email: 'user@example.com',
        status: 'ACTIVE',
        deletedAt: null,
        emailVerifiedAt: null,
    };

    function createService() {
        const prisma = {
            user: { findUnique: jest.fn(), update: jest.fn() },
            session: { create: jest.fn() },
            emailVerification: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
            },
            $transaction: jest.fn(),
        };
        prisma.$transaction.mockImplementation(
            async (operation: (tx: typeof prisma) => Promise<unknown>) =>
                operation(prisma),
        );

        const mailService = {
            sendVerificationOtp: jest.fn().mockResolvedValue(undefined),
        };
        const service = new AuthService(
            prisma as unknown as PrismaService,
            { signAsync: jest.fn() } as unknown as JwtService,
            { getOrThrow: jest.fn() } as unknown as ConfigService,
            mailService as unknown as MailService,
        );

        return { service, prisma, mailService };
    }

    it('consumes a valid OTP once and verifies the email without creating a session', async () => {
        const { service, prisma } = createService();
        const otp = '123456';
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.emailVerification.findFirst.mockResolvedValue({
            id: 'verification-1',
            codeHash: await hashOtp(otp),
            attempts: 0,
            usedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
        });
        prisma.emailVerification.updateMany.mockResolvedValue({ count: 1 });

        await expect(
            service.verifyEmail(' USER@example.com ', otp),
        ).resolves.toEqual({ message: 'Xác minh email thành công.' });

        expect(prisma.emailVerification.updateMany).toHaveBeenCalledWith({
            where: expect.objectContaining({
                id: 'verification-1',
                usedAt: null,
                attempts: { lt: 5 },
            }),
            data: { usedAt: expect.any(Date) },
        });
        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: user.id },
            data: { emailVerifiedAt: expect.any(Date) },
        });
        expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('counts an invalid OTP attempt without verifying the user', async () => {
        const { service, prisma } = createService();
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.emailVerification.findFirst.mockResolvedValue({
            id: 'verification-1',
            codeHash: await hashOtp('123456'),
            attempts: 0,
            usedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
        });
        prisma.emailVerification.update.mockResolvedValue({ attempts: 1 });

        await expect(
            service.verifyEmail(user.email, '654321'),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(prisma.emailVerification.update).toHaveBeenCalledWith({
            where: { id: 'verification-1' },
            data: { attempts: { increment: 1 } },
        });
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects expired and already-consumed OTPs', async () => {
        const { service, prisma } = createService();
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.emailVerification.findFirst
            .mockResolvedValueOnce({
                id: 'expired',
                codeHash: await hashOtp('123456'),
                attempts: 0,
                usedAt: null,
                expiresAt: new Date(Date.now() - 1),
            })
            .mockResolvedValueOnce(null);

        await expect(
            service.verifyEmail(user.email, '123456'),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
            service.verifyEmail(user.email, '123456'),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a race when another request consumes the OTP first', async () => {
        const { service, prisma } = createService();
        const otp = '123456';
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.emailVerification.findFirst.mockResolvedValue({
            id: 'verification-1',
            codeHash: await hashOtp(otp),
            attempts: 0,
            usedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
        });
        prisma.emailVerification.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            service.verifyEmail(user.email, otp),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('invalidates old OTPs before sending a fresh hashed code', async () => {
        const { service, prisma, mailService } = createService();
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.emailVerification.findFirst.mockResolvedValue({
            createdAt: new Date(Date.now() - 61_000),
        });
        prisma.emailVerification.updateMany.mockResolvedValue({ count: 1 });
        prisma.emailVerification.create.mockResolvedValue({ id: 'new-code' });

        await service.resendVerification(user.email);

        expect(prisma.emailVerification.updateMany).toHaveBeenCalledWith({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: expect.any(Date) },
        });
        const createData = prisma.emailVerification.create.mock.calls[0][0]
            .data as { codeHash: string };
        expect(createData.codeHash).not.toMatch(/^\d{6}$/);
        expect(mailService.sendVerificationOtp).toHaveBeenCalledWith(
            user.email,
            expect.stringMatching(/^\d{6}$/),
        );
    });
});
