import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CvAnalysisSection } from './cv-analysis-section';
import { ApiError } from '@/lib/api-error';
import type { CvAnalysis, CvDetail } from '@/types/cv';

const mocks = vi.hoisted(() => ({
    latest: vi.fn(),
    analyze: vi.fn(),
    mutateAsync: vi.fn(),
    refetch: vi.fn(),
    successToast: vi.fn(),
    errorToast: vi.fn(),
}));

vi.mock('@/hooks/cv', () => ({
    useLatestCvAnalysis: mocks.latest,
    useAnalyzeCv: mocks.analyze,
}));
vi.mock('sonner', () => ({
    toast: { success: mocks.successToast, error: mocks.errorToast },
}));

const cv: CvDetail = {
    id: 'cv-123',
    name: 'Backend CV',
    originalFilename: 'backend.pdf',
    mimeType: 'application/pdf',
    fileSize: 1000,
    processingStatus: 'READY',
    isDefault: false,
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
    extractedText: 'Backend Developer',
};

const completed: CvAnalysis = {
    id: 'analysis-1',
    cvId: cv.id,
    status: 'COMPLETED',
    overallScore: 78,
    detectedRole: 'Backend Developer',
    detectedLevel: 'JUNIOR',
    extractedSkills: [],
    workExperiences: [],
    projects: [],
    education: [],
    strengths: [],
    weaknesses: [],
    interviewRisks: [],
    potentialQuestions: [],
    suggestions: [],
    modelProvider: 'GEMINI',
    modelName: 'gemini-test',
    promptVersion: 'v1',
    createdAt: '2026-09-19T00:00:00.000Z',
    completedAt: '2026-09-19T00:01:00.000Z',
};

function latestState(overrides: Record<string, unknown> = {}) {
    return {
        data: null,
        isPending: false,
        isError: false,
        refetch: mocks.refetch,
        ...overrides,
    };
}

function mutationState(overrides: Record<string, unknown> = {}) {
    return {
        isPending: false,
        mutateAsync: mocks.mutateAsync,
        ...overrides,
    };
}

