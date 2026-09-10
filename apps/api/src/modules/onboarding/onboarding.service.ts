import { Injectable, NotFoundException } from '@nestjs/common';

import { InterviewGoal, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

const onboardingUserSelect = {
    fullName: true,
    avatarUrl: true,
    onboardingCompletedAt: true,
    preference: {
        select: {
            targetRole: true,
            experienceLevel: true,
            yearsOfExperience: true,
            interviewGoals: true,
            customInterviewGoal: true,
            learningStyle: true,
            contentPreferences: true,
            defaultDifficulty: true,
            feedbackDetail: true,
        },
    },
    settings: {
        select: {
            defaultDurationMinutes: true,
        },
    },
} satisfies Prisma.UserSelect;

type OnboardingUser = Prisma.UserGetPayload<{
    select: typeof onboardingUserSelect;
}>;

@Injectable()
export class OnboardingService {
    constructor(private readonly prisma: PrismaService) {}

    async getOnboarding(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: onboardingUserSelect,
        });

        if (!user) {
            this.throwUserNotFound();
        }

        return this.toResponse(user);
    }

    async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
        const completedAt = new Date();
        const userData = {
            ...(dto.fullName !== undefined && { fullName: dto.fullName }),
            ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
            onboardingCompletedAt: completedAt,
        };
        const preferenceData = {
            ...(dto.targetRole !== undefined && {
                targetRole: dto.targetRole,
            }),
            ...(dto.experienceLevel !== undefined && {
                experienceLevel: dto.experienceLevel,
            }),
            ...(dto.yearsOfExperience !== undefined && {
                yearsOfExperience: dto.yearsOfExperience,
            }),
            ...(dto.interviewGoals !== undefined && {
                interviewGoals: dto.interviewGoals,
                customInterviewGoal: dto.interviewGoals.includes(
                    InterviewGoal.OTHER,
                )
                    ? dto.customInterviewGoal?.trim()
                    : null,
            }),
            ...(dto.learningStyle !== undefined && {
                learningStyle: dto.learningStyle,
            }),
            ...(dto.contentPreferences !== undefined && {
                contentPreferences: dto.contentPreferences,
            }),
            ...(dto.defaultDifficulty !== undefined && {
                defaultDifficulty: dto.defaultDifficulty,
            }),
            ...(dto.feedbackDetail !== undefined && {
                feedbackDetail: dto.feedbackDetail,
            }),
        };

        return this.prisma.$transaction(async (transaction) => {
            const existingUser = await transaction.user.findUnique({
                where: { id: userId },
                select: { id: true },
            });

            if (!existingUser) {
                this.throwUserNotFound();
            }

            await transaction.user.update({
                where: { id: userId },
                data: userData,
            });

            await transaction.userPreference.upsert({
                where: { userId },
                create: {
                    userId,
                    ...preferenceData,
                },
                update: preferenceData,
            });

            if (dto.sessionLength !== undefined) {
                await transaction.userSetting.upsert({
                    where: { userId },
                    create: {
                        userId,
                        defaultDurationMinutes: dto.sessionLength,
                    },
                    update: {
                        defaultDurationMinutes: dto.sessionLength,
                    },
                });
            }

            const user = await transaction.user.findUnique({
                where: { id: userId },
                select: onboardingUserSelect,
            });

            if (!user) {
                this.throwUserNotFound();
            }

            return this.toResponse(user);
        });
    }

    async skipOnboarding(userId: string) {
        const result = await this.prisma.user.updateMany({
            where: { id: userId },
            data: { onboardingCompletedAt: new Date() },
        });

        if (result.count === 0) {
            this.throwUserNotFound();
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: onboardingUserSelect,
        });

        if (!user) {
            this.throwUserNotFound();
        }

        return this.toResponse(user);
    }

    private toResponse(user: OnboardingUser) {
        return {
            onboardingCompletedAt: user.onboardingCompletedAt,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            preferences: user.preference
                ? {
                      ...user.preference,
                      sessionLength:
                          user.settings?.defaultDurationMinutes ?? 30,
                      yearsOfExperience:
                          user.preference.yearsOfExperience?.toNumber() ?? null,
                  }
                : null,
        };
    }

    private throwUserNotFound(): never {
        throw new NotFoundException({
            code: 'USER_NOT_FOUND',
            message: 'Không tìm thấy người dùng.',
        });
    }
}
