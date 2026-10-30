import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import {
    InterviewEvaluationStatus,
    InterviewStatus,
} from '../../../generated/prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { InterviewEvaluationScoringService } from './interview-evaluation-scoring.service';
import {
    EVALUATION_MAX_ATTEMPTS,
    InterviewEvaluationService,
} from './interview-evaluation.service';
import type { InterviewEvaluatorService } from './interview-evaluator.service';

const interviewId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const sessionId = '33333333-3333-4333-8333-333333333333';

function evaluation(overrides: Record<string, unknown> = {}) {
    return {
        id: '44444444-4444-4444-8444-444444444444',
        interviewId,
        sessionId,
        status: InterviewEvaluationStatus.PENDING,
        reportData: null,
        errorCode: null,
        attemptCount: 0,
        completedAt: null,
        updatedAt: new Date(),
        ...overrides,
    };
}

function completedInterview(evaluationValue: unknown = null) {
    return {
        id: interviewId,
        userId,
        status: InterviewStatus.COMPLETED,
        targetRole: 'Frontend Developer',
        targetLevel: 'JUNIOR',
        interviewType: 'TECHNICAL',
        sourceContextSnapshot: {},
        evaluation: evaluationValue,
        plans: [{ version: 1, planData: {} }],
        session: { id: sessionId, completedAt: new Date(), turns: [] },
    };
}

