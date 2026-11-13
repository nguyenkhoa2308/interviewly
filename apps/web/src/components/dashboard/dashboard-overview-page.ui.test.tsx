import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DashboardSummary } from '@/types/dashboard';
import { DashboardOverviewPage } from './dashboard-overview-page';

const mocks = vi.hoisted(() => ({
    useSummary: vi.fn(),
    useMe: vi.fn(),
    refetch: vi.fn(),
}));

const unchangedTrend = {
    currentPeriod: 0,
    previousPeriod: 0,
    percentageChange: 0,
    direction: 'UNCHANGED' as const,
};

vi.mock('@/hooks/dashboard', () => ({
    useDashboardSummary: mocks.useSummary,
}));

vi.mock('@/hooks/auth/use-me', () => ({
    useMe: mocks.useMe,
}));

const populatedSummary: DashboardSummary = {
    overview: {
        cvs: {
            total: 12,
            ready: 8,
            trend: {
                currentPeriod: 3,
                previousPeriod: 2,
                percentageChange: 50,
                direction: 'UP',
            },
        },
        jobDescriptions: {
            total: 9,
            analyzed: 7,
            trend: unchangedTrend,
        },
        matches: {
            total: 6,
            completed: 5,
            averageScore: 82.5,
            trend: {
                currentPeriod: 4,
                previousPeriod: 5,
                percentageChange: -20,
                direction: 'DOWN',
            },
        },
    },
    interviewSummary: {
        total: 10,
        draft: 1,
        ready: 2,
        inProgress: 1,
        completed: 4,
        averageScore: 7.25,
        trend: {
            currentPeriod: 2,
            previousPeriod: 0,
            percentageChange: 100,
            direction: 'UP',
        },
    },
    performanceHistory: [],
    recentInterviews: [],
    recentActivity: [],
};

const summaryWithRecent: DashboardSummary = {
    ...populatedSummary,
    performanceHistory: [],
    recentInterviews: [
        {
            id: 'interview-1',
            targetRole: 'Frontend Developer',
            interviewType: 'TECHNICAL',
            status: 'COMPLETED',
            score: 8.5,
            createdAt: '2026-11-08T02:00:00.000Z',
            completedAt: '2026-11-09T03:30:00.000Z',
            href: '/interviews/interview-1/report',
        },
        {
            id: 'interview-2',
            targetRole: 'Product Engineer',
            interviewType: 'BEHAVIORAL',
            status: 'READY',
            score: null,
            createdAt: '2026-11-07T02:00:00.000Z',
            completedAt: null,
            href: '/interviews/interview-2',
        },
    ],
    recentActivity: [
        {
            id: 'CV_ANALYSIS_COMPLETED:cv-1',
            type: 'CV_ANALYSIS_COMPLETED',
            title: 'Đã phân tích CV',
            description: 'CV Frontend Developer',
            occurredAt: '2026-11-09T03:30:00.000Z',
            href: '/cv/cv-1/analysis',
        },
        {
            id: 'INTERVIEW_CREATED:interview-2',
            type: 'INTERVIEW_CREATED',
            title: 'Đã tạo buổi phỏng vấn',
            description: null,
            occurredAt: '2026-11-07T02:00:00.000Z',
            href: null,
        },
    ],
};

const emptySummary: DashboardSummary = {
    overview: {
        cvs: { total: 0, ready: 0, trend: unchangedTrend },
        jobDescriptions: { total: 0, analyzed: 0, trend: unchangedTrend },
        matches: {
            total: 0,
            completed: 0,
            averageScore: null,
            trend: unchangedTrend,
        },
    },
    interviewSummary: {
        total: 0,
        draft: 0,
        ready: 0,
        inProgress: 0,
        completed: 0,
        averageScore: null,
        trend: unchangedTrend,
    },
    performanceHistory: [],
    recentInterviews: [],
    recentActivity: [],
};

function success(data: DashboardSummary) {
    return {
        data,
        isPending: false,
        isError: false,
        refetch: mocks.refetch,
    };
}

