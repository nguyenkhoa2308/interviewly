import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api-error';
import {
    analyzeCv,
    getCvAnalysisHistory,
    getLatestCvAnalysis,
} from './cv.service';

const api = vi.hoisted(() => ({
    getData: vi.fn(),
    postData: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
    getData: api.getData,
    postData: api.postData,
    patchData: vi.fn(),
    deleteData: vi.fn(),
}));

describe('CV analysis service', () => {
    beforeEach(() => vi.clearAllMocks());

    it('posts only to the CV analyze route without a client payload', async () => {
        api.postData.mockResolvedValue({
            success: true,
            data: { id: 'analysis-1', status: 'COMPLETED' },
        });

        await analyzeCv('cv-123');

        expect(api.postData).toHaveBeenCalledWith('/cvs/cv-123/analyze');
        expect(api.postData.mock.calls[0]).toHaveLength(1);
    });

    it('loads the latest analysis from the exact backend route', async () => {
        api.getData.mockResolvedValue({
            success: true,
            data: { id: 'analysis-1', status: 'COMPLETED' },
        });
        await getLatestCvAnalysis('cv-123');
        expect(api.getData).toHaveBeenCalledWith('/cvs/cv-123/analyses/latest');
    });

    it('normalizes only CV_ANALYSIS_NOT_FOUND to a no-analysis state', async () => {
        api.getData.mockRejectedValue(
            new ApiError('Chưa có kết quả', 'CV_ANALYSIS_NOT_FOUND', 404),
        );
        await expect(getLatestCvAnalysis('cv-123')).resolves.toBeNull();
    });

    it('preserves real CV not-found and network errors', async () => {
        const error = new ApiError('Không tìm thấy CV', 'CV_NOT_FOUND', 404);
        api.getData.mockRejectedValue(error);
        await expect(getLatestCvAnalysis('cv-123')).rejects.toBe(error);
    });

    it('loads history with pagination without building a history screen', async () => {
        api.getData.mockResolvedValue({
            success: true,
            data: { items: [], pagination: {} },
        });
        await getCvAnalysisHistory('cv-123', { page: 2, limit: 10 });
        expect(api.getData).toHaveBeenCalledWith('/cvs/cv-123/analyses', {
            params: { page: 2, limit: 10 },
        });
    });
});
