'use client';

import Link from 'next/link';
import { BarChart3, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type {
    DashboardPerformancePoint,
    DashboardSummary,
} from '@/types/dashboard';

const scoreFormatter = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
});

export interface RecentScorePoint {
    id: string;
    label: string;
    score: number;
    completedAt: string;
}

export function getRecentScorePoints(
    history: DashboardPerformancePoint[],
): RecentScorePoint[] {
    return history
        .map((item) => ({
            id: item.id,
            label: item.targetRole,
            score: item.score,
            completedAt: item.completedAt,
        }))
        .sort(
            (left, right) =>
                left.completedAt.localeCompare(right.completedAt) ||
                left.id.localeCompare(right.id),
        );
}

export function DashboardPerformanceCard({
    interviewSummary,
    performanceHistory,
    periodDays,
}: {
    interviewSummary: DashboardSummary['interviewSummary'];
    performanceHistory: DashboardPerformancePoint[];
    periodDays: number;
}) {
    const points = getRecentScorePoints(performanceHistory);
    const showsChart = points.length > 0;
    const hasEvaluation =
        interviewSummary.averageScore !== null || points.length > 0;

    return (
        <section
            className="dashboard-card-surface min-h-[270px] rounded-2xl p-5"
            aria-labelledby="performance-heading"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="text-primary flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                        <BarChart3 className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                        <h2
                            id="performance-heading"
                            className="text-xl font-black tracking-tight text-slate-950"
                        >
                            Tổng quan hiệu suất
                        </h2>
                        <p className="mt-0.5 text-sm font-semibold text-slate-500">
                            Hiệu quả luyện phỏng vấn trong {periodDays} ngày
                            qua.
                        </p>
                    </div>
                </div>
                {interviewSummary.averageScore !== null && (
                    <div className="shrink-0 text-right">
                        <span className="block text-xs font-bold text-slate-500">
                            Điểm trung bình
                        </span>
                        <span className="mt-1 block text-xl font-black text-violet-700 tabular-nums">
                            {scoreFormatter.format(interviewSummary.averageScore)}/10
                        </span>
                    </div>
                )}
            </div>

            {hasEvaluation ? (
                showsChart ? (
                    <RecentScoreChart points={points} />
                ) : (
                    <div className="mt-7 flex min-h-36 items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50/30 px-4 text-center">
                        <div>
                            <p className="text-sm font-black text-slate-900">
                                Chưa có mốc điểm trong khoảng đã chọn
                            </p>
                            <p className="mt-1 text-xs leading-5 font-semibold text-slate-500">
                                Biểu đồ sẽ xuất hiện ngay khi có một buổi phỏng
                                vấn được đánh giá.
                            </p>
                        </div>
                    </div>
                )
            ) : (
                <div className="mt-5 flex flex-col items-start gap-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4 sm:flex-row sm:items-center">
                    <span className="text-primary flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                        <BarChart3 className="size-4.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-slate-900">
                            Chưa có dữ liệu đánh giá
                        </h3>
                        <p className="mt-0.5 text-xs leading-5 font-semibold text-slate-500">
                            Hoàn thành một buổi phỏng vấn để bắt đầu theo dõi
                            hiệu suất.
                        </p>
                    </div>
                    <Button
                        asChild
                        variant="outline"
                        className="h-9 shrink-0 rounded-sm border-violet-200 text-xs font-extrabold"
                    >
                        <Link href="/interviews/new">
                            <Video className="size-4" aria-hidden="true" />
                            Bắt đầu phỏng vấn
                        </Link>
                    </Button>
                </div>
            )}
        </section>
    );
}

function RecentScoreChart({ points }: { points: RecentScorePoint[] }) {
    const width = 680;
    const height = 190;
    const padding = { top: 22, right: 12, bottom: 34, left: 34 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const chartPoints = points.map((point, index) => {
        const xRatio = points.length === 1 ? 0.5 : index / (points.length - 1);

        return {
            ...point,
            x: padding.left + xRatio * plotWidth,
            y: padding.top + ((10 - point.score) / 10) * plotHeight,
        };
    });
    const linePoints = chartPoints.map((point) => `${point.x},${point.y}`);
    const first = chartPoints[0];
    const last = chartPoints.at(-1)!;
    const areaPath = `M ${first.x} ${padding.top + plotHeight} L ${linePoints.join(' L ')} L ${last.x} ${padding.top + plotHeight} Z`;

    return (
        <div className="mt-4 overflow-hidden">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                className="h-44 w-full overflow-visible"
                role="img"
                aria-label={`Điểm các buổi phỏng vấn trong khoảng đã chọn theo thứ tự thời gian: ${points
                    .map(
                        (point) =>
                            `${point.label} ${scoreFormatter.format(point.score)}/10`,
                    )
                    .join(', ')}`}
            >
                <defs>
                    <linearGradient
                        id="dashboard-score-area"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor="#8b5cf6"
                            stopOpacity="0.24"
                        />
                        <stop
                            offset="100%"
                            stopColor="#8b5cf6"
                            stopOpacity="0.02"
                        />
                    </linearGradient>
                </defs>
                {[10, 8, 6, 4, 2, 0].map((value) => {
                    const y = padding.top + ((10 - value) / 10) * plotHeight;
                    return (
                        <g key={value}>
                            <line
                                x1={padding.left}
                                x2={width - padding.right}
                                y1={y}
                                y2={y}
                                stroke="#eef0f6"
                                strokeWidth="1"
                            />
                            <text
                                x={padding.left - 10}
                                y={y + 4}
                                textAnchor="end"
                                className="fill-slate-400 text-[11px] font-semibold"
                            >
                                {value}
                            </text>
                        </g>
                    );
                })}
                {points.length === 1 ? (
                    <line
                        x1={padding.left}
                        x2={width - padding.right}
                        y1={first.y}
                        y2={first.y}
                        stroke="#a78bfa"
                        strokeWidth="2"
                        strokeDasharray="6 6"
                    />
                ) : (
                    <>
                        <path d={areaPath} fill="url(#dashboard-score-area)" />
                        <polyline
                            points={linePoints.join(' ')}
                            fill="none"
                            stroke="#7c3aed"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </>
                )}
                {chartPoints.map((point) => (
                    <g key={point.id}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="white"
                            stroke="#7c3aed"
                            strokeWidth="2"
                        />
                        <text
                            x={point.x}
                            y={height - 10}
                            textAnchor="middle"
                            className="fill-slate-500 text-[11px] font-semibold"
                        >
                            {formatShortDate(point.completedAt)}
                        </text>
                    </g>
                ))}
                <g
                    transform={`translate(${Math.max(padding.left, last.x - 48)} ${Math.max(2, last.y - 30)})`}
                >
                    <rect width="48" height="23" rx="8" fill="#7c3aed" />
                    <text
                        x="24"
                        y="16"
                        textAnchor="middle"
                        className="fill-white text-[11px] font-extrabold"
                    >
                        {scoreFormatter.format(last.score)}/10
                    </text>
                </g>
            </svg>
        </div>
    );
}

function formatShortDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
    }).format(new Date(value));
}
