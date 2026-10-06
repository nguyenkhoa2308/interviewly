import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import {
    InterviewAdaptiveStatus,
    InterviewPlannedQuestionStatus,
    InterviewStatus,
    InterviewTurnOrigin,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdaptiveInterviewerService } from './adaptive/adaptive-interviewer.service';
import { InterviewRuntimeService } from './interview-runtime.service';

const userId = '11111111-1111-4111-8111-111111111111';
const interviewId = '22222222-2222-4222-8222-222222222222';
const planId = '33333333-3333-4333-8333-333333333333';
const sessionId = '44444444-4444-4444-8444-444444444444';
const turnId = '55555555-5555-4555-8555-555555555555';

const planData = {
    summary: 'Kế hoạch',
    openingStrategy: 'Mở đầu',
    difficultyStrategy: 'Tăng dần',
    roleBaseline: [
        {
            key: 'communication',
            name: 'Giao tiếp',
            description: 'Giao tiếp rõ ràng.',
            expectedDepth: 'REAL_EXPERIENCE',
            rationale: 'Nền tảng chung.',
        },
        {
            key: 'role-foundations',
            name: 'Nền tảng vai trò',
            description: 'Nền tảng theo vai trò.',
            expectedDepth: 'APPLICATION',
            rationale: 'Kỳ vọng theo level.',
        },
    ],
    competencyMap: [
        {
            key: 'communication',
            name: 'Giao tiếp',
            sources: ['ROLE_BASELINE', 'JD'],
            priority: 'HIGH',
            expectedDepth: 'REAL_EXPERIENCE',
            evidenceNeeded: ['Giao tiếp rõ.'],
            probeAreas: [],
            rationale: 'Cần thiết.',
        },
        {
            key: 'role-foundations',
            name: 'React fundamentals',
            sources: ['ROLE_BASELINE', 'JD', 'CV'],
            priority: 'KEY',
            expectedDepth: 'APPLICATION',
            evidenceNeeded: ['Hiểu React.'],
            probeAreas: ['render'],
            rationale: 'Năng lực chính.',
        },
        {
            key: 'project-ownership',
            name: 'Đóng góp dự án',
            sources: ['CV'],
            priority: 'KEY',
            expectedDepth: 'REAL_EXPERIENCE',
            evidenceNeeded: ['Đóng góp cá nhân.'],
            probeAreas: [],
            rationale: 'Xác minh CV.',
        },
    ],
    sections: [
        'INTRODUCTION',
        'TECHNICAL',
        'PROJECT_EXPERIENCE',
        'BEHAVIORAL_WORKING_STYLE',
    ].map((type, index) => ({
        type,
        title: `Phần ${index + 1}`,
        objective: 'Đánh giá',
        durationMinutes: 5,
        questions: [
            {
                order: index + 1,
                type:
                    index === 1
                        ? 'TECHNICAL'
                        : index === 2
                          ? 'PROJECT'
                          : index === 3
                            ? 'BEHAVIORAL'
                            : 'GENERAL',
                topic: index === 1 ? 'React' : 'Tổng quan',
                competencyKey:
                    index === 1
                        ? 'role-foundations'
                        : index === 2
                          ? 'project-ownership'
                          : 'communication',
                suggestedQuestion: `Câu hỏi ${index + 1}`,
                objective: 'Tìm hiểu',
                difficulty: 'MEDIUM',
                reasonToAsk: null,
                sourceEvidence: [],
                expectedSignals: [],
                followUpStrategy: {
                    ifShallow: 'Hỏi cụ thể',
                    ifStrong: 'Hỏi sâu hơn',
                    maxDepth: 2,
                },
            },
        ],
    })),
    strengthsToValidate: [],
    gapsToProbe: [],
    projectAreasToExplore: [],
    behavioralCompetencies: [],
    technicalCompetencies: [],
    adaptationGuidance: [],
};

