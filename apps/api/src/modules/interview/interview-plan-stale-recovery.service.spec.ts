import { Logger } from '@nestjs/common';
import { jest } from '@jest/globals';

import { InterviewPlanStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
    INTERVIEW_PLAN_STALE_THRESHOLD_MS,
    InterviewPlanStaleRecoveryService,
} from './interview-plan-stale-recovery.service';

describe('InterviewPlanStaleRecoveryService', () => {
    const prisma = { interviewPlan: { updateMany: jest.fn() } };
    let service: InterviewPlanStaleRecoveryService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new InterviewPlanStaleRecoveryService(
            prisma as unknown as PrismaService,
        );
        prisma.interviewPlan.updateMany.mockResolvedValue({ count: 1 });
    });

    it('marks only stale PROCESSING plans as FAILED', async () => {
        const now = new Date('2026-10-03T10:00:00.000Z');
        const staleBefore = new Date(
            now.getTime() - INTERVIEW_PLAN_STALE_THRESHOLD_MS,
        );

        await service.recoverStalePlans(now);

        expect(prisma.interviewPlan.updateMany).toHaveBeenCalledWith({
            where: {
                status: InterviewPlanStatus.PROCESSING,
                createdAt: { lt: staleBefore },
            },
            data: {
                status: InterviewPlanStatus.FAILED,
                errorCode: 'INTERVIEW_PLAN_PROCESSING_INTERRUPTED',
                errorMessage:
                    'Quá trình tạo kế hoạch phỏng vấn đã bị gián đoạn. Vui lòng thử lại.',
                completedAt: now,
            },
        });
    });

    it('logs recovery failures without crashing the app', async () => {
        const logger = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
        prisma.interviewPlan.updateMany.mockRejectedValue(
            new Error('database unavailable'),
        );

        await expect(service.recoverStalePlans()).resolves.toBeUndefined();
        expect(logger).toHaveBeenCalled();
        logger.mockRestore();
    });
});
