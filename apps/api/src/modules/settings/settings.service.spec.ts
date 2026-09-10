import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';

import {
    ContentPreference,
    Difficulty,
    FeedbackDetail,
    InteractionMode,
    InterviewerStyle,
    InterviewType,
    Language,
    LearningStyle,
    Theme,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
    let service: SettingsService;

    const prismaMock = {
        userPreference: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },

        userSetting: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        prismaMock.$transaction.mockImplementation(
            async (callback: (client: typeof prismaMock) => unknown) =>
                callback(prismaMock),
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SettingsService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();

        service = module.get<SettingsService>(SettingsService);
    });

    it('should return complete settings when preference and setting exist', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue({
            preferredLanguage: Language.EN,

            defaultDifficulty: Difficulty.MEDIUM,
            defaultInterviewType: InterviewType.TECHNICAL,
            interviewerStyle: InterviewerStyle.PROFESSIONAL,

            learningStyle: LearningStyle.LEARN_BY_DOING,
            contentPreferences: [
                ContentPreference.DATA_STRUCTURES_ALGORITHMS,
                ContentPreference.CODING_CHALLENGES,
            ],
            feedbackDetail: FeedbackDetail.DETAILED,
        });

        prismaMock.userSetting.findUnique.mockResolvedValue({
            theme: Theme.DARK,
            timezone: 'Asia/Ho_Chi_Minh',

            defaultDurationMinutes: 45,

            defaultInteractionMode: InteractionMode.VOICE,
            voiceName: 'default',
            speechSpeed: 1.25,
            volume: 0.8,
            saveInterviewAudio: true,
        });

        const result = await service.getSettings('user-1');

        expect(result).toEqual({
            general: {
                preferredLanguage: Language.EN,
                theme: Theme.DARK,
                timezone: 'Asia/Ho_Chi_Minh',
            },

            interviewPreferences: {
                defaultDifficulty: Difficulty.MEDIUM,
                defaultInterviewType: InterviewType.TECHNICAL,
                interviewerStyle: InterviewerStyle.PROFESSIONAL,
                defaultDurationMinutes: 45,
            },

            learningAndFeedback: {
                learningStyle: LearningStyle.LEARN_BY_DOING,
                contentPreferences: [
                    ContentPreference.DATA_STRUCTURES_ALGORITHMS,
                    ContentPreference.CODING_CHALLENGES,
                ],
                feedbackDetail: FeedbackDetail.DETAILED,
            },

            voiceAndAudio: {
                defaultInteractionMode: InteractionMode.VOICE,
                voiceName: 'default',
                speechSpeed: 1.25,
                volume: 0.8,
                saveInterviewAudio: true,
            },
        });
    });

    it('should return preference defaults when UserPreference does not exist', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);

        prismaMock.userSetting.findUnique.mockResolvedValue({
            theme: Theme.LIGHT,
            timezone: 'Asia/Ho_Chi_Minh',
            defaultDurationMinutes: 30,
            defaultInteractionMode: InteractionMode.TEXT,
            voiceName: null,
            speechSpeed: 1,
            volume: 1,
            saveInterviewAudio: false,
        });

        const result = await service.getSettings('user-1');

        expect(result.general.preferredLanguage).toBe(Language.VI);

        expect(result.interviewPreferences.defaultDifficulty).toBeNull();
        expect(result.interviewPreferences.defaultInterviewType).toBeNull();
        expect(result.interviewPreferences.interviewerStyle).toBeNull();

        expect(result.learningAndFeedback.learningStyle).toBeNull();
        expect(result.learningAndFeedback.contentPreferences).toEqual([]);
        expect(result.learningAndFeedback.feedbackDetail).toBeNull();
    });

    it('should return UserSetting defaults when UserSetting does not exist', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue({
            preferredLanguage: Language.EN,
            defaultDifficulty: Difficulty.HARD,
            defaultInterviewType: InterviewType.CODING,
            interviewerStyle: InterviewerStyle.STRICT,
            learningStyle: LearningStyle.MIXED,
            contentPreferences: [],
            feedbackDetail: FeedbackDetail.STANDARD,
        });

        prismaMock.userSetting.findUnique.mockResolvedValue(null);

        const result = await service.getSettings('user-1');

        expect(result.general.theme).toBe(Theme.SYSTEM);
        expect(result.general.timezone).toBeNull();

        expect(result.interviewPreferences.defaultDurationMinutes).toBe(30);

        expect(result.voiceAndAudio).toEqual({
            defaultInteractionMode: InteractionMode.TEXT,
            voiceName: null,
            speechSpeed: 1,
            volume: 1,
            saveInterviewAudio: false,
        });
    });

    it('should return complete defaults when neither record exists', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);
        prismaMock.userSetting.findUnique.mockResolvedValue(null);

        const result = await service.getSettings('user-1');

        expect(result).toEqual({
            general: {
                preferredLanguage: Language.VI,
                theme: Theme.SYSTEM,
                timezone: null,
            },

            interviewPreferences: {
                defaultDifficulty: null,
                defaultInterviewType: null,
                interviewerStyle: null,
                defaultDurationMinutes: 30,
            },

            learningAndFeedback: {
                learningStyle: null,
                contentPreferences: [],
                feedbackDetail: null,
            },

            voiceAndAudio: {
                defaultInteractionMode: InteractionMode.TEXT,
                voiceName: null,
                speechSpeed: 1,
                volume: 1,
                saveInterviewAudio: false,
            },
        });
        expect(prismaMock.userPreference.upsert).not.toHaveBeenCalled();
        expect(prismaMock.userSetting.upsert).not.toHaveBeenCalled();
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should convert Prisma Decimal-like values to numbers', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);

        prismaMock.userSetting.findUnique.mockResolvedValue({
            theme: Theme.SYSTEM,
            timezone: null,
            defaultDurationMinutes: 30,
            defaultInteractionMode: InteractionMode.TEXT,
            voiceName: null,

            speechSpeed: {
                toString: () => '1.50',
            },

            volume: {
                toString: () => '0.75',
            },

            saveInterviewAudio: false,
        });

        const result = await service.getSettings('user-1');

        expect(result.voiceAndAudio.speechSpeed).toBe(1.5);
        expect(result.voiceAndAudio.volume).toBe(0.75);

        expect(typeof result.voiceAndAudio.speechSpeed).toBe('number');
        expect(typeof result.voiceAndAudio.volume).toBe('number');
    });

    it('should query settings using the authenticated user id', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);
        prismaMock.userSetting.findUnique.mockResolvedValue(null);

        await service.getSettings('user-123');

        expect(prismaMock.userPreference.findUnique).toHaveBeenCalledWith({
            where: { userId: 'user-123' },
            select: expect.any(Object),
        });

        expect(prismaMock.userSetting.findUnique).toHaveBeenCalledWith({
            where: { userId: 'user-123' },
            select: expect.any(Object),
        });
    });

    it('should update preference and setting records in one transaction', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);
        prismaMock.userSetting.findUnique.mockResolvedValue(null);

        await service.updateSettings('user-1', {
            general: {
                preferredLanguage: Language.EN,
                timezone: 'Asia/Ho_Chi_Minh',
            },
            interviewPreferences: { defaultDurationMinutes: 45 },
        });

        expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            create: { userId: 'user-1', preferredLanguage: Language.EN },
            update: { preferredLanguage: Language.EN },
        });
        expect(prismaMock.userSetting.upsert).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            create: {
                userId: 'user-1',
                timezone: 'Asia/Ho_Chi_Minh',
                defaultDurationMinutes: 45,
            },
            update: {
                timezone: 'Asia/Ho_Chi_Minh',
                defaultDurationMinutes: 45,
            },
        });
    });

    it('should reject an invalid IANA timezone before writing', async () => {
        await expect(
            service.updateSettings('user-1', {
                general: { timezone: 'Not/A_Timezone' },
            }),
        ).rejects.toThrow(BadRequestException);

        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it.each(['Asia/Ho_Chi_Minh', 'America/New_York', 'Europe/London'])(
        'should accept valid IANA timezone %s',
        async (timezone) => {
            prismaMock.userPreference.findUnique.mockResolvedValue(null);
            prismaMock.userSetting.findUnique.mockResolvedValue(null);

            await service.updateSettings('user-1', { general: { timezone } });

            expect(prismaMock.userSetting.upsert).toHaveBeenCalledWith({
                where: { userId: 'user-1' },
                create: { userId: 'user-1', timezone },
                update: { timezone },
            });
        },
    );

    it.each(['Hanoi', 'GMT+7_RANDOM', 'abc', 'Asia/DoesNotExist'])(
        'should reject invalid timezone %s',
        async (timezone) => {
            await expect(
                service.updateSettings('user-1', { general: { timezone } }),
            ).rejects.toThrow(BadRequestException);

            expect(prismaMock.$transaction).not.toHaveBeenCalled();
        },
    );

    it('should patch multiple sections without writing omitted fields', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);
        prismaMock.userSetting.findUnique.mockResolvedValue(null);

        await service.updateSettings('user-1', {
            general: { theme: Theme.DARK },
            interviewPreferences: { defaultDurationMinutes: 45 },
            learningAndFeedback: { feedbackDetail: FeedbackDetail.DETAILED },
            voiceAndAudio: {
                defaultInteractionMode: InteractionMode.VOICE,
                speechSpeed: 1.2,
                volume: 0.5,
                saveInterviewAudio: true,
            },
        });

        expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            create: {
                userId: 'user-1',
                feedbackDetail: FeedbackDetail.DETAILED,
            },
            update: { feedbackDetail: FeedbackDetail.DETAILED },
        });
        expect(prismaMock.userSetting.upsert).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            create: {
                userId: 'user-1',
                theme: Theme.DARK,
                defaultDurationMinutes: 45,
                defaultInteractionMode: InteractionMode.VOICE,
                speechSpeed: 1.2,
                volume: 0.5,
                saveInterviewAudio: true,
            },
            update: {
                theme: Theme.DARK,
                defaultDurationMinutes: 45,
                defaultInteractionMode: InteractionMode.VOICE,
                speechSpeed: 1.2,
                volume: 0.5,
                saveInterviewAudio: true,
            },
        });
    });

    it('should keep all nested interview fields omitted from a partial patch', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);
        prismaMock.userSetting.findUnique.mockResolvedValue(null);

        await service.updateSettings('user-1', {
            interviewPreferences: { defaultDifficulty: Difficulty.HARD },
        });

        expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            create: {
                userId: 'user-1',
                defaultDifficulty: Difficulty.HARD,
            },
            update: { defaultDifficulty: Difficulty.HARD },
        });
        expect(prismaMock.userSetting.upsert).not.toHaveBeenCalled();
    });

    it('should persist each unique content preference exactly once', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);
        prismaMock.userSetting.findUnique.mockResolvedValue(null);
        const contentPreferences = [
            ContentPreference.SYSTEM_DESIGN,
            ContentPreference.CODING_CHALLENGES,
        ];

        await service.updateSettings('user-1', {
            learningAndFeedback: { contentPreferences },
        });

        expect(prismaMock.userPreference.upsert).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            create: { userId: 'user-1', contentPreferences },
            update: { contentPreferences },
        });
    });

    it('should update only the field that was sent', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);
        prismaMock.userSetting.findUnique.mockResolvedValue(null);

        await service.updateSettings('authenticated-user', {
            general: { theme: Theme.DARK },
        });

        expect(prismaMock.userPreference.upsert).not.toHaveBeenCalled();
        expect(prismaMock.userSetting.upsert).toHaveBeenCalledWith({
            where: { userId: 'authenticated-user' },
            create: { userId: 'authenticated-user', theme: Theme.DARK },
            update: { theme: Theme.DARK },
        });
    });

    it('should preserve an explicit nullable value', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);
        prismaMock.userSetting.findUnique.mockResolvedValue(null);

        await service.updateSettings('user-1', {
            general: { timezone: null },
            voiceAndAudio: { voiceName: null },
        });

        expect(prismaMock.userSetting.upsert).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            create: { userId: 'user-1', timezone: null, voiceName: null },
            update: { timezone: null, voiceName: null },
        });
    });

    it('should handle an empty patch without creating records', async () => {
        prismaMock.userPreference.findUnique.mockResolvedValue(null);
        prismaMock.userSetting.findUnique.mockResolvedValue(null);

        await service.updateSettings('user-1', {});

        expect(prismaMock.$transaction).not.toHaveBeenCalled();
        expect(prismaMock.userPreference.upsert).not.toHaveBeenCalled();
        expect(prismaMock.userSetting.upsert).not.toHaveBeenCalled();
    });
});