const currentTurn = {
    id: turnId,
    ordinal: 1,
    runtimeOrder: 100,
    plannedQuestionKey: 'planned:1',
    rootPlannedQuestionKey: 'planned:1',
    sectionIndex: 0,
    sectionTitle: 'Kỹ thuật',
    questionType: 'TECHNICAL',
    topic: 'React',
    competencyKey: 'role-foundations',
    difficulty: 'MEDIUM',
    questionText: 'React render lại khi nào?',
    answerText: null,
    answerAssessment: null,
    origin: InterviewTurnOrigin.PLANNED_MAIN,
    adaptiveAction: null,
    assistanceLevel: 'NONE',
    depth: 0,
    answeredAt: null,
    plannedStatus: InterviewPlannedQuestionStatus.ASKED,
    probeType: 'MAIN_TARGET_LEVEL',
    questionLevel: 'JUNIOR',
    scoringImpact: 'TARGET_LEVEL',
};
const nextTurn = {
    ...currentTurn,
    id: '66666666-6666-4666-8666-666666666666',
    ordinal: 2,
    runtimeOrder: 200,
    plannedQuestionKey: 'planned:2',
    rootPlannedQuestionKey: 'planned:2',
    questionText: 'Câu tiếp theo',
    plannedStatus: InterviewPlannedQuestionStatus.PENDING,
};

function ownedWithTurns(turns = [currentTurn, nextTurn]) {
    return {
        id: interviewId,
        status: InterviewStatus.IN_PROGRESS,
        interviewType: 'FULL',
        targetRole: 'Frontend Developer',
        targetLevel: 'JUNIOR',
        durationMinutes: 30,
        sourceContextSnapshot: {
            candidateProfile: { preferredLanguage: 'VI' },
            jd: { analysis: { requiredSkills: ['React'] } },
        },
        session: {
            id: sessionId,
            startedAt: new Date(),
            completedAt: null,
            plan: { planData },
            turns,
        },
    };
}

function stateInterview(
    status = InterviewStatus.IN_PROGRESS,
    turns = [currentTurn, nextTurn],
) {
    return {
        id: interviewId,
        status,
        interviewType: 'FULL',
        targetRole: 'Frontend Developer',
        targetLevel: 'JUNIOR',
        durationMinutes: 30,
        session: {
            id: sessionId,
            startedAt: new Date(),
            completedAt:
                status === InterviewStatus.COMPLETED ? new Date() : null,
            plan: { id: planId, version: 1 },
            turns: turns.map((turn) => ({
                ...turn,
                adaptiveStatus: InterviewAdaptiveStatus.IDLE,
            })),
        },
    };
}

const adaptiveOutput = (
    decision: string,
    nextQuestion: string | null,
    understanding = 'STRONG',
) => ({
    result: {
        assessment: {
            understanding,
            relevance: 'RELEVANT',
            confidence: 'HIGH',
            evidenceSummary: 'Relevant evidence was provided.',
            evidenceGained: [],
            missingEvidence: [],
        },
        decision,
        reason: 'More evidence may be useful.',
        primaryIntent: nextQuestion ? 'Kiểm tra một mục tiêu chính' : null,
        nextQuestion,
        coveredPlannedQuestionKeys: [],
        selectedPlannedQuestionKey:
            decision === 'NEXT' || decision === 'CHANGE_TOPIC'
                ? 'planned:2'
                : null,
        probeType:
            decision === 'INCREASE_DEPTH'
                ? 'STRETCH_PROBE'
                : 'SAME_LEVEL_PROBE',
        questionLevel: decision === 'INCREASE_DEPTH' ? 'MIDDLE' : 'JUNIOR',
        scoringImpact:
            decision === 'INCREASE_DEPTH' ? 'BONUS_ONLY' : 'TARGET_LEVEL',
        topicSaturated: false,
        assistanceLevel: decision === 'REPHRASE' ? 'REPHRASE' : 'NONE',
    },
    metadata: {
        modelProvider: 'TEST',
        modelName: 'test-model',
        promptVersion: 'adaptive-interview-v5',
    },
});

