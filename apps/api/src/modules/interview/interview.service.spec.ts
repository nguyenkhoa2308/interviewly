import { jest } from '@jest/globals';
import { AiException } from '../ai/ai.errors';
import {
    Difficulty,
    InterviewPlanStatus,
    InterviewType,
} from '../../generated/prisma/client';
import { InterviewService } from './interview.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { InterviewContextService } from './interview-context.service';
import type { InterviewPlannerService } from './planning/interview-planner.service';
import type { ConfigService } from '@nestjs/config';

describe('InterviewService plan lifecycle', () => {
    const make = () => {
        const prisma = {
            cV: { findMany: jest.fn() },
            jobDescription: { findMany: jest.fn() },
            cVJDMatch: { findMany: jest.fn() },
            userPreference: { findUnique: jest.fn() },
            userSetting: { findUnique: jest.fn() },
            interview: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
                deleteMany: jest.fn(),
                update: jest.fn(),
            },
            interviewPlan: {
                findFirst: jest.fn(),
                aggregate: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
            },
            $transaction: jest.fn(),
        } as unknown as PrismaService;
        const planner = {
            generate: jest.fn(),
        } as unknown as InterviewPlannerService;
        const context = {
            build: jest.fn(),
        } as unknown as InterviewContextService;
        const config = {
            get: jest.fn(() => 'test'),
            getOrThrow: jest.fn(() => 'secret'),
        } as unknown as ConfigService;
        return {
            prisma,
            planner,
            context,
            service: new InterviewService(prisma, context, planner, config),
        };
    };
    it('lists only interviews owned by the authenticated user', async () => {
        const { prisma, service } = make();
        (prisma.$transaction as jest.Mock).mockResolvedValue([
            [{ id: 'interview-1' }],
            1,
        ]);

        const result = await service.list('user-a', { page: 1, limit: 9 });

        expect(prisma.interview.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-a' }),
            }),
        );
        expect(prisma.interview.count).toHaveBeenCalledWith({
            where: { userId: 'user-a' },
        });
        expect(result.pagination).toEqual({
            page: 1,
            limit: 9,
            total: 1,
            totalPages: 1,
        });
    });
    it('deletes only an interview owned by the authenticated user', async () => {
        const { prisma, service } = make();
        (prisma.interview.deleteMany as jest.Mock).mockResolvedValue({
            count: 1,
        });

        await expect(service.remove('user-a', 'interview-1')).resolves.toEqual({
            id: 'interview-1',
        });
        expect(prisma.interview.deleteMany).toHaveBeenCalledWith({
            where: { id: 'interview-1', userId: 'user-a' },
        });
    });
    it('does not reveal an interview owned by another user when deleting', async () => {
        const { prisma, service } = make();
        (prisma.interview.deleteMany as jest.Mock).mockResolvedValue({
            count: 0,
        });

        await expect(
            service.remove('user-a', 'interview-of-user-b'),
        ).rejects.toMatchObject({
            response: { code: 'INTERVIEW_NOT_FOUND' },
        });
    });
    it('bulk deletes only interviews owned by the authenticated user', async () => {
        const { prisma, service } = make();
        (prisma.interview.deleteMany as jest.Mock).mockResolvedValue({
            count: 2,
        });

        await expect(
            service.removeMany('user-a', ['interview-1', 'interview-2']),
        ).resolves.toEqual({ deletedCount: 2 });
        expect(prisma.interview.deleteMany).toHaveBeenCalledWith({
            where: {
                id: { in: ['interview-1', 'interview-2'] },
                userId: 'user-a',
            },
        });
    });
    it('returns persisted defaults and scopes every option query to the user', async () => {
        const { prisma, service } = make();
        (prisma.cV.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.jobDescription.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.cVJDMatch.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.userPreference.findUnique as jest.Mock).mockResolvedValue({
            targetRole: 'Backend Developer',
            experienceLevel: 'MIDDLE',
            defaultInterviewType: InterviewType.FULL,
            defaultDifficulty: Difficulty.HARD,
        });
        (prisma.userSetting.findUnique as jest.Mock).mockResolvedValue({
            defaultDurationMinutes: 45,
        });

        const result = await service.options('user-a');

        expect(result.defaults).toEqual({
            targetRole: 'Backend Developer',
            targetLevel: 'MIDDLE',
            interviewType: InterviewType.FULL,
            difficulty: Difficulty.HARD,
            durationMinutes: 45,
        });
        expect(prisma.cV.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-a' }),
            }),
        );
        expect(prisma.jobDescription.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-a' }),
            }),
        );
        expect(prisma.cVJDMatch.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-a' }),
            }),
        );
        expect(prisma.userPreference.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-a' }),
            }),
        );
        expect(prisma.userSetting.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-a' }),
            }),
        );
    });
    it('returns canonical interview defaults when preference rows do not exist', async () => {
        const { prisma, service } = make();
        (prisma.cV.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.jobDescription.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.cVJDMatch.findMany as jest.Mock).mockResolvedValue([]);
        (prisma.userPreference.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.userSetting.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await service.options('user-a');

        expect(result.defaults).toEqual({
            targetRole: null,
            targetLevel: null,
            interviewType: InterviewType.TECHNICAL,
            difficulty: Difficulty.ADAPTIVE,
            durationMinutes: 30,
        });
    });
    it('maps preview AI failures to a safe HTTP response', async () => {
        const { context, planner, service } = make();
        (context.build as jest.Mock).mockResolvedValue({
            snapshot: {
                configuration: {
                    interviewType: 'TECHNICAL',
                    durationMinutes: 30,
                    questionCount: 8,
                },
            },
        });
        (planner.generate as jest.Mock).mockRejectedValue(
            new AiException('AI_RATE_LIMITED'),
        );
        await expect(
            service.preview('user', {
                cvId: '00000000-0000-4000-8000-000000000001',
                jobDescriptionId: '00000000-0000-4000-8000-000000000002',
                interviewType: 'TECHNICAL',
                difficulty: 'ADAPTIVE',
                durationMinutes: 30,
                questionCount: 8,
                focusAreas: [],
                targetRole: 'Frontend Developer',
            }),
        ).rejects.toMatchObject({
            status: 429,
            response: { code: 'AI_RATE_LIMITED' },
        });
    });
    it('loads only the latest successful plan for interview detail', async () => {
        const { prisma, service } = make();
        (prisma.interview.findFirst as jest.Mock).mockResolvedValue({
            id: 'interview',
            plans: [{ id: 'plan-2' }],
        });
        await service.get('user', 'interview');
        expect(prisma.interview.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'interview', userId: 'user' },
                select: expect.objectContaining({
                    plans: expect.objectContaining({
                        where: { status: InterviewPlanStatus.COMPLETED },
                        orderBy: { version: 'desc' },
                        take: 1,
                    }),
                }),
            }),
        );
    });
    it('marks only the new attempt failed and preserves previous success', async () => {
        const { prisma, planner, service } = make();
        (prisma.interview.findFirst as jest.Mock)
            .mockResolvedValueOnce({ id: 'interview' })
            .mockResolvedValueOnce({
                sourceContextSnapshot: {
                    configuration: {
                        interviewType: 'TECHNICAL',
                        durationMinutes: 30,
                        questionCount: 8,
                    },
                },
                plans: [{ planData: { sections: [] } }],
            });
        (prisma.interviewPlan.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.interviewPlan.aggregate as jest.Mock).mockResolvedValue({
            _max: { version: 2 },
        });
        (prisma.interviewPlan.create as jest.Mock).mockResolvedValue({
            id: 'plan-3',
        });
        (planner.generate as jest.Mock).mockRejectedValue(
            new AiException('AI_PROVIDER_ERROR'),
        );
        (prisma.interviewPlan.update as jest.Mock).mockResolvedValue({
            id: 'plan-3',
        });
        await expect(
            service.regenerate('user', 'interview'),
        ).rejects.toMatchObject({ status: 502 });
        expect(prisma.interviewPlan.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    version: 3,
                    status: InterviewPlanStatus.PROCESSING,
                }),
            }),
        );
        expect(prisma.interviewPlan.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'plan-3' },
                data: expect.objectContaining({
                    status: InterviewPlanStatus.FAILED,
                }),
            }),
        );
        expect(prisma.interview.update).not.toHaveBeenCalled();
    });
});
