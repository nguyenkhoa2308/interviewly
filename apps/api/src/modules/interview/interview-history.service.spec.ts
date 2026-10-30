import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import { InterviewHistoryService } from './interview-history.service';
import { InterviewHistorySort } from './dto/interview-history-query.dto';

function setup() {
    const prisma = {
        interview: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
        interviewEvaluation: { findMany: jest.fn() },
        $transaction: jest.fn(),
    } as unknown as PrismaService;
    return { prisma, service: new InterviewHistoryService(prisma) };
}

describe('InterviewHistoryService', () => {
    it('paginates history and always scopes records to the authenticated user', async () => {
        const { prisma, service } = setup();
        (prisma.$transaction as jest.Mock).mockResolvedValue([[], 12]);

        const result = await service.history('user-a', {
            page: 2,
            limit: 9,
            sort: InterviewHistorySort.RECENT,
            search: 'frontend',
        });

        expect(prisma.interview.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ userId: 'user-a' }),
                skip: 9,
                take: 9,
            }),
        );
        expect(result.pagination).toEqual({ page: 2, limit: 9, total: 12, totalPages: 2 });
    });

    it('builds a read-only transcript from persisted answered turns and links feedback by turn id', async () => {
        const { prisma, service } = setup();
        (prisma.interview.findFirst as jest.Mock).mockResolvedValue({
            id: 'interview-1', status: 'COMPLETED', targetRole: 'Frontend Developer',
            targetLevel: 'JUNIOR', interviewType: 'TECHNICAL', createdAt: new Date(),
            session: { id: 'session-1', startedAt: new Date(), completedAt: new Date(), turns: [
                { id: 'turn-1', runtimeOrder: 1, sectionIndex: 0, sectionTitle: 'Kỹ thuật', questionType: 'TECHNICAL', topic: 'React', questionText: 'Câu hỏi', answerText: 'Câu trả lời', answeredAt: new Date() },
            ] },
            evaluation: { status: 'COMPLETED', completedAt: new Date(), reportData: {
                answerReviews: [{ turnId: 'turn-1', correctAspects: ['Đúng'], missingAspects: [], incorrectAspects: [], whyItMatters: 'Quan trọng', improvement: 'Bổ sung ví dụ', exampleImprovedAnswer: null, hiddenPrompt: 'must not leak' }],
            } },
        });

        const result = await service.transcript('user-a', 'interview-1');

        expect(prisma.interview.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'interview-1', userId: 'user-a' } }));
        expect(result.turns[0].feedback?.correctAspects).toEqual(['Đúng']);
        expect(result.turns[0].feedback).not.toHaveProperty('hiddenPrompt');
    });

    it('returns not found instead of exposing another users transcript', async () => {
        const { prisma, service } = setup();
        (prisma.interview.findFirst as jest.Mock).mockResolvedValue(null);
        await expect(service.transcript('user-a', 'other-interview')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('groups trends by comparable role, level, type and rubric and only reports repeated evidence gaps', async () => {
        const { prisma, service } = setup();
        const reportData = {
            competencies: [{ competencyKey: 'javascript', name: 'JavaScript', score: 6, coverageStatus: 'SUFFICIENT', confidence: 'HIGH' }],
            diagnosticFindings: [{ competencyKey: 'javascript', subarea: 'Closure', category: 'KNOWLEDGE_GAP', evidenceStatus: 'DEMONSTRATED_GAP', severity: 'HIGH', observation: 'Thiếu ví dụ' }],
        };
        const evaluations = [1, 2].map((index) => ({
            interviewId: 'interview-' + index, overallScore: 5 + index, coverage: 80,
            confidence: 'HIGH', rubricVersion: 'v1', completedAt: new Date(2026, 0, index), reportData,
            interview: { targetRole: 'Frontend Developer', targetLevel: 'JUNIOR', interviewType: 'TECHNICAL' },
        }));
        (prisma.$transaction as jest.Mock).mockResolvedValue([3, evaluations]);

        const result = await service.progress('user-a', {});

        expect(result.summary.completedInterviewCount).toBe(3);
        expect(result.summary.comparableInterviewCount).toBe(2);
        expect(result.overallSeries).toHaveLength(2);
        expect(result.recurringWeaknesses).toHaveLength(1);
        expect(result.recurringWeaknesses[0].occurrences).toHaveLength(2);
    });
});