describe('InterviewRuntimeService adaptive runtime', () => {
    let prisma: Record<string, any>;
    let adaptive: { evaluate: jest.Mock };
    let service: InterviewRuntimeService;

    beforeEach(() => {
        prisma = {
            interview: { findFirst: jest.fn(), updateMany: jest.fn() },
            interviewSession: {
                create: jest.fn(),
                findFirst: jest.fn(),
                updateMany: jest.fn(),
            },
            interviewTurn: {
                findMany: jest.fn().mockResolvedValue([]),
                findFirst: jest.fn(),
                create: jest.fn(),
                createMany: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
                count: jest.fn(),
            },
        };
        prisma.$transaction = jest.fn(async (value: unknown) =>
            typeof value === 'function'
                ? (value as (tx: unknown) => unknown)(prisma)
                : Promise.all(value as Promise<unknown>[]),
        );
        adaptive = { evaluate: jest.fn() };
        service = new InterviewRuntimeService(
            prisma as unknown as PrismaService,
            adaptive as unknown as AdaptiveInterviewerService,
        );
    });

    it('enforces ownership when loading runtime state', async () => {
        prisma.interview.findFirst.mockResolvedValue(null);
        await expect(
            service.getState(userId, interviewId),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('starts with a frozen plan and snapshots planned runtime order', async () => {
        prisma.interview.findFirst
            .mockResolvedValueOnce({
                id: interviewId,
                status: InterviewStatus.READY,
                session: null,
                plans: [{ id: planId, planData }],
            })
            .mockResolvedValueOnce(stateInterview());
        prisma.interview.updateMany.mockResolvedValue({ count: 1 });
        prisma.interviewSession.create.mockResolvedValue({ id: sessionId });
        prisma.interviewTurn.createMany.mockResolvedValue({ count: 4 });
        await service.start(userId, interviewId);
        const rows = prisma.interviewTurn.createMany.mock.calls[0][0].data;
        expect(
            rows.map((row: { runtimeOrder: number }) => row.runtimeOrder),
        ).toEqual([100, 200, 300, 400]);
        expect(rows[0]).toMatchObject({
            rootPlannedQuestionKey: 'planned:1',
            origin: 'PLANNED_MAIN',
        });
    });

    async function arrangeSubmit(
        output: unknown,
        rootAdaptiveCount = 0,
        remainingAfter = 1,
        remainingPlanned = 1,
    ) {
        prisma.interview.findFirst
            .mockResolvedValueOnce(ownedWithTurns())
            .mockResolvedValueOnce(stateInterview());
        prisma.interviewTurn.updateMany.mockResolvedValue({ count: 1 });
        prisma.interviewTurn.findFirst.mockResolvedValue(currentTurn);
        prisma.interviewTurn.findMany
            .mockResolvedValueOnce(
                Array.from({ length: remainingPlanned }, (_, index) => ({
                    ...nextTurn,
                    id: `${nextTurn.id}-${index}`,
                    plannedQuestionKey: `planned:${index + 2}`,
                })),
            )
            .mockResolvedValueOnce([]);
        prisma.interviewTurn.count
            .mockResolvedValueOnce(rootAdaptiveCount)
            .mockResolvedValueOnce(remainingAfter);
        prisma.interviewTurn.create.mockResolvedValue({ id: 'adaptive-turn' });
        prisma.interviewTurn.update.mockResolvedValue({ id: turnId });
        adaptive.evaluate.mockResolvedValue(output);
    }

    it('creates a deeper follow-up after a strong answer', async () => {
        await arrangeSubmit(
            adaptiveOutput(
                'INCREASE_DEPTH',
                'Đi sâu hơn: bạn đo hiệu năng render bằng cách nào?',
            ),
        );
        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'Tôi dùng profiler và memo hóa có chọn lọc.',
        );
        expect(prisma.interviewTurn.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                parentTurnId: turnId,
                origin: 'ADAPTIVE',
                adaptiveAction: 'INCREASE_DEPTH',
                runtimeOrder: 101,
            }),
        });
    });

    it('persists a rephrased recovery question for a weak answer', async () => {
        await arrangeSubmit(
            adaptiveOutput(
                'REPHRASE',
                'Mình hỏi cụ thể hơn: khi state đổi thì component có render lại không?',
                'WEAK',
            ),
        );
        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'Em chưa rõ câu hỏi.',
        );
        expect(prisma.interviewTurn.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                adaptiveAction: 'REPHRASE',
                assistanceLevel: 'REPHRASE',
            }),
        });
    });

    it('protects breadth by overriding follow-up when the root limit is reached', async () => {
        await arrangeSubmit(adaptiveOutput('FOLLOW_UP', 'Một câu hỏi nữa?'), 2);
        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'Câu trả lời tốt',
        );
        expect(prisma.interviewTurn.create).not.toHaveBeenCalled();
    });

    it('allows a KEY topic more evidence than a low-priority topic', async () => {
        await arrangeSubmit(
            adaptiveOutput('FOLLOW_UP', 'Another React probe?'),
            1,
        );
        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'React evidence',
        );
        expect(prisma.interviewTurn.create).toHaveBeenCalledTimes(1);
    });

    it('limits a low-priority topic to one adaptive turn', async () => {
        await arrangeSubmit(
            adaptiveOutput('FOLLOW_UP', 'Another peripheral probe?'),
            1,
        );
        prisma.interviewTurn.findFirst.mockResolvedValue({
            ...currentTurn,
            topic: 'Peripheral topic',
        });
        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'Some evidence',
        );
        expect(prisma.interviewTurn.create).not.toHaveBeenCalled();
    });

    it('passes the current section budget separately from total interview time', async () => {
        await arrangeSubmit(
            adaptiveOutput('FOLLOW_UP', 'Bạn có thể nói rõ hơn không?'),
        );
        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'Một câu trả lời ngắn.',
        );
        expect(adaptive.evaluate).toHaveBeenCalledWith(
            expect.objectContaining({
                timing: expect.objectContaining({
                    targetDurationMinutes: 30,
                    currentSectionBudgetMinutes: 5,
                    currentSectionElapsedMinutes: expect.any(Number),
                    currentSectionRemainingMinutes: expect.any(Number),
                }),
            }),
        );
    });

    it('does not add a follow-up after the current section budget is exhausted', async () => {
        await arrangeSubmit(
            adaptiveOutput('FOLLOW_UP', 'Một câu hỏi phụ không cần thiết?'),
        );
        const sectionExpired = ownedWithTurns();
        sectionExpired.session.startedAt = new Date(Date.now() - 6 * 60_000);
        prisma.interview.findFirst.mockReset();
        prisma.interview.findFirst
            .mockResolvedValueOnce(sectionExpired)
            .mockResolvedValueOnce(stateInterview());

        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'Đã có đủ bằng chứng cho chủ đề này.',
        );

        expect(prisma.interviewTurn.create).not.toHaveBeenCalled();
    });
    it('protects remaining breadth near the end of the time budget', async () => {
        await arrangeSubmit(
            adaptiveOutput('INCREASE_DEPTH', 'One more deep question?'),
            0,
            3,
            3,
        );
        const nearEnd = ownedWithTurns();
        nearEnd.session.startedAt = new Date(Date.now() - 22 * 60_000);
        prisma.interview.findFirst.mockReset();
        prisma.interview.findFirst
            .mockResolvedValueOnce(nearEnd)
            .mockResolvedValueOnce(stateInterview());
        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'Strong answer',
        );
        expect(prisma.interviewTurn.create).not.toHaveBeenCalled();
    });

    it('stops the weak-answer recovery ladder when its root limit is reached', async () => {
        await arrangeSubmit(
            adaptiveOutput('DECREASE_DEPTH', 'A simpler version?', 'WEAK'),
            2,
        );
        await service.submitAnswer(userId, interviewId, turnId, 'Still unsure');
        expect(prisma.interviewTurn.create).not.toHaveBeenCalled();
    });
    it('falls back to the planned backbone when AI fails', async () => {
        await arrangeSubmit(undefined);
        adaptive.evaluate.mockRejectedValue(new Error('provider timeout'));
        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'Câu trả lời đã được chấp nhận',
        );
        expect(prisma.interviewTurn.create).not.toHaveBeenCalled();
        expect(prisma.interviewTurn.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ adaptiveStatus: 'FAILED' }),
            }),
        );
    });

    it('rejects a stale tab before invoking AI', async () => {
        prisma.interview.findFirst.mockResolvedValue(
            ownedWithTurns([{ ...currentTurn, id: 'another-turn' }]),
        );
        await expect(
            service.submitAnswer(userId, interviewId, turnId, 'Trả lời'),
        ).rejects.toMatchObject({
            response: expect.objectContaining({ code: 'INTERVIEW_TURN_STALE' }),
        });
        expect(adaptive.evaluate).not.toHaveBeenCalled();
    });

    it('prevents duplicate answer processing and duplicate adaptive children', async () => {
        prisma.interview.findFirst.mockResolvedValue(ownedWithTurns());
        prisma.interviewTurn.updateMany.mockResolvedValue({ count: 0 });
        await expect(
            service.submitAnswer(userId, interviewId, turnId, 'retry'),
        ).rejects.toMatchObject({
            response: expect.objectContaining({ code: 'INTERVIEW_TURN_STALE' }),
        });
        expect(prisma.interviewTurn.create).not.toHaveBeenCalled();
    });

    it('completes only after no planned or adaptive turns remain', async () => {
        prisma.interview.findFirst
            .mockResolvedValueOnce(ownedWithTurns([currentTurn]))
            .mockResolvedValueOnce(
                stateInterview(InterviewStatus.COMPLETED, [
                    { ...currentTurn, answeredAt: new Date() },
                ]),
            );
        prisma.interviewTurn.updateMany.mockResolvedValue({ count: 1 });
        prisma.interviewTurn.findFirst.mockResolvedValue(currentTurn);
        prisma.interviewTurn.count
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(0);
        prisma.interviewTurn.update.mockResolvedValue({ id: turnId });
        prisma.interviewSession.updateMany.mockResolvedValue({ count: 1 });
        prisma.interview.updateMany.mockResolvedValue({ count: 1 });
        adaptive.evaluate.mockResolvedValue(adaptiveOutput('NEXT', null));
        const state = await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'Câu cuối',
        );
        expect(prisma.interviewSession.updateMany).toHaveBeenCalled();
        expect(state.completed).toBe(true);
    });

    it('marks redundant planned coverage as covered indirectly', async () => {
        const output = adaptiveOutput('NEXT', null);
        output.result.coveredPlannedQuestionKeys = ['planned:2'];
        output.result.selectedPlannedQuestionKey = null;
        output.result.probeType = 'MAIN_TARGET_LEVEL';
        await arrangeSubmit(output);

        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'The answer already explains the next objective.',
        );

        expect(prisma.interviewTurn.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    plannedQuestionKey: { in: ['planned:2'] },
                }),
                data: expect.objectContaining({
                    plannedStatus: 'COVERED_INDIRECTLY',
                    coveredByTurnId: turnId,
                }),
            }),
        );
    });

    it('skips remaining pool options when a competency is already saturated', async () => {
        const output = adaptiveOutput('NEXT', null);
        output.result.topicSaturated = true;
        output.result.selectedPlannedQuestionKey = null;
        output.result.probeType = 'MAIN_TARGET_LEVEL';
        await arrangeSubmit(output);

        await service.submitAnswer(
            userId,
            interviewId,
            turnId,
            'The answer supplies sufficient evidence for this competency.',
        );

        expect(prisma.interviewTurn.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    plannedQuestionKey: { in: ['planned:2'] },
                }),
                data: expect.objectContaining({
                    plannedStatus: 'SKIPPED_REDUNDANT',
                    coveredByTurnId: turnId,
                }),
            }),
        );
    });
    it('preserves the candidate-questions closing turn until other coverage is done', () => {
        const chooseNext = (service as any).chooseNextPlanned.bind(service);
        const technical = {
            id: 'technical',
            plannedQuestionKey: 'planned:2',
            questionType: 'TECHNICAL',
        };
        const closing = {
            id: 'closing',
            plannedQuestionKey: 'planned:99',
            questionType: 'CANDIDATE',
        };

        expect(
            chooseNext([closing, technical], closing.plannedQuestionKey),
        ).toEqual(technical);
        expect(chooseNext([closing], null)).toEqual(closing);
    });

    it('accepts only one-level bonus-only stretch probes', () => {
        const valid = adaptiveOutput('INCREASE_DEPTH', 'Stretch').result;
        const validate = (service as any).isValidStretch.bind(service);

        expect(validate('JUNIOR', 'MAIN_TARGET_LEVEL', valid)).toBe(true);
        expect(
            validate('JUNIOR', 'MAIN_TARGET_LEVEL', {
                ...valid,
                questionLevel: 'SENIOR',
            }),
        ).toBe(false);
        expect(validate('JUNIOR', 'STRETCH_PROBE', valid)).toBe(false);
        expect(
            validate('JUNIOR', 'MAIN_TARGET_LEVEL', {
                ...valid,
                scoringImpact: 'TARGET_LEVEL',
            }),
        ).toBe(false);
    });
    it('does not allow completed interviews to restart', async () => {
        prisma.interview.findFirst.mockResolvedValue({
            id: interviewId,
            status: InterviewStatus.COMPLETED,
            session: { id: sessionId },
            plans: [],
        });
        await expect(service.start(userId, interviewId)).rejects.toBeInstanceOf(
            ConflictException,
        );
    });
});
