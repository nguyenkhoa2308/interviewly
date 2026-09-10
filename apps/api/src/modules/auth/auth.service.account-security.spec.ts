import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';

import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';

describe('AuthService account security metadata', () => {
    type FindUniqueMock = jest.Mock<
        (args: Record<string, unknown>) => Promise<unknown>
    >;

    const mockFindUnique = (result: unknown): FindUniqueMock =>
        jest
            .fn<(args: Record<string, unknown>) => Promise<unknown>>()
            .mockResolvedValue(result);

    const createService = (findUnique: FindUniqueMock) =>
        new AuthService(
            {
                user: { findUnique },
            } as unknown as PrismaService,
            {} as JwtService,
            {} as ConfigService,
            {} as MailService,
        );

    it('returns safe password and connected-provider metadata', async () => {
        const findUnique = mockFindUnique({
            id: 'user-1',
            email: 'khoa@example.com',
            fullName: 'Nguyễn Đức Khoa',
            avatarUrl: null,
            emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
            onboardingCompletedAt: null,
            role: 'USER',
            status: 'ACTIVE',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            passwordHash: 'private-password-hash',
            oauthAccounts: [{ provider: 'GOOGLE' }],
        });
        const service = createService(findUnique);

        const result = await service.getMe('user-1');

        expect(result).toMatchObject({
            id: 'user-1',
            hasPassword: true,
            connectedProviders: ['GOOGLE'],
        });
        expect(result).not.toHaveProperty('passwordHash');
        expect(result).not.toHaveProperty('oauthAccounts');
        expect(JSON.stringify(result)).not.toContain('private-password-hash');
        expect(findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'user-1' } }),
        );
    });

    it('identifies a Google-only account without exposing OAuth identifiers', async () => {
        const service = createService(
            mockFindUnique({
                id: 'user-2',
                email: 'google@example.com',
                fullName: 'Google User',
                avatarUrl: null,
                emailVerifiedAt: new Date(),
                onboardingCompletedAt: null,
                role: 'USER',
                status: 'ACTIVE',
                createdAt: new Date(),
                passwordHash: null,
                oauthAccounts: [{ provider: 'GOOGLE' }],
            }),
        );

        await expect(service.getMe('user-2')).resolves.toMatchObject({
            hasPassword: false,
            connectedProviders: ['GOOGLE'],
        });
    });

    it('rejects a missing authenticated user', async () => {
        const service = createService(mockFindUnique(null));

        await expect(service.getMe('missing-user')).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });
});
