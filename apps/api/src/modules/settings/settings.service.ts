import { BadRequestException, Injectable } from '@nestjs/common';

import {
    InteractionMode,
    Language,
    Prisma,
    Theme,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const preferenceSelect = {
    preferredLanguage: true,
    defaultDifficulty: true,
    defaultInterviewType: true,
    interviewerStyle: true,
    learningStyle: true,
    contentPreferences: true,
    feedbackDetail: true,
} satisfies Prisma.UserPreferenceSelect;

const settingSelect = {
    theme: true,
    timezone: true,
    defaultDurationMinutes: true,
    defaultInteractionMode: true,
    voiceName: true,
    speechSpeed: true,
    volume: true,
    saveInterviewAudio: true,
} satisfies Prisma.UserSettingSelect;

@Injectable()
export class SettingsService {
    constructor(private readonly prisma: PrismaService) {}

    async getSettings(userId: string) {
        const [preference, setting] = await Promise.all([
            this.prisma.userPreference.findUnique({
                where: { userId },
                select: preferenceSelect,
            }),

            this.prisma.userSetting.findUnique({
                where: { userId },
                select: settingSelect,
            }),
        ]);

        return {
            general: {
                preferredLanguage: preference?.preferredLanguage ?? Language.VI,
                theme: setting?.theme ?? Theme.SYSTEM,
                timezone: setting?.timezone ?? null,
            },

            interviewPreferences: {
                defaultDifficulty: preference?.defaultDifficulty ?? null,
                defaultInterviewType: preference?.defaultInterviewType ?? null,
                interviewerStyle: preference?.interviewerStyle ?? null,

                // UserSetting.defaultDurationMinutes is now the single source of truth.
                defaultDurationMinutes: setting?.defaultDurationMinutes ?? 30,
            },

            learningAndFeedback: {
                learningStyle: preference?.learningStyle ?? null,
                contentPreferences: preference?.contentPreferences ?? [],
                feedbackDetail: preference?.feedbackDetail ?? null,
            },

            voiceAndAudio: {
                defaultInteractionMode:
                    setting?.defaultInteractionMode ?? InteractionMode.TEXT,
                voiceName: setting?.voiceName ?? null,

                // Prisma Decimal should not leak into the API contract.
                speechSpeed:
                    setting?.speechSpeed !== undefined
                        ? Number(setting.speechSpeed)
                        : 1,

                volume:
                    setting?.volume !== undefined ? Number(setting.volume) : 1,

                saveInterviewAudio: setting?.saveInterviewAudio ?? false,
            },
        };
    }

    async updateSettings(userId: string, dto: UpdateSettingsDto) {
        const {
            general,
            interviewPreferences,
            learningAndFeedback,
            voiceAndAudio,
        } = dto;

        if (general?.timezone !== undefined && general.timezone !== null) {
            this.assertValidTimezone(general.timezone);
        }

        const preferenceData = {
            ...(general?.preferredLanguage !== undefined && {
                preferredLanguage: general.preferredLanguage,
            }),
            ...(interviewPreferences?.defaultDifficulty !== undefined && {
                defaultDifficulty: interviewPreferences.defaultDifficulty,
            }),
            ...(interviewPreferences?.defaultInterviewType !== undefined && {
                defaultInterviewType: interviewPreferences.defaultInterviewType,
            }),
            ...(interviewPreferences?.interviewerStyle !== undefined && {
                interviewerStyle: interviewPreferences.interviewerStyle,
            }),
            ...(learningAndFeedback?.learningStyle !== undefined && {
                learningStyle: learningAndFeedback.learningStyle,
            }),
            ...(learningAndFeedback?.contentPreferences !== undefined && {
                contentPreferences: learningAndFeedback.contentPreferences,
            }),
            ...(learningAndFeedback?.feedbackDetail !== undefined && {
                feedbackDetail: learningAndFeedback.feedbackDetail,
            }),
        };
        const settingData = {
            ...(general?.theme !== undefined && { theme: general.theme }),
            ...(general?.timezone !== undefined && {
                timezone: general.timezone,
            }),
            ...(interviewPreferences?.defaultDurationMinutes !== undefined && {
                defaultDurationMinutes:
                    interviewPreferences.defaultDurationMinutes,
            }),
            ...(voiceAndAudio?.defaultInteractionMode !== undefined && {
                defaultInteractionMode: voiceAndAudio.defaultInteractionMode,
            }),
            ...(voiceAndAudio?.voiceName !== undefined && {
                voiceName: voiceAndAudio.voiceName,
            }),
            ...(voiceAndAudio?.speechSpeed !== undefined && {
                speechSpeed: voiceAndAudio.speechSpeed,
            }),
            ...(voiceAndAudio?.volume !== undefined && {
                volume: voiceAndAudio.volume,
            }),
            ...(voiceAndAudio?.saveInterviewAudio !== undefined && {
                saveInterviewAudio: voiceAndAudio.saveInterviewAudio,
            }),
        };

        if (
            Object.keys(preferenceData).length === 0 &&
            Object.keys(settingData).length === 0
        ) {
            return this.getSettings(userId);
        }

        await this.prisma.$transaction(async (transaction) => {
            if (Object.keys(preferenceData).length > 0) {
                await transaction.userPreference.upsert({
                    where: { userId },
                    create: { userId, ...preferenceData },
                    update: preferenceData,
                });
            }

            if (Object.keys(settingData).length > 0) {
                await transaction.userSetting.upsert({
                    where: { userId },
                    create: { userId, ...settingData },
                    update: settingData,
                });
            }
        });

        return this.getSettings(userId);
    }

    private assertValidTimezone(timezone: string) {
        try {
            new Intl.DateTimeFormat('vi-VN', { timeZone: timezone }).format();
        } catch {
            throw new BadRequestException({
                code: 'INVALID_TIMEZONE',
                message: 'Múi giờ không hợp lệ.',
            });
        }
    }
}
