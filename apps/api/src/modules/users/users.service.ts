import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { InterviewGoal, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const profileSelect = {
    id: true,
    fullName: true,
    email: true,
    avatarUrl: true,
    emailVerifiedAt: true,
    preference: {
        select: {
            targetRole: true,
            experienceLevel: true,
            yearsOfExperience: true,
            interviewGoals: true,
            customInterviewGoal: true,
        },
    },
} satisfies Prisma.UserSelect;

type ProfileUser = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: profileSelect,
        });

        if (!user) this.throwUserNotFound();

        return this.toProfile(user);
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        return this.prisma.$transaction(async (transaction) => {
            const existingUser = await transaction.user.findUnique({
                where: { id: userId },
                select: profileSelect,
            });

            if (!existingUser) this.throwUserNotFound();

            if (Object.values(dto).every((value) => value === undefined)) {
                return this.toProfile(existingUser);
            }

            const finalInterviewGoals =
                dto.interviewGoals ??
                existingUser.preference?.interviewGoals ??
                [];
            const hasOtherGoal = finalInterviewGoals.includes(
                InterviewGoal.OTHER,
            );
            const finalCustomInterviewGoal = hasOtherGoal
                ? dto.customInterviewGoal !== undefined
                    ? dto.customInterviewGoal?.trim() || null
                    : existingUser.preference?.customInterviewGoal?.trim() ||
                      null
                : null;

            if (hasOtherGoal && !finalCustomInterviewGoal) {
                throw new BadRequestException({
                    code: 'CUSTOM_INTERVIEW_GOAL_REQUIRED',
                    message: 'Vui lòng nhập mục tiêu phỏng vấn khác.',
                });
            }

            const userData = {
                ...(dto.fullName !== undefined && {
                    fullName: dto.fullName,
                }),
            };
            const shouldSyncCustomGoal =
                dto.interviewGoals !== undefined ||
                dto.customInterviewGoal !== undefined ||
                (existingUser.preference?.customInterviewGoal ?? null) !==
                    finalCustomInterviewGoal;
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
                    interviewGoals: finalInterviewGoals,
                }),
                ...(shouldSyncCustomGoal && {
                    customInterviewGoal: finalCustomInterviewGoal,
                }),
            };

            if (Object.keys(userData).length > 0) {
                await transaction.user.update({
                    where: { id: userId },
                    data: userData,
                });
            }

            if (Object.keys(preferenceData).length > 0) {
                await transaction.userPreference.upsert({
                    where: { userId },
                    create: { userId, ...preferenceData },
                    update: preferenceData,
                });
            }

            const updatedUser = await transaction.user.findUnique({
                where: { id: userId },
                select: profileSelect,
            });

            if (!updatedUser) this.throwUserNotFound();

            return this.toProfile(updatedUser);
        });
    }

    async updateAvatar(userId: string, avatarUrl: string | null) {
        const result = await this.prisma.user.updateMany({
            where: { id: userId },
            data: { avatarUrl },
        });

        if (result.count === 0) this.throwUserNotFound();

        return { avatarUrl };
    }

    private toProfile(user: ProfileUser) {
        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            emailVerifiedAt: user.emailVerifiedAt,
            targetRole: user.preference?.targetRole ?? null,
            experienceLevel: user.preference?.experienceLevel ?? null,
            yearsOfExperience:
                user.preference?.yearsOfExperience?.toNumber() ?? null,
            interviewGoals: user.preference?.interviewGoals ?? [],
            customInterviewGoal: user.preference?.customInterviewGoal ?? null,
        };
    }

    private throwUserNotFound(): never {
        throw new NotFoundException({
            code: 'USER_NOT_FOUND',
            message: 'Không tìm thấy người dùng.',
        });
    }
}
