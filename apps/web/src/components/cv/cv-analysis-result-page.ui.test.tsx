import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CvAnalysisResultPage } from './cv-analysis-result-page';
import { ApiError } from '@/lib/api-error';
import type { CvAnalysis, CvDetail } from '@/types/cv';

const mocks = vi.hoisted(() => ({
    useCv: vi.fn(),
    latest: vi.fn(),
    history: vi.fn(),
    analyze: vi.fn(),
    mutateAsync: vi.fn(),
    cvRefetch: vi.fn(),
    analysisRefetch: vi.fn(),
    successToast: vi.fn(),
    errorToast: vi.fn(),
}));

vi.mock('@/hooks/cv', () => ({
    useCv: mocks.useCv,
    useLatestCvAnalysis: mocks.latest,
    useCvAnalysisHistory: mocks.history,
    useAnalyzeCv: mocks.analyze,
}));
vi.mock('sonner', () => ({
    toast: { success: mocks.successToast, error: mocks.errorToast },
}));
vi.mock('@/components/cv/cv-version-comparison', () => ({
    AutomaticVersionComparison: () => null,
}));

const cv: CvDetail = {
    id: 'cv-123',
    name: 'CV Frontend Developer',
    originalFilename: 'frontend.pdf',
    mimeType: 'application/pdf',
    fileSize: 2048,
    processingStatus: 'READY',
    isDefault: true,
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
    extractedText: 'Frontend developer',
};

const analysis: CvAnalysis = {
    id: 'analysis-1',
    cvId: cv.id,
    status: 'COMPLETED',
    overallScore: 83,
    detectedRole: 'Frontend Developer',
    detectedLevel: 'JUNIOR',
    extractedSkills: [
        {
            name: 'React.js',
            category: 'Frontend',
            evidence: 'Kinh nghiệm làm việc',
        },
    ],
    workExperiences: [
        {
            company: 'Interviewly',
            role: 'Frontend Developer',
            startDate: '2025',
            endDate: '2026',
            description: 'Xây dựng sản phẩm.',
            technologies: ['React.js'],
        },
    ],
    projects: [
        {
            name: 'Task Hub',
            description: 'Nền tảng quản lý công việc.',
            technologies: ['Next.js'],
        },
    ],
    education: [
        {
            institution: 'Đại học Công nghiệp Hà Nội',
            degree: 'Kỹ sư',
            field: 'Kỹ thuật phần mềm',
            startDate: '2021',
            endDate: '2025',
        },
    ],
    strengths: [
        {
            title: 'Nền tảng frontend tốt',
            description: 'Có kinh nghiệm thực tế.',
            evidence: 'Nhiều dự án React.js',
        },
    ],
    weaknesses: [
        {
            title: 'Thiếu số liệu',
            description: 'Chưa định lượng tác động.',
            evidence: null,
        },
    ],
    interviewRisks: [
        {
            title: 'Mốc thời gian',
            description: 'Cần giải thích rõ.',
            evidence: 'Ngày dự án',
        },
    ],
    potentialQuestions: [
        {
            question: 'Bạn tối ưu React như thế nào?',
            reason: 'Đánh giá kiến thức.',
            basedOn: 'Kinh nghiệm React.js',
        },
    ],
    suggestions: [
        {
            title: 'Bổ sung số liệu',
            description: 'Định lượng kết quả.',
            priority: 'HIGH',
        },
    ],
    modelProvider: 'GEMINI',
    modelName: 'gemini-3.6-flash',
    promptVersion: 'cv-analysis-v1',
    createdAt: '2026-09-19T00:00:00.000Z',
    completedAt: '2026-09-19T00:01:00.000Z',
};

function cvState(overrides: Record<string, unknown> = {}) {
    return {
        data: cv,
        isPending: false,
        isError: false,
        error: null,
        refetch: mocks.cvRefetch,
        ...overrides,
    };
}

function analysisState(overrides: Record<string, unknown> = {}) {
    return {
        data: analysis,
        isPending: false,
        isError: false,
        error: null,
        refetch: mocks.analysisRefetch,
        ...overrides,
    };
}

