import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';

import { InterviewPlanStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const INTERVIEW_PLAN_STALE_THRESHOLD_MS = 10 * 60 * 1000;
export const INTERVIEW_PLAN_STALE_SWEEP_INTERVAL_MS = 60 * 1000;

@Injectable()
export class InterviewPlanStaleRecoveryService
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(
        InterviewPlanStaleRecoveryService.name,
    );
    private sweepTimer?: NodeJS.Timeout;

    constructor(private readonly prisma: PrismaService) {}

    onModuleInit(): void {
        void this.recoverStalePlans();
        this.sweepTimer = setInterval(
            () => void this.recoverStalePlans(),
            INTERVIEW_PLAN_STALE_SWEEP_INTERVAL_MS,
        );
        this.sweepTimer.unref();
    }

    onModuleDestroy(): void {
        if (this.sweepTimer) clearInterval(this.sweepTimer);
    }

    async recoverStalePlans(now = new Date()): Promise<void> {
        const staleBefore = new Date(
            now.getTime() - INTERVIEW_PLAN_STALE_THRESHOLD_MS,
        );

        try {
            const result = await this.prisma.interviewPlan.updateMany({
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

            if (result.count > 0) {
                this.logger.warn({
                    message: 'Recovered stale interview plans.',
                    count: result.count,
                    staleBefore: staleBefore.toISOString(),
                });
            }
        } catch (error) {
            this.logger.error(
                'Failed to recover stale interview plans.',
                error instanceof Error ? error.stack : undefined,
            );
        }
    }
}
