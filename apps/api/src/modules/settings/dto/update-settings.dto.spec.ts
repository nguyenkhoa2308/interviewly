import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateSettingsDto } from './update-settings.dto';

describe('UpdateSettingsDto', () => {
    const validatePayload = (payload: object) =>
        validate(plainToInstance(UpdateSettingsDto, payload), {
            whitelist: true,
            forbidNonWhitelisted: true,
        });

    it('accepts a partial nested update', async () => {
        await expect(
            validatePayload({ general: { theme: 'DARK' } }),
        ).resolves.toHaveLength(0);
    });

    it.each([
        { general: { preferredLanguage: 'VI' } },
        { general: { preferredLanguage: 'EN' } },
        { general: { theme: 'LIGHT' } },
        { general: { theme: 'DARK' } },
        { general: { theme: 'SYSTEM' } },
        { interviewPreferences: { defaultDifficulty: 'EASY' } },
        { interviewPreferences: { defaultDifficulty: 'MEDIUM' } },
        { interviewPreferences: { defaultDifficulty: 'HARD' } },
        { interviewPreferences: { defaultDifficulty: 'ADAPTIVE' } },
        { interviewPreferences: { defaultInterviewType: 'HR' } },
        { interviewPreferences: { defaultInterviewType: 'BEHAVIORAL' } },
        { interviewPreferences: { defaultInterviewType: 'TECHNICAL' } },
        { interviewPreferences: { defaultInterviewType: 'CODING' } },
        { interviewPreferences: { defaultInterviewType: 'SYSTEM_DESIGN' } },
        { interviewPreferences: { defaultInterviewType: 'FULL' } },
        { interviewPreferences: { interviewerStyle: 'FRIENDLY' } },
        { interviewPreferences: { interviewerStyle: 'PROFESSIONAL' } },
        { interviewPreferences: { interviewerStyle: 'STRICT' } },
        { learningAndFeedback: { learningStyle: 'LEARN_BY_DOING' } },
        { learningAndFeedback: { learningStyle: 'LEARN_BY_READING' } },
        { learningAndFeedback: { learningStyle: 'LEARN_BY_WATCHING' } },
        { learningAndFeedback: { learningStyle: 'MIXED' } },
        { learningAndFeedback: { feedbackDetail: 'CONCISE' } },
        { learningAndFeedback: { feedbackDetail: 'STANDARD' } },
        { learningAndFeedback: { feedbackDetail: 'DETAILED' } },
        { voiceAndAudio: { defaultInteractionMode: 'TEXT' } },
        { voiceAndAudio: { defaultInteractionMode: 'VOICE' } },
    ])('accepts valid enum payload %#', async (payload) => {
        await expect(validatePayload(payload)).resolves.toHaveLength(0);
    });

    it.each([
        { general: { preferredLanguage: 'JP' } },
        { general: { theme: 'BLUE' } },
        { interviewPreferences: { defaultDifficulty: 'EXTREME' } },
        { interviewPreferences: { interviewerStyle: 'BALANCED' } },
        { learningAndFeedback: { learningStyle: 'VIDEO' } },
        { learningAndFeedback: { feedbackDetail: 'VERBOSE' } },
        { voiceAndAudio: { defaultInteractionMode: 'HYBRID' } },
    ])('rejects invalid enum payload %#', async (payload) => {
        expect((await validatePayload(payload)).length).toBeGreaterThan(0);
    });

    it.each([15, 30, 45, 60])('accepts duration %s', async (duration) => {
        await expect(
            validatePayload({
                interviewPreferences: { defaultDurationMinutes: duration },
            }),
        ).resolves.toHaveLength(0);
    });

    it.each([0, -1, 20, 90, '30'])('rejects duration %s', async (duration) => {
        expect(
            (
                await validatePayload({
                    interviewPreferences: {
                        defaultDurationMinutes: duration,
                    },
                })
            ).length,
        ).toBeGreaterThan(0);
    });

    it.each([0.5, 1, 1.2, 2])(
        'accepts speech speed %s',
        async (speechSpeed) => {
            await expect(
                validatePayload({ voiceAndAudio: { speechSpeed } }),
            ).resolves.toHaveLength(0);
        },
    );

    it.each([0.49, 2.01, -1, '1', Number.NaN])(
        'rejects speech speed %s',
        async (speechSpeed) => {
            expect(
                (await validatePayload({ voiceAndAudio: { speechSpeed } }))
                    .length,
            ).toBeGreaterThan(0);
        },
    );

    it.each([0, 0.5, 1])('accepts volume %s', async (volume) => {
        await expect(
            validatePayload({ voiceAndAudio: { volume } }),
        ).resolves.toHaveLength(0);
    });

    it.each([-0.1, 1.1, 50, '100%'])('rejects volume %s', async (volume) => {
        expect(
            (await validatePayload({ voiceAndAudio: { volume } })).length,
        ).toBeGreaterThan(0);
    });

    it('distinguishes omitted and explicitly reset nullable fields', async () => {
        await expect(
            validatePayload({ voiceAndAudio: {} }),
        ).resolves.toHaveLength(0);
        await expect(
            validatePayload({ voiceAndAudio: { voiceName: null } }),
        ).resolves.toHaveLength(0);
        await expect(
            validatePayload({ voiceAndAudio: { voiceName: 'a'.repeat(100) } }),
        ).resolves.toHaveLength(0);
    });

    it.each([
        { contentPreferences: [] },
        { contentPreferences: ['SYSTEM_DESIGN'] },
        {
            contentPreferences: [
                'DATA_STRUCTURES_ALGORITHMS',
                'SYSTEM_DESIGN',
                'FRONTEND_FRAMEWORKS',
                'BEHAVIORAL_QUESTIONS',
                'CODING_CHALLENGES',
                'RESUME_PORTFOLIO',
            ],
        },
    ])(
        'accepts valid content preferences %#',
        async ({ contentPreferences }) => {
            await expect(
                validatePayload({
                    learningAndFeedback: { contentPreferences },
                }),
            ).resolves.toHaveLength(0);
        },
    );

    it.each([
        ['invalid enum', { general: { theme: 'BLUE' } }],
        [
            'invalid duration',
            { interviewPreferences: { defaultDurationMinutes: 20 } },
        ],
        ['speech speed below minimum', { voiceAndAudio: { speechSpeed: 0.4 } }],
        ['speech speed above maximum', { voiceAndAudio: { speechSpeed: 2.1 } }],
        ['invalid volume', { voiceAndAudio: { volume: 1.1 } }],
        [
            'voice name longer than 100 characters',
            { voiceAndAudio: { voiceName: 'a'.repeat(101) } },
        ],
        [
            'invalid content preference',
            { learningAndFeedback: { contentPreferences: ['UNKNOWN'] } },
        ],
        [
            'duplicate content preference',
            {
                learningAndFeedback: {
                    contentPreferences: [
                        'CODING_CHALLENGES',
                        'CODING_CHALLENGES',
                    ],
                },
            },
        ],
    ])('rejects %s', async (_caseName, payload) => {
        const errors = await validatePayload(payload);
        expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects unknown fields, including a client supplied userId', async () => {
        const errors = await validatePayload({
            userId: 'another-user',
            general: { theme: 'DARK' },
        });

        expect(errors.length).toBeGreaterThan(0);
    });
});
