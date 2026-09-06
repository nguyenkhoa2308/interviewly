import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { InterviewGoal } from '../../../generated/prisma/client';
import { CompleteOnboardingDto } from './complete-onboarding.dto';

describe('CompleteOnboardingDto', () => {
    it('requires customInterviewGoal when OTHER is selected', async () => {
        const dto = plainToInstance(CompleteOnboardingDto, {
            interviewGoals: [InterviewGoal.GET_A_JOB, InterviewGoal.OTHER],
            customInterviewGoal: '   ',
        });

        const errors = await validate(dto);

        expect(
            errors.some((error) => error.property === 'customInterviewGoal'),
        ).toBe(true);
    });

    it('allows customInterviewGoal to be omitted without OTHER', async () => {
        const dto = plainToInstance(CompleteOnboardingDto, {
            interviewGoals: [InterviewGoal.IMPROVE_SKILLS],
        });

        const errors = await validate(dto);

        expect(
            errors.some((error) => error.property === 'customInterviewGoal'),
        ).toBe(false);
    });

    it('trims customInterviewGoal', () => {
        const dto = plainToInstance(CompleteOnboardingDto, {
            interviewGoals: [InterviewGoal.OTHER],
            customInterviewGoal: '  Luyện phỏng vấn bằng tiếng Anh  ',
        });

        expect(dto.customInterviewGoal).toBe('Luyện phỏng vấn bằng tiếng Anh');
    });

    it('returns Vietnamese validation messages', async () => {
        const dto = plainToInstance(CompleteOnboardingDto, {
            avatarUrl: 'khong-phai-url',
        });

        const errors = await validate(dto);
        const avatarError = errors.find(
            (error) => error.property === 'avatarUrl',
        );

        expect(Object.values(avatarError?.constraints ?? {})).toContain(
            'URL ảnh đại diện không hợp lệ.',
        );
    });
});