describe('DashboardOverviewPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useSummary.mockReturnValue(success(populatedSummary));
        mocks.useMe.mockReturnValue({
            data: { fullName: 'Nguyễn Đức Khoa' },
        });
    });

    it('renders real summary values, score scales and navigation', () => {
        render(<DashboardOverviewPage />);

        expect(
            screen.getByRole('heading', {
                name: 'Chào mừng quay lại, Khoa!',
            }),
        ).toBeVisible();
        expect(
            screen.getByRole('link', { name: 'Bắt đầu luyện tập' }),
        ).toHaveAttribute('href', '/interviews/new');
        expect(
            screen
                .getAllByRole('link', { name: 'Tạo buổi phỏng vấn' })
                .every(
                    (link) => link.getAttribute('href') === '/interviews/new',
                ),
        ).toBe(true);
        expect(screen.getAllByText('so với 30 ngày trước')).toHaveLength(4);
        expect(screen.getByText('50%')).toBeVisible();
        expect(screen.getAllByText('20%').length).toBeGreaterThan(0);
        expect(screen.getByText('100%')).toBeVisible();
        expect(screen.getByText('0%')).toBeVisible();
        expect(
            screen.getByRole('link', { name: /CV đã tạo: 12/ }),
        ).toHaveAttribute('href', '/cv');
    });

    it('renders stable skeletons while loading', () => {
        mocks.useSummary.mockReturnValue({
            data: undefined,
            isPending: true,
            isError: false,
            refetch: mocks.refetch,
        });

        render(<DashboardOverviewPage />);

        expect(screen.getByLabelText('Đang tải Dashboard')).toBeVisible();
        expect(
            screen.queryByRole('heading', { name: /Chào mừng quay lại/ }),
        ).not.toBeInTheDocument();
    });

    it('requests and labels the selected Dashboard period', async () => {
        const user = userEvent.setup();
        render(<DashboardOverviewPage />);

        expect(mocks.useSummary).toHaveBeenCalledWith('30d');
        expect(
            screen.getByRole('combobox', {
                name: 'Khoảng thời gian Dashboard',
            }),
        ).toHaveTextContent('30 ngày qua');

        await user.click(
            screen.getByRole('combobox', {
                name: 'Khoảng thời gian Dashboard',
            }),
        );
        await user.click(screen.getByRole('option', { name: '7 ngày qua' }));

        expect(mocks.useSummary).toHaveBeenLastCalledWith('7d');
        expect(screen.getAllByText('so với 7 ngày trước')).toHaveLength(4);
    });

    it('keeps the Dashboard layout for an empty filtered period', () => {
        mocks.useSummary.mockReturnValue(success(emptySummary));

        render(<DashboardOverviewPage />);

        expect(screen.queryByText('Thêm CV đầu tiên')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /CV đã tạo: 0/ })).toBeVisible();
        expect(
            screen.queryByText('Chưa có điểm trung bình'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/Điểm đánh giá trung bình/),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: /Tổng 0 buổi phỏng vấn/ }),
        ).toBeVisible();
    });

    it('does not show the full-empty prompt for partially populated data', () => {
        mocks.useSummary.mockReturnValue(
            success({
                ...emptySummary,
                overview: {
                    ...emptySummary.overview,
                    cvs: {
                        total: 1,
                        ready: 0,
                        trend: unchangedTrend,
                    },
                },
            }),
        );

        render(<DashboardOverviewPage />);

        expect(
            screen.queryByRole('heading', {
                name: 'Bắt đầu xây dựng hồ sơ ứng tuyển',
            }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /CV đã tạo: 1/ })).toBeVisible();
    });

    it('shows an error state and retries without rendering zero metrics', async () => {
        mocks.useSummary.mockReturnValue({
            data: undefined,
            isPending: false,
            isError: true,
            refetch: mocks.refetch,
        });

        render(<DashboardOverviewPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

        expect(screen.getByRole('alert')).toBeVisible();
        expect(mocks.refetch).toHaveBeenCalledOnce();
        expect(screen.queryByText('CV đã tạo')).not.toBeInTheDocument();
    });

    it('keeps planning and cancelled interviews outside displayed buckets', () => {
        render(<DashboardOverviewPage />);

        expect(screen.getByText('Khác')).toBeVisible();
        expect(screen.getAllByText('20%').length).toBeGreaterThan(0);
        expect(
            screen.getByRole('img', {
                name: /10 buổi phỏng vấn.*2 trạng thái khác/,
            }),
        ).toBeVisible();
    });

    it('renders recent interviews with contract navigation, status and nullable scores', () => {
        mocks.useSummary.mockReturnValue(success(summaryWithRecent));
        render(<DashboardOverviewPage />);

        expect(
            screen.getByRole('heading', { name: 'Phỏng vấn gần đây' }),
        ).toBeVisible();
        expect(screen.getByText('Kỹ thuật')).toBeVisible();
        expect(screen.getByText('Đã hoàn thành')).toBeVisible();
        expect(screen.getAllByText('Sẵn sàng')).toHaveLength(2);
        expect(screen.getByText('8,5')).toBeVisible();
        expect(screen.getAllByText('/10').length).toBeGreaterThan(0);
        expect(screen.queryByText('0/10')).not.toBeInTheDocument();
        expect(
            document.querySelector(
                '[data-dashboard-icon="interview-TECHNICAL-Frontend Developer"]',
            ),
        ).toBeInTheDocument();
        expect(
            document.querySelector(
                '[data-dashboard-icon="interview-BEHAVIORAL-Product Engineer"]',
            ),
        ).toBeInTheDocument();
        expect(
            screen
                .getAllByRole('link', { name: /Frontend Developer/ })
                .find(
                    (link) =>
                        link.getAttribute('href') ===
                        '/interviews/interview-1/report',
                ),
        ).toBeDefined();
        expect(
            screen.getByRole('link', { name: /Product Engineer/ }),
        ).toHaveAttribute('href', '/interviews/interview-2');
        expect(
            screen.getAllByRole('link', { name: 'Xem tất cả' }).at(-1),
        ).toHaveAttribute('href', '/interviews');
    });

    it('renders recent activity with Vietnamese timestamps and only valid links', () => {
        mocks.useSummary.mockReturnValue(success(summaryWithRecent));
        render(<DashboardOverviewPage />);

        expect(
            screen.getByRole('heading', { name: 'Hoạt động gần đây' }),
        ).toBeVisible();
        expect(screen.getByText('CV Frontend Developer')).toBeVisible();
        expect(screen.getAllByText(/09\/11\/2026/).length).toBeGreaterThan(0);
        expect(
            screen.getByRole('link', { name: /Đã phân tích CV/ }),
        ).toHaveAttribute('href', '/cv/cv-1/analysis');
        expect(screen.getByText('Đã tạo buổi phỏng vấn')).toBeVisible();
        expect(
            document.querySelector(
                '[data-dashboard-icon="activity-CV_ANALYSIS_COMPLETED"]',
            ),
        ).toBeInTheDocument();
        expect(
            document.querySelector(
                '[data-dashboard-icon="activity-INTERVIEW_CREATED"]',
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /Đã tạo buổi phỏng vấn/ }),
        ).not.toBeInTheDocument();
    });

    it('uses a code icon for a frontend role even when the interview type is full', () => {
        mocks.useSummary.mockReturnValue(
            success({
                ...populatedSummary,
                recentInterviews: [
                    {
                        ...summaryWithRecent.recentInterviews[0],
                        interviewType: 'FULL',
                    },
                ],
            }),
        );

        render(<DashboardOverviewPage />);

        expect(
            document.querySelector(
                '[data-dashboard-icon="interview-FULL-Frontend Developer"][data-dashboard-glyph="CodeXml"]',
            ),
        ).toBeInTheDocument();
    });

    it('renders compact independent empty states without fake rows', () => {
        mocks.useSummary.mockReturnValue(success(populatedSummary));
        render(<DashboardOverviewPage />);

        expect(
            screen.getByText('Chưa có buổi phỏng vấn gần đây'),
        ).toBeVisible();
        expect(screen.getByText('Chưa có hoạt động gần đây')).toBeVisible();
        expect(
            screen
                .getAllByRole('link', { name: 'Tạo buổi phỏng vấn' })
                .every(
                    (link) => link.getAttribute('href') === '/interviews/new',
                ),
        ).toBe(true);
        expect(
            screen.queryByText('Frontend Developer'),
        ).not.toBeInTheDocument();
    });

    it('limits summary lists and sorts visible activity without mutating the response', () => {
        const interviews: DashboardSummary['recentInterviews'] = Array.from(
            { length: 5 },
            (_, index) => ({
                id: `interview-${index + 1}`,
                targetRole: `Vai trò ${index + 1}`,
                interviewType: 'TECHNICAL',
                status: 'READY',
                score: null,
                createdAt: `2026-11-0${index + 1}T02:00:00.000Z`,
                completedAt: null,
                href: `/interviews/interview-${index + 1}`,
            }),
        );
        const activities: DashboardSummary['recentActivity'] = [
            3, 1, 7, 2, 6, 4, 5,
        ].map((day) => ({
            id: `CV_CREATED:${day}`,
            type: 'CV_CREATED',
            title: `Hoạt động ngày ${day}`,
            description: null,
            occurredAt: `2026-11-0${day}T02:00:00.000Z`,
            href: null,
        }));
        const originalOrder = activities.map((item) => item.id);

        mocks.useSummary.mockReturnValue(
            success({
                ...populatedSummary,
                recentInterviews: interviews,
                recentActivity: activities,
            }),
        );
        render(<DashboardOverviewPage />);

        expect(screen.getByText('Vai trò 1')).toBeVisible();
        expect(screen.getByText('Vai trò 2')).toBeVisible();
        expect(screen.getByText('Vai trò 3')).toBeVisible();
        expect(screen.getByText('Vai trò 4')).toBeVisible();
        expect(screen.queryByText('Vai trò 5')).not.toBeInTheDocument();
        expect(screen.getByText('Hoạt động ngày 7')).toBeVisible();
        expect(screen.getByText('Hoạt động ngày 5')).toBeVisible();
        expect(screen.getByText('Hoạt động ngày 4')).toBeVisible();
        expect(screen.getByText('Hoạt động ngày 3')).toBeVisible();
        expect(screen.queryByText('Hoạt động ngày 2')).not.toBeInTheDocument();
        expect(activities.map((item) => item.id)).toEqual(originalOrder);
    });
});
