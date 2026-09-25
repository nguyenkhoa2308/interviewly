import { Logger } from '@nestjs/common';
import { jest } from '@jest/globals';

import { CVProcessingStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CV_STALE_PROCESSING_THRESHOLD_MS,
    CvStaleProcessingRecoveryService,
} from './cv-stale-processing-recovery.service';

describe('CvStaleProcessingRecoveryService', () => {
    const prisma = {
        cV: { updateMany: jest.fn() },
        cVVersion: { updateMany: jest.fn() },
        $transaction: jest.fn(),
    };
    let service: CvStaleProcessingRecoveryService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CvStaleProcessingRecoveryService(
            prisma as unknown as PrismaService,
        );
        prisma.cV.updateMany.mockResolvedValue({ count: 1 });
        prisma.cVVersion.updateMany.mockResolvedValue({ count: 1 });
        prisma.$transaction.mockImplementation((operations) =>
            Promise.all(operations as Promise<unknown>[]),
        );
    });

    it('marks only stale uploading or processing records as failed', async () => {
        const now = new Date('2026-09-25T10:00:00.000Z');
        const staleBefore = new Date(
            now.getTime() - CV_STALE_PROCESSING_THRESHOLD_MS,
        );

        await service.recoverStaleProcessing(now);

        const expectedData = {
            processingStatus: CVProcessingStatus.FAILED,
            processingErrorCode: 'CV_PROCESSING_INTERRUPTED',
            processingError: 'Quá trình tải lên hoặc xử lý CV đã bị gián đoạn.',
        };
        expect(prisma.cV.updateMany).toHaveBeenCalledWith({
            where: {
                deletedAt: null,
                processingStatus: {
                    in: [
                        CVProcessingStatus.UPLOADING,
                        CVProcessingStatus.PROCESSING,
                    ],
                },
                updatedAt: { lt: staleBefore },
            },
            data: expectedData,
        });
        expect(prisma.cVVersion.updateMany).toHaveBeenCalledWith({
            where: {
                cv: { deletedAt: null },
                processingStatus: {
                    in: [
                        CVProcessingStatus.UPLOADING,
                        CVProcessingStatus.PROCESSING,
                    ],
                },
                updatedAt: { lt: staleBefore },
            },
            data: expectedData,
        });
    });

    it('logs and does not crash the app when recovery fails', async () => {
        const logger = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
        prisma.$transaction.mockRejectedValue(new Error('database down'));

        await expect(service.recoverStaleProcessing()).resolves.toBeUndefined();
        expect(logger).toHaveBeenCalled();
        logger.mockRestore();
    });
});
