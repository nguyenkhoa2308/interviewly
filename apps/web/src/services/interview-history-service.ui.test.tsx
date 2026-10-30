import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getInterviewHistory,
    getInterviewProgress,
    getInterviewTranscript,
} from './interview.service';

const api = vi.hoisted(() => ({ getData: vi.fn() }));
vi.mock('@/lib/api-client', () => ({
    getData: api.getData,
    postData: vi.fn(),
    deleteData: vi.fn(),
}));

describe('Interview history data layer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.getData.mockResolvedValue({ success: true, data: {} });
    });

    it('serializes server-side history filters and pagination', async () => {
        await getInterviewHistory({ page: 2, limit: 9, status: 'COMPLETED', search: 'frontend', sort: 'HIGHEST_SCORE' });
        expect(api.getData).toHaveBeenCalledWith('/interviews/history?page=2&limit=9&status=COMPLETED&search=frontend&sort=HIGHEST_SCORE');
    });

    it('loads transcript from the authenticated interview resource', async () => {
        await getInterviewTranscript('interview-1');
        expect(api.getData).toHaveBeenCalledWith('/interviews/interview-1/transcript');
    });

    it('keeps progress filters explicit and does not request AI generation', async () => {
        await getInterviewProgress({ role: 'Frontend Developer', level: 'JUNIOR', interviewType: 'TECHNICAL' });
        expect(api.getData).toHaveBeenCalledWith('/interviews/progress?role=Frontend+Developer&level=JUNIOR&interviewType=TECHNICAL');
    });
});