import { z } from 'zod';

import {
    contentPreferences,
    difficulties,
    experienceLevels,
    feedbackDetails,
    interviewGoals,
    learningStyles,
} from '@/services/onboarding.service';

export const onboardingSchema = z
    .object({
        fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên').max(150),
        avatarUrl: z
            .string()
            .trim()
            .refine(
                (value) => value === '' || URL.canParse(value),
                'URL ảnh đại diện không hợp lệ',
            ),
        targetRole: z
            .string()
            .trim()
            .min(1, 'Vui lòng chọn hoặc nhập vị trí mục tiêu')
            .max(100),
        experienceLevel: z.enum(experienceLevels, {
            error: 'Vui lòng chọn cấp độ kinh nghiệm',
        }),
        yearsOfExperience: z.number().min(0).max(99.9).optional(),
        interviewGoals: z
            .array(z.enum(interviewGoals))
            .min(1, 'Vui lòng chọn ít nhất một mục tiêu'),
        customInterviewGoal: z.string().trim().max(255).optional(),
        learningStyle: z.enum(learningStyles, {
            error: 'Vui lòng chọn cách học phù hợp',
        }),
        contentPreferences: z
            .array(z.enum(contentPreferences))
            .min(1, 'Vui lòng chọn ít nhất một nội dung'),
        sessionLength: z
            .number()
            .int()
            .refine((value) => [15, 30, 45, 60].includes(value), {
                message: 'Thời lượng phải là 15, 30, 45 hoặc 60 phút',
            }),
        defaultDifficulty: z.enum(difficulties),
        feedbackDetail: z.enum(feedbackDetails),
    })
    .superRefine((data, context) => {
        if (
            data.interviewGoals.includes('OTHER') &&
            !data.customInterviewGoal?.trim()
        ) {
            context.addIssue({
                code: 'custom',
                path: ['customInterviewGoal'],
                message: 'Vui lòng mô tả mục tiêu khác',
            });
        }
    });

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