describe('CvAnalysisSection', () => {
    beforeEach(() => {
        mocks.latest.mockReturnValue(latestState());
        mocks.analyze.mockReturnValue(mutationState());
        mocks.mutateAsync.mockResolvedValue(completed);
    });

    it('shows the first-analysis action only for a usable READY CV', () => {
        render(<CvAnalysisSection cv={cv} />);
        expect(
            screen.getByRole('button', { name: 'Phân tích CV' }),
        ).toBeEnabled();
        expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('calls mutation with only cvId', async () => {
        render(<CvAnalysisSection cv={cv} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích CV' }),
        );
        expect(mocks.mutateAsync).toHaveBeenCalledWith({ cvId: cv.id });
    });

    it('shows accessible analyzing feedback and no fake progress', () => {
        mocks.analyze.mockReturnValue(mutationState({ isPending: true }));
        render(<CvAnalysisSection cv={cv} />);
        expect(screen.getByText('Đang phân tích CV của bạn...')).toBeVisible();
        expect(
            screen.getByText('Đang phân tích CV của bạn...').parentElement
                ?.parentElement,
        ).toHaveAttribute('aria-busy', 'true');
        expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    });

    it('renders latest completed summary after reload', () => {
        mocks.latest.mockReturnValue(latestState({ data: completed }));
        render(<CvAnalysisSection cv={cv} />);
        expect(screen.getByText('78/100')).toBeVisible();
        expect(screen.getByText('Backend Developer')).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Phân tích lại' }),
        ).toBeEnabled();
    });

    it('links the completed summary to the dedicated analysis report', () => {
        mocks.latest.mockReturnValue(
            latestState({
                data: {
                    ...completed,
                    extractedSkills: [
                        {
                            name: 'NestJS',
                            category: 'Backend',
                            evidence: 'Dự án Interviewly',
                        },
                    ],
                    strengths: [
                        {
                            title: 'Nền tảng kỹ thuật tốt',
                            description: 'Có kinh nghiệm xây dựng API.',
                            evidence: 'Dự án Interviewly',
                        },
                    ],
                    potentialQuestions: [
                        {
                            question:
                                'Bạn đã bảo vệ refresh token như thế nào?',
                            reason: 'Đánh giá kiến thức bảo mật.',
                            basedOn: 'JWT authentication',
                        },
                    ],
                    suggestions: [
                        {
                            title: 'Bổ sung số liệu',
                            description: 'Định lượng tác động của dự án.',
                            priority: 'HIGH',
                        },
                    ],
                },
            }),
        );

        render(<CvAnalysisSection cv={cv} />);

        expect(
            screen.getByRole('link', { name: /Xem phân tích đầy đủ/ }),
        ).toHaveAttribute('href', `/cv/${cv.id}/analysis`);
        expect(screen.queryByText('NestJS')).not.toBeInTheDocument();
    });

    it('keeps the previous completed result visible during re-analysis', () => {
        mocks.latest.mockReturnValue(latestState({ data: completed }));
        mocks.analyze.mockReturnValue(mutationState({ isPending: true }));
        render(<CvAnalysisSection cv={cv} />);
        expect(screen.getByText('78/100')).toBeVisible();
        expect(
            screen.getByText(/Kết quả gần nhất vẫn được giữ lại/),
        ).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Đang phân tích lại...' }),
        ).toBeDisabled();
    });

    it('preserves the previous result when re-analysis fails', async () => {
        mocks.latest.mockReturnValue(latestState({ data: completed }));
        mocks.mutateAsync.mockRejectedValue(
            new ApiError('raw provider secret', 'AI_TIMEOUT', 504),
        );
        render(<CvAnalysisSection cv={cv} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích lại' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Xác nhận phân tích lại' }),
        );
        await waitFor(() => expect(mocks.errorToast).toHaveBeenCalled());
        expect(screen.getByText('78/100')).toBeVisible();
        expect(JSON.stringify(mocks.errorToast.mock.calls)).not.toContain(
            'raw provider secret',
        );
    });

    it('shows a safe inline retry state when the first analysis fails', async () => {
        mocks.mutateAsync.mockRejectedValue(
            new ApiError('raw Gemini payload', 'AI_PROVIDER_ERROR', 502),
        );
        render(<CvAnalysisSection cv={cv} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích CV' }),
        );

        expect(
            await screen.findByText('Chưa thể phân tích CV này'),
        ).toBeVisible();
        expect(screen.getByRole('button', { name: 'Thử lại' })).toBeEnabled();
        expect(document.body.textContent).not.toContain('raw Gemini payload');
    });

    it('handles an already-processing conflict without exposing raw errors', async () => {
        mocks.mutateAsync.mockRejectedValue(
            new ApiError(
                'database constraint details',
                'CV_ANALYSIS_ALREADY_PROCESSING',
                409,
            ),
        );
        render(<CvAnalysisSection cv={cv} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích CV' }),
        );

        expect(
            await screen.findByText('CV này đang được phân tích.'),
        ).toBeVisible();
        expect(document.body.textContent).not.toContain(
            'database constraint details',
        );
    });

    it('isolates latest-query failure and retries only this section', async () => {
        mocks.latest.mockReturnValue(
            latestState({ isError: true, error: new Error('network') }),
        );
        render(<CvAnalysisSection cv={cv} />);
        expect(
            screen.getByText('Chưa thể tải trạng thái phân tích'),
        ).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
        expect(mocks.refetch).toHaveBeenCalledOnce();
    });

    it.each([
        [
            { ...cv, processingStatus: 'PROCESSING' as const },
            'CV cần hoàn tất xử lý',
        ],
        [{ ...cv, extractedText: '   ' }, 'CV chưa có nội dung văn bản'],
    ])(
        'does not expose Analyze for an unavailable CV',
        (unavailableCv, text) => {
            render(<CvAnalysisSection cv={unavailableCv} />);
            expect(screen.getByText(new RegExp(text))).toBeVisible();
            expect(
                screen.queryByRole('button', { name: 'Phân tích CV' }),
            ).not.toBeInTheDocument();
        },
    );

    it('uses a local skeleton without hiding the CV page', () => {
        mocks.latest.mockReturnValue(latestState({ isPending: true }));
        render(<CvAnalysisSection cv={cv} />);
        expect(
            screen.getByLabelText('Đang tải trạng thái phân tích CV'),
        ).toHaveAttribute('aria-busy', 'true');
    });
});
