import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobDescriptionDetailPage } from './job-description-detail-page';

const mocks = vi.hoisted(() => ({
    useDetail: vi.fn(),
    useLatest: vi.fn(),
    analyze: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/hooks/job-description', () => ({
    useJobDescription: mocks.useDetail,
    useLatestJdAnalysis: mocks.useLatest,
    useAnalyzeJobDescription: () => ({
        mutateAsync: mocks.analyze,
        isPending: false,
    }),
    useUpdateJobDescription: () => ({
        mutateAsync: mocks.update,
        isPending: false,
    }),
    useDeleteJobDescription: () => ({
        mutateAsync: mocks.remove,
        isPending: false,
    }),
}));

const jd = {
    id: 'jd-1',
    title: 'Frontend Developer',
    company: 'Interviewly',
    content: 'Mô tả công việc:\n- Xây dựng giao diện React\nYêu cầu ứng viên:\n- Thành thạo TypeScript',
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-21T09:00:00.000Z',
};

const analysis = {
    id: 'analysis-1',
    jobDescriptionId: 'jd-1',
    status: 'COMPLETED',
    detectedRole: 'Frontend Developer',
    seniority: 'Junior',
    summary: null,
    requiredSkills: ['React', 'TypeScript'],
    preferredSkills: [],
    responsibilities: [],
    requirements: [],
    keywords: [],
    interviewFocus: ['React fundamentals', 'State management'],
    insights: [],
    modelProvider: 'google',
    modelName: 'gemini',
    promptVersion: 'v1',
    createdAt: '2026-09-21T10:00:00.000Z',
    completedAt: '2026-09-21T10:01:00.000Z',
};

describe('JobDescriptionDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useDetail.mockReturnValue({
            data: jd,
            isPending: false,
            isError: false,
            refetch: vi.fn(),
        });
        mocks.useLatest.mockReturnValue({
            data: analysis,
            isPending: false,
            isError: false,
        });
        mocks.analyze.mockResolvedValue(analysis);
        mocks.update.mockResolvedValue(jd);
        mocks.remove.mockResolvedValue({ id: 'jd-1', deleted: true });
    });

    it('renders real JD source data and the latest successful analysis preview', () => {
        render(<JobDescriptionDetailPage id="jd-1" />);

        expect(
            screen.getByRole('heading', { name: 'Frontend Developer' }),
        ).toBeVisible();
        expect(screen.getAllByText('Interviewly').length).toBeGreaterThan(0);
        expect(screen.getByText('Xây dựng giao diện React')).toBeVisible();
        expect(screen.getByText('Vai trò nhận diện')).toBeVisible();
        expect(screen.getByText('Junior')).toBeVisible();
        expect(screen.getByText('React')).toBeVisible();
        expect(screen.getByText('React fundamentals')).toBeVisible();
        expect(
            screen.getByRole('link', { name: /Xem toàn bộ kết quả/ }),
        ).toHaveAttribute('href', '/job-descriptions/jd-1/analysis');
        expect(screen.queryByText(/% match/i)).not.toBeInTheDocument();
    });

    it('shows one intentional empty state when no successful analysis exists', () => {
        mocks.useLatest.mockReturnValue({
            data: null,
            isPending: false,
            isError: false,
        });

        render(<JobDescriptionDetailPage id="jd-1" />);

        expect(screen.getByText('Chưa có bản phân tích')).toBeVisible();
        expect(screen.queryByText('Yêu cầu chính')).not.toBeInTheDocument();
        expect(
            screen.queryByText('Trọng tâm phỏng vấn'),
        ).not.toBeInTheDocument();
    });

    it('keeps the successful preview visible and runs Analyze Again', async () => {
        render(<JobDescriptionDetailPage id="jd-1" />);

        expect(screen.getByText('React fundamentals')).toBeVisible();
        await userEvent.click(
            screen.getByRole('button', { name: 'Phân tích lại' }),
        );
        expect(mocks.analyze).toHaveBeenCalledTimes(1);
        expect(screen.getByText('React fundamentals')).toBeVisible();
    });

    it('omits optional preview cards when their arrays are empty', () => {
        mocks.useLatest.mockReturnValue({
            data: {
                ...analysis,
                requiredSkills: [],
                interviewFocus: [],
            },
            isPending: false,
            isError: false,
        });

        render(<JobDescriptionDetailPage id="jd-1" />);

        expect(screen.getByText('Tổng quan phân tích AI')).toBeVisible();
        expect(screen.queryByText('Yêu cầu chính')).not.toBeInTheDocument();
        expect(
            screen.queryByText('Trọng tâm phỏng vấn'),
        ).not.toBeInTheDocument();
    });
});
