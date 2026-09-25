import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CvJdMatchResultPage } from './cv-jd-match-result-page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/cv-jd-match/use-cv-jd-matches', () => ({
    useCvJdMatch: () => ({
        isPending: false,
        isError: false,
        data: {
            id: 'current',
            cvId: 'cv',
            jobDescriptionId: 'jd',
            cvVersionId: 'version',
            cvAnalysisId: 'cv-analysis',
            jdAnalysisId: 'jd-analysis',
            status: 'COMPLETED',
            cvNameSnapshot: 'Frontend CV',
            cvVersionNumber: 2,
            jdTitleSnapshot: 'Frontend Developer',
            jdCompanySnapshot: 'Interviewly',
            cvUpdatedAtSnapshot: '2026-09-20T07:00:00.000Z',
            jdUpdatedAtSnapshot: '2026-09-18T07:00:00.000Z',
            matchScore: 78,
            scoreBreakdown: {
                requiredSkills: { earned: 32, maximum: 40, reason: 'Thiếu Docker.' },
                preferredSkills: { earned: 8, maximum: 10, reason: 'Thiếu một kỹ năng ưu tiên.' },
                experienceAndRole: { earned: 16, maximum: 20, reason: 'Kinh nghiệm gần phù hợp.' },
                responsibilityEvidence: { earned: 14, maximum: 20, reason: 'Minh chứng chưa đầy đủ.' },
                educationAndDomain: { earned: 8, maximum: 10, reason: 'Phù hợp.' },
            },
            matchSummary: 'Phù hợp tốt với React.',
            matchedSkills: [{ name: 'React', evidence: 'Dự án React' }],
            skillGaps: [{ name: 'Docker', importance: 'PREFERRED', explanation: 'Chưa có bằng chứng trong CV.' }],
            strengths: [{ title: 'React', description: 'Phù hợp yêu cầu.', evidence: 'React project' }],
            gaps: [],
            experienceAlignment: { summary: 'Phù hợp Junior.', jdExpectation: 'Junior', cvEvidence: 'Dự án' },
            recommendations: [{ title: 'Ôn Docker', description: 'Chuẩn bị nền tảng.', type: 'PREPARE_KNOWLEDGE', priority: 'MEDIUM' }],
            modelProvider: 'GEMINI',
            modelName: 'test',
            promptVersion: 'v1',
            errorCode: null,
            createdAt: '2026-09-18T07:32:00.000Z',
            completedAt: '2026-09-18T07:33:00.000Z',
        },
    }),
    useCvJdMatches: () => ({
        data: {
            items: [{
                id: 'failed',
                cvId: 'cv',
                jobDescriptionId: 'jd',
                status: 'FAILED',
                cvNameSnapshot: 'Frontend CV',
                cvVersionNumber: 2,
                jdTitleSnapshot: 'Frontend Developer',
                jdCompanySnapshot: 'Interviewly',
                matchScore: 91,
                createdAt: '2026-09-17T07:32:00.000Z',
                completedAt: null,
            }],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
    }),
    useCreateCvJdMatch: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

describe('CvJdMatchResultPage', () => {
    it('renders real result fields and score semantics', () => {
        render(<CvJdMatchResultPage id="current" />);
        expect(screen.getByText('78%')).toBeInTheDocument();
        expect(screen.getByText('32/40')).toBeInTheDocument();
        expect(screen.getByText('Thiếu Docker.')).toBeInTheDocument();
        expect(screen.getAllByText(/Frontend CV/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Frontend Developer/).length).toBeGreaterThan(0);
        expect(screen.getByTitle('Dự án React')).toBeInTheDocument();
        expect(screen.getByTitle('Chưa có bằng chứng trong CV.')).toBeInTheDocument();
        expect(screen.getByText('Ôn Docker')).toBeInTheDocument();
        expect(screen.getByText(/không phải xác suất được tuyển dụng/i)).toBeInTheDocument();
    });

    it('uses the shared breadcrumb without a standalone back link', () => {
        render(<CvJdMatchResultPage id="current" />);
        expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
        expect(screen.queryByText(/Quay lại đối chiếu/i)).not.toBeInTheDocument();
    });

    it('does not expose a score for a failed history attempt', () => {
        render(<CvJdMatchResultPage id="current" />);
        expect(screen.getByText('Thất bại')).toBeInTheDocument();
        expect(screen.getByText('—')).toBeInTheDocument();
        expect(screen.queryByText('91%')).not.toBeInTheDocument();
    });
});