describe('CvAnalysisResultPage', () => {
    beforeEach(() => {
        mocks.useCv.mockReturnValue(cvState());
        mocks.latest.mockReturnValue(analysisState());
        mocks.history.mockReturnValue({
            data: {
                items: [
                    {
                        id: 'failed-2',
                        cvId: cv.id,
                        status: 'FAILED',
                        overallScore: null,
                        detectedRole: null,
                        detectedLevel: null,
                        createdAt: '2026-09-19T02:00:00.000Z',
                        completedAt: '2026-09-19T02:01:00.000Z',
                    },
                    {
                        id: analysis.id,
                        cvId: cv.id,
                        status: 'COMPLETED',
                        overallScore: 83,
                        detectedRole: 'Frontend Developer',
                        detectedLevel: 'JUNIOR',
                        createdAt: analysis.createdAt,
                        completedAt: analysis.completedAt,
                    },
                ],
                pagination: { page: 1, limit: 5, total: 2, totalPages: 1 },
            },
            isPending: false,
            isError: false,
            refetch: vi.fn(),
        });
        mocks.analyze.mockReturnValue({
            isPending: false,
            mutateAsync: mocks.mutateAsync,
        });
        mocks.mutateAsync.mockResolvedValue(analysis);
    });

    it('renders decision-focused analysis sections without duplicated CV content', () => {
        const { container } = render(<CvAnalysisResultPage cvId={cv.id} />);
        expect(screen.getByText('83')).toBeVisible();
        expect(
            screen.getByText('Frontend Developer', { selector: 'dd' }),
        ).toBeVisible();
        expect(screen.getByText('Junior')).toBeVisible();
        expect(screen.getAllByText('React.js')[0]).toBeVisible();
        expect(screen.getByText('Nền tảng frontend tốt')).toBeVisible();
        expect(screen.getByText('Thiếu số liệu')).toBeVisible();
        expect(screen.getByText('Mốc thời gian')).toBeVisible();
        expect(screen.getByText('Bạn tối ưu React như thế nào?')).toBeVisible();
        expect(screen.getByText('Bổ sung số liệu')).toBeVisible();
        expect(
            screen.queryByRole('heading', { name: 'Kinh nghiệm làm việc' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Dự án nổi bật' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Học vấn' }),
        ).not.toBeInTheDocument();
        expect(container.textContent).not.toContain('storageKey');
        expect(container.textContent).not.toContain('gemini-3.6-flash');
        expect(screen.getByText('Lịch sử phân tích')).toBeVisible();
        expect(screen.getByText('Thất bại')).toBeVisible();
        expect(screen.getAllByText('Hoàn thành').length).toBeGreaterThan(0);
    });

    it('handles a null score without showing zero', () => {
        mocks.latest.mockReturnValue(
            analysisState({ data: { ...analysis, overallScore: null } }),
        );
        render(<CvAnalysisResultPage cvId={cv.id} />);
        expect(screen.getByText('Chưa có điểm đánh giá')).toBeVisible();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('keeps the current report visible while re-analysis is pending', () => {
        mocks.analyze.mockReturnValue({
            isPending: true,
            mutateAsync: mocks.mutateAsync,
        });
        render(<CvAnalysisResultPage cvId={cv.id} />);
        expect(screen.getByText('83')).toBeVisible();
        expect(screen.getByText(/Báo cáo hiện tại vẫn được giữ/)).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Đang phân tích...' }),
        ).toBeDisabled();
    });

    it('triggers re-analysis with cvId only', async () => {
        render(<CvAnalysisResultPage cvId={cv.id} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích lại' }),
        );
        expect(screen.getByText('Phân tích lại CV?')).toBeVisible();
        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích lại' }),
        );
        expect(mocks.mutateAsync).toHaveBeenCalledWith({ cvId: cv.id });
    });

    it('preserves the report and hides raw provider errors on failure', async () => {
        mocks.mutateAsync.mockRejectedValue(
            new ApiError('provider secret', 'AI_PROVIDER_ERROR', 502),
        );
        render(<CvAnalysisResultPage cvId={cv.id} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích lại' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích lại' }),
        );
        await waitFor(() => expect(mocks.errorToast).toHaveBeenCalled());
        expect(screen.getByText('83')).toBeVisible();
        expect(JSON.stringify(mocks.errorToast.mock.calls)).not.toContain(
            'provider secret',
        );
    });

    it('renders no-analysis, loading and retryable error states', async () => {
        mocks.latest.mockReturnValue(analysisState({ data: null }));
        const { rerender } = render(<CvAnalysisResultPage cvId={cv.id} />);
        expect(screen.getByText('CV chưa có bản phân tích')).toBeVisible();

        mocks.latest.mockReturnValue(
            analysisState({ data: undefined, isPending: true }),
        );
        rerender(<CvAnalysisResultPage cvId={cv.id} />);
        expect(
            screen.getByLabelText('Đang tải báo cáo phân tích CV'),
        ).toHaveAttribute('aria-busy', 'true');

        mocks.latest.mockReturnValue(
            analysisState({
                data: undefined,
                isError: true,
                error: new Error('network'),
            }),
        );
        rerender(<CvAnalysisResultPage cvId={cv.id} />);
        await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
        expect(mocks.analysisRefetch).toHaveBeenCalledOnce();
    });
});
