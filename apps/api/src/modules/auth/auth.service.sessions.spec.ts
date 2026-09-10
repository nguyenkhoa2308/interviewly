import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';

import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import { hashValue, verifyHash } from './utils/hash.util';

describe('AuthService password and sessions', () => {
    const createService = () => {
        const prisma = {
            user: {
                findFirst: jest.fn(),
                update: jest.fn().mockResolvedValue({}),
            },
            session: {
                findMany: jest.fn(),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
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

    it('changes password and revokes every session except the current one', async () => {
        const { service, prisma } = createService();
        prisma.user.findFirst.mockResolvedValue({
            passwordHash: await hashValue('Current@123'),
        });

        await service.changePassword('user-1', 'current-session', {
            currentPassword: 'Current@123',
            newPassword: 'NewPassword@456',
        });

        const operations = prisma.$transaction.mock.calls[0][0];
        expect(operations).toHaveLength(2);
        expect(prisma.session.updateMany).toHaveBeenCalledWith({
            where: {
                userId: 'user-1',
                id: { not: 'current-session' },
                revokedAt: null,
            },
            data: { revokedAt: expect.any(Date) },
        });
        const newHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
        await expect(verifyHash(newHash, 'NewPassword@456')).resolves.toBe(
            true,
        );
    });

    it('rejects a wrong current password', async () => {
        const { service, prisma } = createService();
        prisma.user.findFirst.mockResolvedValue({
            passwordHash: await hashValue('Current@123'),
        });

        await expect(
            service.changePassword('user-1', 'current-session', {
                currentPassword: 'Wrong@123',
                newPassword: 'NewPassword@456',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('marks only the authenticated session as current', async () => {
        const { service, prisma } = createService();
        prisma.session.findMany.mockResolvedValue([
            { id: 'current-session' },
            { id: 'other-session' },
        ]);

        await expect(
            service.getSessions('user-1', 'current-session'),
        ).resolves.toEqual([
            { id: 'current-session', isCurrent: true },
            { id: 'other-session', isCurrent: false },
        ]);
    });

    it('cannot revoke the current session through the other-device endpoint', async () => {
        const { service, prisma } = createService();
        await expect(
            service.revokeSession('user-1', 'session-1', 'session-1'),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.session.updateMany).not.toHaveBeenCalled();
    });

    it('scopes session revocation to its authenticated owner', async () => {
        const { service, prisma } = createService();
        await service.revokeSession('user-1', 'current-session', 'session-2');
        expect(prisma.session.updateMany).toHaveBeenCalledWith({
            where: { id: 'session-2', userId: 'user-1', revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
    });
});