function createHarness() {
    const prisma = {
        interview: {
            findFirst: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
        },
        interviewEvaluation: {
            upsert: jest.fn(),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            findFirst: jest.fn().mockResolvedValue(null),
            findUnique: jest.fn(),
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
    };
    const evaluator = { evaluate: jest.fn() };
    const scoring = { calculate: jest.fn() };
    const service = new InterviewEvaluationService(
        prisma as unknown as PrismaService,
        evaluator as unknown as InterviewEvaluatorService,
        scoring as unknown as InterviewEvaluationScoringService,
    );
    return { service, prisma, evaluator };
}

describe('InterviewEvaluationService lifecycle', () => {
    it('enforces ownership while reading a report', async () => {
        const { service, prisma } = createHarness();
        prisma.interview.findFirst.mockResolvedValue(null);
        await expect(service.get(userId, interviewId)).rejects.toBeInstanceOf(
            NotFoundException,
        );
        expect(prisma.interview.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: interviewId, userId },
            }),
        );
    });

    it('hydrates persisted answer reviews with authoritative turn section metadata', async () => {
        const { service, prisma } = createHarness();
        const completed = completedInterview(
            evaluation({
                status: InterviewEvaluationStatus.COMPLETED,
                reportData: {
                    answerReviews: [
                        {
                            turnId: '55555555-5555-4555-8555-555555555555',
                            competencyKey: 'PROJECT_EXPERIENCE',
                        },
                    ],
                },
            }),
        );
        completed.session.turns = [
            {
                id: '55555555-5555-4555-8555-555555555555',
                sectionIndex: 0,
                sectionTitle: 'Mở đầu',
                questionType: 'GENERAL',
                topic: 'Giới thiệu bản thân',
            },
        ];
        prisma.interview.findFirst.mockResolvedValue(completed);

        await expect(service.get(userId, interviewId)).resolves.toMatchObject({
            report: {
                answerReviews: [
                    {
                        competencyKey: 'PROJECT_EXPERIENCE',
                        sectionIndex: 0,
                        sectionTitle: 'Mở đầu',
                        questionType: 'GENERAL',
                        topic: 'Giới thiệu bản thân',
                    },
                ],
            },
        });
    });

    it('hides internal evidence IDs and removes overlapping umbrella competencies', async () => {
        const { service, prisma } = createHarness();
        const turnId = '55555555-5555-4555-8555-555555555555';
        const completed = completedInterview(
            evaluation({
                status: InterviewEvaluationStatus.COMPLETED,
                reportData: {
                    demonstratedStrengths: [
                        `Giải thích đúng dependency array (turnId: ${turnId}).`,
                    ],
                    competencies: [
                        {
                            competencyKey: 'javascript_typescript',
                            name: 'JavaScript & TypeScript',
                        },
                        {
                            competencyKey: 'js_ts_core',
                            name: 'JavaScript và TypeScript Core',
                        },
                    ],
                    unassessedAreas: [
                        {
                            competencyKey: 'js_ts_core',
                            name: 'JavaScript và TypeScript Core',
                            reason: 'Đã được đánh giá ở nhóm chi tiết.',
                        },
                    ],
                    answerReviews: [
                        {
                            turnId,
                            competencyKey: 'javascript_typescript',
                        },
                    ],
                },
            }),
        );
        completed.session.turns = [
            {
                id: turnId,
                sectionIndex: 1,
                sectionTitle: 'Kỹ thuật',
                questionType: 'TECHNICAL',
                topic: 'TypeScript',
                questionText: 'interface và type khác nhau thế nào?',
                answerText: 'Câu trả lời',
            },
        ];
        prisma.interview.findFirst.mockResolvedValue(completed);

        const response = await service.get(userId, interviewId);

        expect(response.report).toMatchObject({
            demonstratedStrengths: ['Giải thích đúng dependency array.'],
            competencies: [{ competencyKey: 'javascript_typescript' }],
            unassessedAreas: [],
        });
    });
    it('persists PENDING and returns without waiting for the AI provider', async () => {
        const { service, prisma, evaluator } = createHarness();
        const pending = evaluation();
        prisma.interview.findFirst
            .mockResolvedValueOnce(completedInterview(null))
            .mockResolvedValueOnce(completedInterview(pending));
        prisma.interviewEvaluation.upsert.mockResolvedValue(pending);

        await expect(
            service.trigger(userId, interviewId),
        ).resolves.toMatchObject({
            status: 'PENDING',
            attemptCount: 0,
        });
        expect(evaluator.evaluate).not.toHaveBeenCalled();
        expect(prisma.interviewEvaluation.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { interviewId },
                create: expect.objectContaining({
                    sessionId,
                    status: InterviewEvaluationStatus.PENDING,
                }),
            }),
        );
    });

    it('automatically enqueues completed interviews missing an evaluation', async () => {
        const { service, prisma } = createHarness();
        prisma.interview.findMany.mockResolvedValue([
            { id: interviewId, session: { id: sessionId } },
        ]);

        await service.sweep();

        expect(prisma.interviewEvaluation.createMany).toHaveBeenCalledWith({
            data: [
                {
                    interviewId,
                    sessionId,
                    status: InterviewEvaluationStatus.PENDING,
                },
            ],
            skipDuplicates: true,
        });
    });

    it('rejects manual retries after the bounded retry limit', async () => {
        const { service, prisma } = createHarness();
        const failed = evaluation({
            status: InterviewEvaluationStatus.FAILED,
            attemptCount: EVALUATION_MAX_ATTEMPTS,
        });
        prisma.interview.findFirst.mockResolvedValue(
            completedInterview(failed),
        );
        prisma.interviewEvaluation.upsert.mockResolvedValue(failed);

        await expect(
            service.trigger(userId, interviewId, true),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('reopens the manual retry budget after a schema-validation failure', async () => {
        const { service, prisma } = createHarness();
        const failed = evaluation({
            status: InterviewEvaluationStatus.FAILED,
            attemptCount: EVALUATION_MAX_ATTEMPTS,
            errorCode: 'AI_SCHEMA_VALIDATION_FAILED',
        });
        const pending = evaluation({
            status: InterviewEvaluationStatus.PENDING,
        });
        prisma.interview.findFirst
            .mockResolvedValueOnce(completedInterview(failed))
            .mockResolvedValueOnce(completedInterview(pending));
        prisma.interviewEvaluation.upsert.mockResolvedValue(failed);

        await expect(
            service.trigger(userId, interviewId, true),
        ).resolves.toMatchObject({ status: InterviewEvaluationStatus.PENDING });
        expect(prisma.interviewEvaluation.updateMany).toHaveBeenCalledWith({
            where: {
                id: failed.id,
                status: InterviewEvaluationStatus.FAILED,
            },
            data: {
                status: InterviewEvaluationStatus.PENDING,
                errorCode: null,
                errorMessage: null,
                processingAt: null,
                attemptCount: 0,
            },
        });
    });
    it.each(['AI_PROVIDER_ERROR', 'AI_TIMEOUT'])(
        'reopens the manual retry budget after transient error %s',
        async (errorCode) => {
            const { service, prisma } = createHarness();
            const failed = evaluation({
                status: InterviewEvaluationStatus.FAILED,
                attemptCount: EVALUATION_MAX_ATTEMPTS,
                errorCode,
            });
            const pending = evaluation({
                status: InterviewEvaluationStatus.PENDING,
            });
            prisma.interview.findFirst
                .mockResolvedValueOnce(completedInterview(failed))
                .mockResolvedValueOnce(completedInterview(pending));
            prisma.interviewEvaluation.upsert.mockResolvedValue(failed);

            await expect(
                service.trigger(userId, interviewId, true),
            ).resolves.toMatchObject({
                status: InterviewEvaluationStatus.PENDING,
            });
            expect(prisma.interviewEvaluation.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ attemptCount: 0 }),
                }),
            );
        },
    );
    it('queues a fresh evaluation while preserving the completed report', async () => {
        const { service, prisma } = createHarness();
        const completed = evaluation({
            status: InterviewEvaluationStatus.COMPLETED,
            reportData: { overallScore: 7.5 },
            attemptCount: 2,
        });
        const pending = evaluation({
            status: InterviewEvaluationStatus.PENDING,
            reportData: completed.reportData,
            attemptCount: 0,
        });
        prisma.interview.findFirst
            .mockResolvedValueOnce(completedInterview(completed))
            .mockResolvedValueOnce(completedInterview(pending));
        prisma.interviewEvaluation.updateMany.mockResolvedValueOnce({
            count: 1,
        });

        await expect(
            service.reanalyze(userId, interviewId),
        ).resolves.toMatchObject({
            status: InterviewEvaluationStatus.PENDING,
            report: { overallScore: 7.5 },
            attemptCount: 0,
        });
        expect(prisma.interviewEvaluation.updateMany).toHaveBeenCalledWith({
            where: {
                id: completed.id,
                status: {
                    in: [
                        InterviewEvaluationStatus.COMPLETED,
                        InterviewEvaluationStatus.FAILED,
                    ],
                },
            },
            data: {
                status: InterviewEvaluationStatus.PENDING,
                errorCode: null,
                errorMessage: null,
                processingAt: null,
                attemptCount: 0,
            },
        });
    });

    it('does not queue duplicate re-analysis jobs', async () => {
        const { service, prisma } = createHarness();
        const processing = evaluation({
            status: InterviewEvaluationStatus.PROCESSING,
            reportData: { overallScore: 7.5 },
        });
        prisma.interview.findFirst.mockResolvedValue(
            completedInterview(processing),
        );
        prisma.interviewEvaluation.updateMany.mockResolvedValueOnce({
            count: 0,
        });

        await expect(
            service.reanalyze(userId, interviewId),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not enqueue an unfinished interview', async () => {
        const { service, prisma } = createHarness();
        prisma.interview.findFirst.mockResolvedValue({
            ...completedInterview(null),
            status: InterviewStatus.IN_PROGRESS,
        });

        await expect(
            service.trigger(userId, interviewId),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.interviewEvaluation.upsert).not.toHaveBeenCalled();
    });
});
