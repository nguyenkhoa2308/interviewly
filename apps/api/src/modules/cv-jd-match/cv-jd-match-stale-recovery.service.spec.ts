import { Logger } from '@nestjs/common';
import { jest } from '@jest/globals';

import { CVJDMatchStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CV_JD_MATCH_STALE_THRESHOLD_MS,
    CvJdMatchStaleRecoveryService,
} from './cv-jd-match-stale-recovery.service';

describe('CvJdMatchStaleRecoveryService', () => {
    const prisma = { cVJDMatch: { updateMany: jest.fn() } };
    let service: CvJdMatchStaleRecoveryService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CvJdMatchStaleRecoveryService(
            prisma as unknown as PrismaService,
        );
        prisma.cVJDMatch.updateMany.mockResolvedValue({ count: 1 });
    });

    it('marks only stale PROCESSING matches as FAILED', async () => {
        const now = new Date('2026-09-26T10:00:00.000Z');
        const staleBefore = new Date(
            now.getTime() - CV_JD_MATCH_STALE_THRESHOLD_MS,
        );

        await service.recoverStaleMatches(now);

        expect(prisma.cVJDMatch.updateMany).toHaveBeenCalledWith({
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
    });

    it('logs recovery failures without crashing the app', async () => {
        const logger = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
        prisma.cVJDMatch.updateMany.mockRejectedValue(
            new Error('database unavailable'),
        );

        await expect(service.recoverStaleMatches()).resolves.toBeUndefined();
        expect(logger).toHaveBeenCalled();
        logger.mockRestore();
    });
});
