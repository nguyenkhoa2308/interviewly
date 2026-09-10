import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';

import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import { hashValue } from './utils/hash.util';

describe('AuthService deleteAccount', () => {
    const createService = (user: unknown) => {
        const prisma = {
            user: {
                findUnique: jest
                    .fn<() => Promise<unknown>>()
                    .mockResolvedValue(user),
                update: jest.fn().mockResolvedValue({}),
            },
            session: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
            $transaction: jest.fn().mockResolvedValue([]),
        };
        const service = new AuthService(
            prisma as unknown as PrismaService,
            {} as JwtService,
            {} as ConfigService,
            {} as MailService,
        );
        return { service, prisma };
    };

    it('soft-deletes the authenticated user and revokes every active session', async () => {
        const passwordHash = await hashValue('Current@123');
        const { service, prisma } = createService({
            passwordHash,
            status: 'ACTIVE',
        });

        await expect(
            service.deleteAccount('user-1', {
                confirmation: 'DELETE',
                currentPassword: 'Current@123',
            }),
        ).resolves.toEqual({ message: 'Tài khoản của bạn đã được xóa.' });

        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { status: 'DELETED', deletedAt: expect.any(Date) },
        });
        expect(prisma.session.updateMany).toHaveBeenCalledWith({
            where: { userId: 'user-1', revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects an incorrect current password without deleting', async () => {
        const passwordHash = await hashValue('Current@123');
        const { service, prisma } = createService({
            passwordHash,
            status: 'ACTIVE',
        });

        await expect(
            service.deleteAccount('user-1', {
                confirmation: 'DELETE',
                currentPassword: 'Wrong@123',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects Google-only deletion until safe reauthentication exists', async () => {
        const { service, prisma } = createService({
            passwordHash: null,
            status: 'ACTIVE',
        });

        await expect(
            service.deleteAccount('user-2', {
                confirmation: 'DELETE',
                currentPassword: 'unused',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });
});
