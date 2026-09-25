import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JdAnalysisResultPage } from './jd-analysis-result-page';

const mocks = vi.hoisted(() => ({
    useDetail: vi.fn(),
    useLatest: vi.fn(),
    useHistory: vi.fn(),
    analyze: vi.fn(),
    analysisPending: false,
}));

vi.mock('@/hooks/job-description', () => ({
    useJobDescription: mocks.useDetail,
    useLatestJdAnalysis: mocks.useLatest,
    useJdAnalysisHistory: mocks.useHistory,
    useAnalyzeJobDescription: () => ({
        mutateAsync: mocks.analyze,
        isPending: mocks.analysisPending,
    }),
}));

const analysis = {
    id: 'analysis-success',
    jobDescriptionId: 'jd-1',
    status: 'COMPLETED',
    detectedRole: 'Frontend Developer',
    seniority: 'Junior',
    summary: 'Vai trò tập trung xây dựng ứng dụng web hiện đại.',
    requiredSkills: ['React', 'TypeScript'],
    preferredSkills: ['Next.js'],
    responsibilities: ['Phát triển giao diện người dùng'],
    requirements: ['Có kinh nghiệm làm việc với React'],
    keywords: ['Frontend', 'Web performance'],
    interviewFocus: ['React fundamentals'],
    insights: ['Chuẩn bị thảo luận về state management'],
    modelProvider: 'google',
    modelName: 'gemini',
    promptVersion: 'v1',
    createdAt: '2026-09-21T10:00:00.000Z',
    completedAt: '2026-09-21T10:01:00.000Z',
};

describe('JdAnalysisResultPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.analysisPending = false;
        mocks.useDetail.mockReturnValue({
            data: {
                id: 'jd-1',
                title: 'Frontend Developer',
                company: 'Interviewly',
                content: 'Source JD',
                createdAt: '2026-09-20T08:00:00.000Z',
                updatedAt: '2026-09-21T09:00:00.000Z',
            },
            isPending: false,
        });
        mocks.useLatest.mockReturnValue({
            data: analysis,
            isPending: false,
        });
        mocks.useHistory.mockReturnValue({
            data: {
                items: [
                    {
                        id: 'analysis-failed',
                        jobDescriptionId: 'jd-1',
                        status: 'FAILED',
                        detectedRole: null,
                        seniority: null,
                        createdAt: '2026-09-22T10:00:00.000Z',
                        completedAt: null,
                    },
                    {
                        id: 'analysis-success',
                        jobDescriptionId: 'jd-1',
                        status: 'COMPLETED',
                        detectedRole: 'Frontend Developer',
                        seniority: 'Junior',
                        createdAt: '2026-09-21T10:00:00.000Z',
                        completedAt: '2026-09-21T10:01:00.000Z',
                    },
                ],
                pagination: {
                    page: 1,
                    limit: 5,
                    total: 7,
                    totalPages: 2,
                },
            },
            isPending: false,
            isError: false,
            refetch: vi.fn(),
        });
        mocks.analyze.mockResolvedValue(analysis);
    });

    it('renders actual structured analysis fields and navigation', () => {
        render(<JdAnalysisResultPage id="jd-1" />);

        expect(screen.getByText(analysis.summary)).toBeVisible();
        expect(
            screen.getAllByText('Frontend Developer').length,
        ).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Junior')).toBeVisible();
        expect(screen.getByText('React')).toBeVisible();
        expect(screen.getByText('Next.js')).toBeVisible();
        expect(
            screen.getByText('Phát triển giao diện người dùng'),
        ).toBeVisible();
        expect(screen.getByText('React fundamentals')).toBeVisible();
        expect(
            screen.getByRole('link', { name: 'Frontend Developer' }),
        ).toHaveAttribute('href', '/job-descriptions/jd-1');
        expect(screen.queryByText(/match score/i)).not.toBeInTheDocument();
    });

    it('omits optional sections when their structured fields are empty', () => {
        mocks.useLatest.mockReturnValue({
            data: {
                ...analysis,
                preferredSkills: [],
                keywords: [],
                insights: [],
                interviewFocus: [],
            },
            isPending: false,
        });

        render(<JdAnalysisResultPage id="jd-1" />);

        expect(screen.queryByText('Kỹ năng ưu tiên')).not.toBeInTheDocument();
        expect(screen.queryByText('Từ khóa quan trọng')).not.toBeInTheDocument();
        expect(
            screen.queryByText('Gợi ý chuẩn bị phỏng vấn'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText('Trọng tâm phỏng vấn'),
        ).not.toBeInTheDocument();
    });

    it('keeps the latest successful result when a newer history attempt failed', () => {
        render(<JdAnalysisResultPage id="jd-1" />);

        expect(screen.getByText(analysis.summary)).toBeVisible();
        expect(screen.getByText('Thất bại')).toBeVisible();
        expect(screen.getAllByText('Hoàn tất').length).toBeGreaterThan(0);
    });

    it('keeps old analysis visible while re-analysis is pending', async () => {
        mocks.analysisPending = true;
        render(<JdAnalysisResultPage id="jd-1" />);

        expect(screen.getByText(analysis.summary)).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Đang phân tích...' }),
        ).toBeDisabled();
    });

    it('runs re-analysis from the header action', async () => {
        render(<JdAnalysisResultPage id="jd-1" />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích lại' }),
        );
        expect(mocks.analyze).toHaveBeenCalledTimes(1);
    });

    it('paginates analysis history with five items per page', async () => {
        render(<JdAnalysisResultPage id="jd-1" />);

        expect(mocks.useHistory).toHaveBeenCalledWith('jd-1', {
            page: 1,
            limit: 5,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Trang sau' }),
        );
        expect(mocks.useHistory).toHaveBeenLastCalledWith('jd-1', {
            page: 2,
            limit: 5,
        });
    });

    it('shows an intentional state when there is no successful analysis', () => {
        mocks.useLatest.mockReturnValue({ data: null, isPending: false });

        render(<JdAnalysisResultPage id="jd-1" />);

        expect(
            screen.getByText('JD chưa có kết quả phân tích hoàn tất'),
        ).toBeVisible();
        expect(screen.queryByText('Thông tin vai trò')).not.toBeInTheDocument();
    });
});
