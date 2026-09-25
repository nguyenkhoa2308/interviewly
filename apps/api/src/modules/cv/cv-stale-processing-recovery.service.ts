import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';

import { CVProcessingStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const CV_STALE_PROCESSING_THRESHOLD_MS = 10 * 60 * 1000;
export const CV_STALE_PROCESSING_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class CvStaleProcessingRecoveryService
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(CvStaleProcessingRecoveryService.name);
    private sweepTimer?: NodeJS.Timeout;

    constructor(private readonly prisma: PrismaService) {}

    onModuleInit(): void {
        void this.recoverStaleProcessing();
        this.sweepTimer = setInterval(
            () => void this.recoverStaleProcessing(),
            CV_STALE_PROCESSING_SWEEP_INTERVAL_MS,
        );
        this.sweepTimer.unref();
    }

    onModuleDestroy(): void {
        if (this.sweepTimer) clearInterval(this.sweepTimer);
    }

    async recoverStaleProcessing(now = new Date()): Promise<void> {
        const staleBefore = new Date(
            now.getTime() - CV_STALE_PROCESSING_THRESHOLD_MS,
        );
        const staleStatuses = [
            CVProcessingStatus.UPLOADING,
            CVProcessingStatus.PROCESSING,
        ];
        const failedData = {
            processingStatus: CVProcessingStatus.FAILED,
            processingErrorCode: 'CV_PROCESSING_INTERRUPTED',
            processingError: 'Quá trình tải lên hoặc xử lý CV đã bị gián đoạn.',
        };

        try {
            const [cvs, versions] = await this.prisma.$transaction([
                this.prisma.cV.updateMany({
                    where: {
                        deletedAt: null,
                        processingStatus: { in: staleStatuses },
                        updatedAt: { lt: staleBefore },
                    },
                    data: failedData,
                }),
                this.prisma.cVVersion.updateMany({
                    where: {
                        cv: { deletedAt: null },
                        processingStatus: { in: staleStatuses },
                        updatedAt: { lt: staleBefore },
                    },
                    data: failedData,
                }),
            ]);

            if (cvs.count > 0 || versions.count > 0) {
                this.logger.warn({
                    message: 'Recovered stale CV processing records.',
                    cvCount: cvs.count,
                    versionCount: versions.count,
                    staleBefore: staleBefore.toISOString(),
                });
            }
        } catch (error) {
            this.logger.error(
                'Failed to recover stale CV processing records.',
                error instanceof Error ? error.stack : undefined,
            );
        }
    }
}
