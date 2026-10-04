import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';

import { CVJDMatchStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const CV_JD_MATCH_STALE_THRESHOLD_MS = 10 * 60 * 1000;
export const CV_JD_MATCH_STALE_SWEEP_INTERVAL_MS = 60 * 1000;

@Injectable()
export class CvJdMatchStaleRecoveryService
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(CvJdMatchStaleRecoveryService.name);
    private sweepTimer?: NodeJS.Timeout;

    constructor(private readonly prisma: PrismaService) {}

    onModuleInit(): void {
        void this.recoverStaleMatches();
        this.sweepTimer = setInterval(
            () => void this.recoverStaleMatches(),
            CV_JD_MATCH_STALE_SWEEP_INTERVAL_MS,
        );
        this.sweepTimer.unref();
    }

    onModuleDestroy(): void {
        if (this.sweepTimer) clearInterval(this.sweepTimer);
    }

    async recoverStaleMatches(now = new Date()): Promise<void> {
        const staleBefore = new Date(
            now.getTime() - CV_JD_MATCH_STALE_THRESHOLD_MS,
        );

        try {
            const result = await this.prisma.cVJDMatch.updateMany({
                where: {
                    status: CVJDMatchStatus.PROCESSING,
                    createdAt: { lt: staleBefore },
                },
                data: {
                    status: CVJDMatchStatus.FAILED,
                    errorCode: 'CV_JD_MATCH_PROCESSING_INTERRUPTED',
                    errorMessage:
                        'Quá trình đối chiếu đã bị gián đoạn. Vui lòng thử lại.',
                    completedAt: now,
                },
            });

            if (result.count > 0) {
                this.logger.warn({
                    message: 'Recovered stale CV-JD matching records.',
                    count: result.count,
                    staleBefore: staleBefore.toISOString(),
                });
            }
        } catch (error) {
            this.logger.error(
                'Failed to recover stale CV-JD matching records.',
                error instanceof Error ? error.stack : undefined,
            );
        }
    }
}
