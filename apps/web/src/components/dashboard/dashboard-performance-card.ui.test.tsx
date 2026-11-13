import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type {
    DashboardPerformancePoint,
    DashboardSummary,
} from '@/types/dashboard';
import {
    DashboardPerformanceCard,
    getRecentScorePoints,
} from './dashboard-performance-card';

const interviewSummary: DashboardSummary['interviewSummary'] = {
    total: 8,
    draft: 1,
    ready: 1,
    inProgress: 1,
    completed: 5,
    averageScore: 7.25,
    trend: {
        currentPeriod: 0,
        previousPeriod: 0,
        percentageChange: 0,
        direction: 'UNCHANGED',
    },
};

function interview(
    id: string,
    score: number,
    completedAt: string,
): DashboardPerformancePoint {
    return {
        id,
        targetRole: `Role ${id}`,
        score,
        completedAt,
    };
}

describe('DashboardPerformanceCard', () => {
    it('renders the period-aware header without fabricating a chart', () => {
        render(
            <DashboardPerformanceCard
                periodDays={30}
                interviewSummary={interviewSummary}
                performanceHistory={[]}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Tổng quan hiệu suất' }),
        ).toBeVisible();
        expect(
            screen.getByText('Hiệu quả luyện phỏng vấn trong 30 ngày qua.'),
        ).toBeVisible();
        expect(screen.getByText('Điểm trung bình')).toBeVisible();
        expect(screen.getByText('7,25/10')).toBeVisible();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('sorts performance history chronologically', () => {
        const points = getRecentScorePoints([
            interview('new', 9, '2026-11-09T00:00:00.000Z'),
            interview('old', 6.5, '2026-11-01T00:00:00.000Z'),
            interview('middle', 7, '2026-11-05T00:00:00.000Z'),
        ]);

        expect(points.map((point) => point.id)).toEqual([
            'old',
            'middle',
            'new',
        ]);
    });

    it('renders a recent-score chart for three reliable observations', () => {
        const recent = [
            interview('3', 8, '2026-11-09T00:00:00.000Z'),
            interview('1', 6, '2026-11-01T00:00:00.000Z'),
            interview('2', 7, '2026-11-05T00:00:00.000Z'),
        ];

        render(
            <DashboardPerformanceCard
                periodDays={30}
                interviewSummary={interviewSummary}
                performanceHistory={recent}
            />,
        );

        expect(
            screen.getByRole('heading', {
                name: 'Tổng quan hiệu suất',
            }),
        ).toBeVisible();
        expect(
            screen.getByRole('img', {
                name: /Role 1 6\/10, Role 2 7\/10, Role 3 8\/10/,
            }),
        ).toBeVisible();
        expect(
            screen.getByText('Hiệu quả luyện phỏng vấn trong 30 ngày qua.'),
        ).toBeVisible();
    });

    it('renders a compact chart for two scored observations', () => {
        render(
            <DashboardPerformanceCard
                periodDays={30}
                interviewSummary={interviewSummary}
                performanceHistory={[
                    interview('1', 7, '2026-11-01T00:00:00.000Z'),
                    interview('2', 8, '2026-11-02T00:00:00.000Z'),
                ]}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Tổng quan hiệu suất' }),
        ).toBeVisible();
        expect(
            screen.getByRole('img', {
                name: /Role 1 7\/10, Role 2 8\/10/,
            }),
        ).toBeVisible();
    });

    it('renders a one-point chart for a single scored interview', () => {
        render(
            <DashboardPerformanceCard
                periodDays={7}
                interviewSummary={interviewSummary}
                performanceHistory={[
                    interview('single', 8.5, '2026-11-09T00:00:00.000Z'),
                ]}
            />,
        );

        expect(
            screen.getByRole('img', {
                name: /Role single 8,5\/10/,
            }),
        ).toBeVisible();
    });

    it('renders purposeful no-evaluation semantics for null scores', () => {
        render(
            <DashboardPerformanceCard
                periodDays={30}
                interviewSummary={{
                    ...interviewSummary,
                    completed: 0,
                    averageScore: null,
                }}
                performanceHistory={[]}
            />,
        );

        expect(screen.getByText('Chưa có dữ liệu đánh giá')).toBeVisible();
        expect(screen.queryByText('0/10')).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Bắt đầu phỏng vấn' }),
        ).toHaveAttribute('href', '/interviews/new');
    });

    it('does not show a non-interactive metric selector', () => {
        render(
            <DashboardPerformanceCard
                periodDays={30}
                interviewSummary={interviewSummary}
                performanceHistory={[]}
            />,
        );

        expect(screen.queryByText('Điểm đánh giá')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('combobox', { name: /Điểm đánh giá/ }),
        ).not.toBeInTheDocument();
    });
});
