import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import {
    ExperienceLevel,
    InterviewGoal,
    Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
    const user = {
        fullName: 'Interviewly User',
        avatarUrl: null,
        onboardingCompletedAt: null,
        preference: {
            targetRole: 'Frontend Developer',
            experienceLevel: ExperienceLevel.JUNIOR,
            yearsOfExperience: new Prisma.Decimal('1.5'),
            interviewGoals: [InterviewGoal.GET_A_JOB],
            customInterviewGoal: null,
            learningStyle: null,
            contentPreferences: [],
            sessionLength: null,
            defaultDifficulty: null,
            feedbackDetail: null,
        },
    };

    const prismaMock = {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        userPreference: {
            upsert: jest.fn(),
        },
        $transaction: jest.fn(),
    };
    const service = new OnboardingService(
        prismaMock as unknown as PrismaService,
    );

    beforeEach(() => {
        jest.clearAllMocks();
        prismaMock.$transaction.mockImplementation(
            async (callback: (client: typeof prismaMock) => unknown) =>
                callback(prismaMock),
        );
    });

    it('returns yearsOfExperience as a number', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);

        await expect(service.getOnboarding('user-id')).resolves.toMatchObject({
            preferences: {
                yearsOfExperience: 1.5,
            },
        });
    });

    it('normalizes customInterviewGoal when OTHER is not selected', async () => {
        prismaMock.user.findUnique
            .mockResolvedValueOnce({ id: 'user-id' })
            .mockResolvedValueOnce({
                ...user,
                onboardingCompletedAt: new Date(),
            });

        await service.completeOnboarding('user-id', {
            interviewGoals: [InterviewGoal.IMPROVE_SKILLS],
            customInterviewGoal: 'must not be persisted',
        });

        expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                update: expect.objectContaining({
                    customInterviewGoal: null,
                }),
            }),
        );
    });

    it('does not overwrite preferences omitted from the DTO', async () => {
        prismaMock.user.findUnique
            .mockResolvedValueOnce({ id: 'user-id' })
            .mockResolvedValueOnce({
                ...user,
                onboardingCompletedAt: new Date(),
            });

        await service.completeOnboarding('user-id', {
            fullName: 'Updated User',
        });

        expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith({
            where: { userId: 'user-id' },
            create: { userId: 'user-id' },
            update: {},
        });
    });

    it('skips without writing user preferences', async () => {
        prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
        prismaMock.user.findUnique.mockResolvedValue({
            ...user,
            onboardingCompletedAt: new Date(),
        });

        await service.skipOnboarding('user-id');

        expect(prismaMock.userPreference.upsert).not.toHaveBeenCalled();
        expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
            where: { id: 'user-id' },
            data: { onboardingCompletedAt: expect.any(Date) },
        });
    });

    it('throws when the authenticated user no longer exists', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        await expect(service.getOnboarding('missing-user')).rejects.toThrow(
            NotFoundException,
        );
    });
});
