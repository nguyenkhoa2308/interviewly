'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type CSSProperties, type ElementType } from 'react';
import { AnimateIcon } from '@animate-ui/react/icons';
import {
    Activity,
    ArrowDown,
    ArrowUp,
    BriefcaseBusiness,
    CalendarPlus,
    CalendarDays,
    CheckCircle2,
    Code2,
    Database,
    FileCheck,
    FilePlus2,
    FileText,
    GitCompareArrows,
    Link2,
    ListChecks,
    Minus,
    Play,
    RotateCcw,
    Smartphone,
    Target,
    UserRound,
    Video,
} from 'lucide-react';

import { ArrowRight as AnimatedArrowRight } from '@/components/animate-ui/icons/arrow-right';
import { DashboardAnimatedIcon } from '@/components/dashboard/dashboard-animated-icon';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DashboardPerformanceCard } from '@/components/dashboard/dashboard-performance-card';
import { useMe } from '@/hooks/auth/use-me';
import { useDashboardSummary } from '@/hooks/dashboard';
import { cn } from '@/lib/utils';
import type {
    DashboardActivityItem,
    DashboardActivityType,
    DashboardInterviewStatus,
    DashboardInterviewType,
    DashboardRecentInterview,
    DashboardRange,
    DashboardSummary,
    DashboardTrend,
} from '@/types/dashboard';

const numberFormatter = new Intl.NumberFormat('vi-VN');
const scoreFormatter = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

const dashboardRanges: Array<{
    value: DashboardRange;
    label: string;
    days: number;
}> = [
    { value: '7d', label: '7 ngày qua', days: 7 },
    { value: '30d', label: '30 ngày qua', days: 30 },
    { value: '90d', label: '90 ngày qua', days: 90 },
];

export function DashboardOverviewPage() {
    const [range, setRange] = useState<DashboardRange>('30d');
    const summaryQuery = useDashboardSummary(range);
    const meQuery = useMe({ refetchOnMount: false });
    const periodDays = getRangeDays(range);

    if (summaryQuery.isPending) return <DashboardSkeleton />;
    if (summaryQuery.isError)
        return <DashboardError onRetry={() => void summaryQuery.refetch()} />;

    const summary = summaryQuery.data;

    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
            <DashboardHero
                fullName={meQuery.data?.fullName}
                range={range}
                onRangeChange={setRange}
            />

            <section className="mt-4" aria-label="Tổng quan hồ sơ">
                <OverviewMetrics summary={summary} periodDays={periodDays} />
            </section>

            <div className="mt-5 grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(420px,1fr)]">
                <DashboardPerformanceCard
                    interviewSummary={summary.interviewSummary}
                    performanceHistory={summary.performanceHistory}
                    periodDays={periodDays}
                />
                <InterviewStatus summary={summary.interviewSummary} />
            </div>

            <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-2">
                <RecentInterviews interviews={summary.recentInterviews} />
                <RecentActivity activities={summary.recentActivity} />
            </div>
        </main>
    );
}

const interviewStatus: Record<
    DashboardInterviewStatus,
    { label: string; className: string }
> = {
    DRAFT: { label: 'Bản nháp', className: 'bg-slate-100 text-slate-600' },
    PLANNING: {
        label: 'Đang lập kế hoạch',
        className: 'bg-amber-50 text-amber-700',
    },
    READY: { label: 'Sẵn sàng', className: 'bg-sky-50 text-sky-700' },
    IN_PROGRESS: {
        label: 'Đang phỏng vấn',
        className: 'bg-amber-50 text-amber-700',
    },
    COMPLETED: {
        label: 'Đã hoàn thành',
        className: 'bg-emerald-50 text-emerald-700',
    },
    CANCELLED: { label: 'Đã hủy', className: 'bg-rose-50 text-rose-700' },
};

const interviewStatusIcon: Record<DashboardInterviewStatus, ElementType> = {
    DRAFT: FileText,
    PLANNING: RotateCcw,
    READY: Play,
    IN_PROGRESS: RotateCcw,
    COMPLETED: CheckCircle2,
    CANCELLED: Minus,
};

const interviewType: Record<DashboardInterviewType, string> = {
    HR: 'Nhân sự',
    BEHAVIORAL: 'Hành vi',
    TECHNICAL: 'Kỹ thuật',
    CODING: 'Lập trình',
    SYSTEM_DESIGN: 'Thiết kế hệ thống',
    FULL: 'Phỏng vấn đầy đủ',
};

const activityIcon: Record<DashboardActivityType, ElementType> = {
    CV_CREATED: FilePlus2,
    CV_ANALYSIS_COMPLETED: FileCheck,
    JOB_DESCRIPTION_CREATED: BriefcaseBusiness,
    JOB_DESCRIPTION_ANALYSIS_COMPLETED: ListChecks,
    CV_JD_MATCH_COMPLETED: Link2,
    INTERVIEW_CREATED: CalendarPlus,
    INTERVIEW_COMPLETED: Video,
    INTERVIEW_EVALUATION_COMPLETED: Target,
};

const interviewMetadataIcon: Record<DashboardInterviewType, ElementType> = {
    HR: UserRound,
    BEHAVIORAL: UserRound,
    TECHNICAL: Code2,
    CODING: Code2,
    SYSTEM_DESIGN: Database,
    FULL: BriefcaseBusiness,
};

function getInterviewIcon(interview: DashboardRecentInterview): ElementType {
    const role = interview.targetRole.toLocaleLowerCase('vi-VN');

    if (/(mobile|android|ios|flutter|react native)/u.test(role)) {
        return Smartphone;
    }
    if (/(data|database|backend|back-end|sql|engineer dữ liệu)/u.test(role)) {
        return Database;
    }
    if (
        /(frontend|front-end|fullstack|full-stack|web|software|developer|lập trình)/u.test(
            role,
        )
    ) {
        return Code2;
    }
    if (
        interview.interviewType === 'BEHAVIORAL' ||
        interview.interviewType === 'HR'
    ) {
        return UserRound;
    }
    if (
        interview.interviewType === 'TECHNICAL' ||
        interview.interviewType === 'CODING'
    ) {
        return Code2;
    }

    return Video;
}

function RecentInterviews({
    interviews,
}: {
    interviews: DashboardRecentInterview[];
}) {
    const visibleInterviews = interviews.slice(0, 4);

    return (
        <section
            className="dashboard-card-surface h-full rounded-2xl p-5"
            aria-labelledby="recent-interviews-heading"
        >
            <ListSectionHeader
                id="recent-interviews-heading"
                title="Phỏng vấn gần đây"
                description="Các buổi phỏng vấn bạn vừa thực hiện"
                icon={Video}
                href="/interviews"
                action="Xem tất cả"
            />
            {interviews.length === 0 ? (
                <CompactEmptyState
                    icon={Video}
                    title="Chưa có buổi phỏng vấn gần đây"
                    description="Tạo buổi phỏng vấn đầu tiên để bắt đầu luyện tập."
                    href="/interviews/new"
                    action="Tạo buổi phỏng vấn"
                />
            ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                    {visibleInterviews.map((item) => {
                        const status = interviewStatus[item.status];
                        const InterviewIcon = getInterviewIcon(item);
                        const MetadataIcon =
                            interviewMetadataIcon[item.interviewType];
                        const StatusIcon = interviewStatusIcon[item.status];

                        return (
                            <li key={item.id}>
                                <AnimateIcon animateOnHover asChild speed={0.8}>
                                    <Link
                                        href={item.href}
                                        className="group focus-visible:ring-primary/30 -mx-2 grid min-h-[78px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 transition-colors duration-200 hover:bg-violet-50/45 focus-visible:ring-2 focus-visible:outline-none"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/80">
                                                <DashboardAnimatedIcon
                                                    icon={InterviewIcon}
                                                    className="size-5.5"
                                                    name={`interview-${item.interviewType}-${item.targetRole}`}
                                                />
                                            </span>
                                            <div className="min-w-0">
                                                <h3 className="truncate text-sm font-extrabold text-slate-950 transition-colors group-hover:text-violet-700">
                                                    {item.targetRole}
                                                </h3>
                                                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-500">
                                                    <time
                                                        dateTime={
                                                            item.completedAt ??
                                                            item.createdAt
                                                        }
                                                        className="whitespace-nowrap"
                                                    >
                                                        {formatDashboardDate(
                                                            item.completedAt ??
                                                                item.createdAt,
                                                        )}
                                                    </time>
                                                    <span aria-hidden="true">
                                                        ·
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <MetadataIcon
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        {
                                                            interviewType[
                                                                item
                                                                    .interviewType
                                                            ]
                                                        }
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className={cn(
                                                    'hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold whitespace-nowrap md:inline-flex',
                                                    status.className,
                                                )}
                                            >
                                                <StatusIcon
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {status.label}
                                            </span>
                                            <span className="flex min-w-16 justify-center rounded-full bg-violet-50 px-2.5 py-1.5 text-sm font-black whitespace-nowrap text-slate-950 tabular-nums">
                                                {item.score !== null ? (
                                                    <>
                                                        {scoreFormatter.format(
                                                            item.score,
                                                        )}
                                                        <span className="ml-0.5 text-[11px] font-bold text-slate-500">
                                                            /10
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400">
                                                        —
                                                    </span>
                                                )}
                                            </span>
                                            <AnimatedArrowRight
                                                size={18}
                                                className="shrink-0 text-slate-400 group-hover:text-violet-600"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </Link>
                                </AnimateIcon>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function RecentActivity({
    activities,
}: {
    activities: DashboardActivityItem[];
}) {
    const visibleActivities = [...activities]
        .sort(
            (left, right) =>
                right.occurredAt.localeCompare(left.occurredAt) ||
                left.id.localeCompare(right.id),
        )
        .slice(0, 5);

    return (
        <section
            className="dashboard-card-surface h-full rounded-2xl p-5"
            aria-labelledby="recent-activity-heading"
        >
            <ListSectionHeader
                id="recent-activity-heading"
                title="Hoạt động gần đây"
                description="Những cập nhật mới nhất trong hành trình của bạn"
                icon={Activity}
            />
            {activities.length === 0 ? (
                <CompactEmptyState
                    icon={Activity}
                    title="Chưa có hoạt động gần đây"
                    description="Các cập nhật từ CV, JD và phỏng vấn sẽ xuất hiện tại đây."
                />
            ) : (
                <ul className="mt-4">
                    {visibleActivities.map((item) => (
                        <ActivityRow key={item.id} item={item} />
                    ))}
                </ul>
            )}
        </section>
    );
}

function ActivityRow({ item }: { item: DashboardActivityItem }) {
    const Icon = activityIcon[item.type];
    const content = (
        <div className="grid min-h-[70px] grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3">
            <span className="text-primary flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/80">
                <DashboardAnimatedIcon
                    icon={Icon}
                    className="size-5"
                    name={`activity-${item.type}`}
                />
            </span>
            <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-slate-950 transition-colors group-hover:text-violet-700">
                    {item.title}
                </span>
                {item.description && (
                    <span className="mt-1 block truncate text-xs font-medium text-slate-500">
                        {item.description}
                    </span>
                )}
            </span>
            <time
                dateTime={item.occurredAt}
                className="pl-3 text-right text-xs font-semibold whitespace-nowrap text-slate-500"
            >
                {formatActivityTime(item.occurredAt)}
            </time>
        </div>
    );

    return (
        <li className="relative pl-7 before:absolute before:top-0 before:bottom-0 before:left-[5px] before:w-px before:bg-violet-100 after:absolute after:top-1/2 after:left-0 after:size-[11px] after:-translate-y-1/2 after:rounded-full after:border-2 after:border-white after:bg-violet-600 after:shadow-[0_0_0_3px_rgba(124,58,237,0.12)] first:before:top-1/2 last:before:bottom-1/2 last:[&_.activity-divider]:hidden">
            <AnimateIcon animateOnHover asChild speed={0.8}>
                {item.href ? (
                    <Link
                        href={item.href}
                        className="group focus-visible:ring-primary/30 block rounded-xl px-2 transition-colors duration-200 hover:bg-violet-50/45 focus-visible:ring-2 focus-visible:outline-none"
                    >
                        {content}
                    </Link>
                ) : (
                    <div className="group rounded-xl px-2 transition-colors duration-200 hover:bg-violet-50/45">
                        {content}
                    </div>
                )}
            </AnimateIcon>
            <span
                aria-hidden="true"
                className="activity-divider pointer-events-none absolute right-0 bottom-0 left-[88px] h-px bg-slate-100"
            />
        </li>
    );
}

function ListSectionHeader({
    id,
    title,
    description,
    icon: Icon,
    href,
    action,
}: {
    id: string;
    title: string;
    description: string;
    icon: ElementType;
    href?: string;
    action?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <AnimateIcon animateOnHover asChild speed={0.8}>
                <div className="flex min-w-0 items-start gap-3">
                    <span className="text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/80">
                        <DashboardAnimatedIcon icon={Icon} className="size-5" />
                    </span>
                    <SectionHeading
                        id={id}
                        title={title}
                        description={description}
                    />
                </div>
            </AnimateIcon>
            {href && action && (
                <AnimateIcon animateOnHover asChild speed={0.8}>
                    <Button
                        asChild
                        variant="ghost"
                        className="text-primary hover:text-primary h-8 shrink-0 rounded-sm px-2 text-xs font-extrabold hover:bg-violet-50"
                    >
                        <Link href={href}>
                            {action}
                            <AnimatedArrowRight size={14} aria-hidden="true" />
                        </Link>
                    </Button>
                </AnimateIcon>
            )}
        </div>
    );
}

function CompactEmptyState({
    icon: Icon,
    title,
    description,
    href,
    action,
}: {
    icon: ElementType;
    title: string;
    description: string;
    href?: string;
    action?: string;
}) {
    return (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4 sm:flex-row sm:items-center">
            <span className="text-primary flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-slate-900">{title}</h3>
                <p className="mt-0.5 text-xs leading-5 font-semibold text-slate-500">
                    {description}
                </p>
            </div>
            {href && action && (
                <Button
                    asChild
                    variant="outline"
                    className="h-9 shrink-0 rounded-sm border-violet-200 text-xs font-extrabold"
                >
                    <Link href={href}>{action}</Link>
                </Button>
            )}
        </div>
    );
}

function formatDashboardDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

function formatActivityTime(value: string) {
    const occurredAt = new Date(value);
    const elapsedMinutes = Math.max(
        0,
        Math.floor((Date.now() - occurredAt.getTime()) / 60_000),
    );

    if (elapsedMinutes < 60) return `${Math.max(1, elapsedMinutes)} phút trước`;
    if (elapsedMinutes < 24 * 60)
        return `${Math.floor(elapsedMinutes / 60)} giờ trước`;
    if (elapsedMinutes < 48 * 60) return 'Hôm qua';

    return formatDashboardDate(value);
}

function DashboardHero({
    fullName,
    range,
    onRangeChange,
}: {
    fullName?: string;
    range: DashboardRange;
    onRangeChange: (range: DashboardRange) => void;
}) {
    const firstName = getFirstName(fullName);
    return (
        <div>
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                        Chào mừng quay lại{firstName ? `, ${firstName}` : ''}!{' '}
                        <span aria-hidden="true">👋</span>
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-slate-600 sm:text-base">
                        Theo dõi quá trình chuẩn bị và kết quả luyện phỏng vấn
                        của bạn.
                    </p>
                </div>
                <Select
                    value={range}
                    onValueChange={(value) => {
                        if (isDashboardRange(value)) onRangeChange(value);
                    }}
                >
                    <SelectTrigger
                        className="h-11 w-full shrink-0 rounded-xl border-violet-100 bg-white px-4 font-bold shadow-none sm:w-44"
                        aria-label="Khoảng thời gian Dashboard"
                    >
                        <span className="flex items-center gap-2">
                            <CalendarDays
                                className="size-4 text-slate-600"
                                aria-hidden="true"
                            />
                            <SelectValue />
                        </span>
                    </SelectTrigger>
                    <SelectContent align="end">
                        {dashboardRanges.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </header>

            <section className="dashboard-hero-surface relative isolate mt-5 min-h-52 overflow-hidden rounded-[18px] px-6 py-8 shadow-[0_8px_20px_rgba(91,61,235,0.16)] sm:px-8 lg:px-14">
                <svg
                    aria-hidden="true"
                    viewBox="0 0 1400 208"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                >
                    <path
                        d="M650 208C790 164 842 83 1000 77C1144 72 1229 140 1400 65V208Z"
                        fill="#D8C3FF"
                        fillOpacity="0.22"
                    />
                    <path
                        d="M385 208C513 207 565 157 673 118C790 76 861 91 958 133C1083 187 1171 188 1400 111V208Z"
                        fill="#542FD0"
                        fillOpacity="0.46"
                    />
                </svg>
                <div className="relative z-10 max-w-full sm:max-w-[52%]">
                    <h2 className="text-[27px] leading-tight font-bold tracking-tight text-white">
                        Sẵn sàng cho buổi phỏng vấn tiếp theo?
                    </h2>
                    <p className="mt-1.5 text-sm font-semibold text-violet-100 sm:text-base">
                        Luyện tập, phân tích CV/JD và cải thiện kỹ năng cùng
                        Interviewly.
                    </p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/interviews/new"
                            className="focus-visible:ring-primary-foreground/70 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white bg-white px-5 text-sm font-extrabold text-[#6236f5] shadow-sm transition-colors hover:border-violet-100 hover:bg-violet-50 hover:text-[#6236f5] focus-visible:ring-3 focus-visible:outline-none active:bg-violet-100"
                        >
                            <Play
                                className="size-4 fill-current"
                                aria-hidden="true"
                            />
                            Bắt đầu luyện tập
                        </Link>
                        <Link
                            href="/interviews/new"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/75 bg-white/5 px-5 text-sm font-extrabold text-white transition-colors hover:border-white hover:bg-white/15 hover:text-white focus-visible:ring-3 focus-visible:ring-white/50 focus-visible:outline-none active:bg-white/20"
                        >
                            <CalendarDays
                                className="size-4"
                                aria-hidden="true"
                            />
                            Tạo buổi phỏng vấn
                        </Link>
                    </div>
                </div>
                <Image
                    src="/images/dashboard/next-interview-illustration.png"
                    alt=""
                    width={1784}
                    height={887}
                    loading="eager"
                    className="pointer-events-none absolute right-[8%] bottom-0 z-10 hidden h-full w-[min(38%,480px)] object-contain object-right-bottom sm:block"
                    aria-hidden="true"
                />
            </section>
        </div>
    );
}

function getFirstName(fullName?: string) {
    const parts = fullName?.trim().split(/\s+/).filter(Boolean);
    return parts?.at(-1) ?? '';
}

function OverviewMetrics({
    summary,
    periodDays,
}: {
    summary: DashboardSummary;
    periodDays: number;
}) {
    const cards: Array<Omit<MetricCardProps, 'periodDays'>> = [
        {
            title: 'CV đã tạo',
            value: summary.overview.cvs.total,
            trend: summary.overview.cvs.trend,
            href: '/cv',
            icon: FileText,
            iconClassName: 'bg-violet-100 text-violet-700',
        },
        {
            title: 'JD đã thêm',
            value: summary.overview.jobDescriptions.total,
            trend: summary.overview.jobDescriptions.trend,
            href: '/job-descriptions',
            icon: BriefcaseBusiness,
            iconClassName: 'bg-sky-100 text-sky-700',
        },
        {
            title: 'Lượt ghép CV–JD',
            value: summary.overview.matches.total,
            trend: summary.overview.matches.trend,
            href: '/matching',
            icon: GitCompareArrows,
            iconClassName: 'bg-amber-100 text-amber-700',
        },
        {
            title: 'Buổi phỏng vấn',
            value: summary.interviewSummary.total,
            trend: summary.interviewSummary.trend,
            href: '/interviews',
            icon: Video,
            iconClassName: 'bg-emerald-100 text-emerald-700',
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <MetricCard
                    key={card.title}
                    {...card}
                    periodDays={periodDays}
                />
            ))}
        </div>
    );
}

interface MetricCardProps {
    title: string;
    value: number;
    trend: DashboardTrend;
    href: string;
    icon: ElementType;
    iconClassName: string;
    periodDays: number;
}

function MetricCard({
    title,
    value,
    trend,
    href,
    icon: Icon,
    iconClassName,
    periodDays,
}: MetricCardProps) {
    return (
        <AnimateIcon animateOnHover asChild speed={0.75}>
            <Link
                href={href}
                className="dashboard-card-surface group focus-visible:ring-primary/30 relative grid min-h-26 grid-cols-[56px_minmax(0,1fr)] items-center gap-4 rounded-2xl p-3.5 transition-[border-color,box-shadow] duration-300 ease-out hover:border-violet-200 hover:shadow-[0_10px_26px_rgba(72,45,135,0.08)] focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`${title}: ${numberFormatter.format(value)}. ${Math.abs(trend.percentageChange)}% so với ${periodDays} ngày trước`}
            >
                <span
                    className={cn(
                        'flex size-14 shrink-0 items-center justify-center rounded-2xl',
                        iconClassName,
                    )}
                >
                    <Icon
                        className="size-6"
                        strokeWidth={2.2}
                        aria-hidden="true"
                    />
                </span>
                <span className="min-w-0 pr-5">
                    <span className="block truncate text-sm font-extrabold text-slate-900">
                        {title}
                    </span>
                    <span className="mt-1 flex items-center gap-3">
                        <span className="text-[27px] leading-none font-black tracking-tight text-slate-950">
                            {numberFormatter.format(value)}
                        </span>
                        <TrendBadge trend={trend} />
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-[#526581]">
                        so với {periodDays} ngày trước
                    </span>
                </span>
                <AnimatedArrowRight
                    size={20}
                    className="group-hover:text-primary absolute top-4 right-4 text-slate-500 transition-colors duration-300 ease-out"
                    strokeWidth={2.25}
                    aria-hidden="true"
                />
            </Link>
        </AnimateIcon>
    );
}

function isDashboardRange(value: string): value is DashboardRange {
    return dashboardRanges.some((option) => option.value === value);
}

function getRangeDays(range: DashboardRange) {
    return dashboardRanges.find((option) => option.value === range)?.days ?? 30;
}

function TrendBadge({ trend }: { trend: DashboardTrend }) {
    const isUp = trend.direction === 'UP';
    const isDown = trend.direction === 'DOWN';
    const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs leading-none font-extrabold',
                isUp && 'bg-emerald-100 text-emerald-700',
                isDown && 'bg-rose-100 text-rose-700',
                !isUp && !isDown && 'bg-slate-100 text-slate-500',
            )}
            title={`${numberFormatter.format(trend.currentPeriod)} trong 30 ngày qua, ${numberFormatter.format(trend.previousPeriod)} trong 30 ngày trước`}
        >
            <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
            {Math.abs(trend.percentageChange)}%
        </span>
    );
}

function InterviewStatus({
    summary,
}: {
    summary: DashboardSummary['interviewSummary'];
}) {
    const shownTotal =
        summary.draft + summary.ready + summary.inProgress + summary.completed;
    const other = Math.max(0, summary.total - shownTotal);
    const segments = [
        { label: 'Hoàn thành', value: summary.completed, color: '#10b981' },
        {
            label: 'Đang thực hiện',
            value: summary.inProgress,
            color: '#a78bfa',
        },
        { label: 'Sẵn sàng', value: summary.ready, color: '#818cf8' },
        { label: 'Bản nháp', value: summary.draft, color: '#cbd5e1' },
    ];
    const legendSegments =
        other > 0
            ? [...segments, { label: 'Khác', value: other, color: '#e2e8f0' }]
            : segments;

    return (
        <section
            className="dashboard-card-surface min-h-[270px] rounded-2xl p-5"
            aria-labelledby="interview-status-heading"
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-primary flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                        <CalendarDays className="size-5" aria-hidden="true" />
                    </span>
                    <h2
                        id="interview-status-heading"
                        className="text-xl font-black tracking-tight text-slate-950"
                    >
                        Trạng thái phỏng vấn
                    </h2>
                </div>
                <AnimateIcon animateOnHover asChild speed={0.8}>
                    <Button
                        asChild
                        variant="ghost"
                        className="text-primary hover:text-primary hidden shrink-0 rounded-sm text-sm font-extrabold hover:bg-violet-50 sm:inline-flex"
                    >
                        <Link href="/interviews">
                            Xem tất cả
                            <AnimatedArrowRight size={16} aria-hidden="true" />
                        </Link>
                    </Button>
                </AnimateIcon>
            </div>

            <div className="mt-5 grid items-center gap-5 sm:grid-cols-[150px_minmax(0,1fr)]">
                <div className="relative mx-auto size-32">
                    <div
                        className="size-32 rounded-full"
                        style={distributionStyle(
                            summary.total,
                            segments,
                            other,
                        )}
                        role="img"
                        aria-label={statusChartLabel(summary, other)}
                    />
                    <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
                        <span className="text-2xl font-black text-slate-950">
                            {numberFormatter.format(summary.total)}
                        </span>
                        <span className="mt-0.5 text-xs font-bold text-slate-600">
                            Tổng buổi
                        </span>
                    </div>
                </div>

                <div className="min-w-0">
                    <dl className="grid gap-1.5">
                        {legendSegments.map((segment) => (
                            <div
                                key={segment.label}
                                className="grid grid-cols-[minmax(0,1fr)_32px_56px] items-center gap-3 py-1.5"
                            >
                                <dt className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: segment.color,
                                        }}
                                        aria-hidden="true"
                                    />
                                    {segment.label}
                                </dt>
                                <dd className="text-center text-sm font-black text-slate-950">
                                    {numberFormatter.format(segment.value)}
                                </dd>
                                <dd className="rounded-full bg-slate-50 px-2 py-1 text-center text-xs font-extrabold text-slate-600">
                                    {summary.total > 0
                                        ? Math.round(
                                              (segment.value / summary.total) *
                                                  100,
                                          )
                                        : 0}
                                    %
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
}

function DashboardSkeleton() {
    return (
        <main
            className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8"
            aria-label="Đang tải Dashboard"
        >
            <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-5 w-96 max-w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="h-44 animate-pulse rounded-2xl bg-violet-100/70" />
                <div className="h-44 animate-pulse rounded-2xl bg-violet-100/70" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                    <div
                        key={item}
                        className="h-28 animate-pulse rounded-2xl border border-slate-100 bg-white"
                    />
                ))}
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(420px,1fr)]">
                <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
            </div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
                <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
            </div>
        </main>
    );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
    return (
        <main className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-[1600px] items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
            <section
                role="alert"
                className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-[0_14px_44px_rgba(72,45,135,0.08)]"
            >
                <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <RotateCcw className="size-5" aria-hidden="true" />
                </span>
                <h1 className="mt-4 text-xl font-black text-slate-950">
                    Chưa thể tải Dashboard
                </h1>
                <p className="mt-2 text-sm leading-6 font-semibold text-slate-600">
                    Dữ liệu tổng quan tạm thời chưa khả dụng. Vui lòng thử lại.
                </p>
                <Button
                    type="button"
                    className="mt-5 rounded-sm font-extrabold"
                    onClick={onRetry}
                >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Thử lại
                </Button>
            </section>
        </main>
    );
}

function SectionHeading({
    id,
    title,
    description,
}: {
    id: string;
    title: string;
    description: string;
}) {
    return (
        <div>
            <h2
                id={id}
                className="text-xl font-black tracking-tight text-slate-950"
            >
                {title}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
                {description}
            </p>
        </div>
    );
}

function distributionStyle(
    total: number,
    segments: Array<{ value: number; color: string }>,
    other: number,
): CSSProperties {
    if (total <= 0) return { background: '#ede9fe' };

    let cursor = 0;
    const stops = segments.map((segment) => {
        const start = cursor;
        cursor = Math.min(100, cursor + (segment.value / total) * 100);
        return `${segment.color} ${start}% ${cursor}%`;
    });
    if (other > 0) stops.push(`#e2e8f0 ${cursor}% 100%`);
    return { background: `conic-gradient(${stops.join(', ')})` };
}

function statusChartLabel(
    summary: DashboardSummary['interviewSummary'],
    other: number,
) {
    return [
        `Tổng ${summary.total} buổi phỏng vấn`,
        `${summary.draft} bản nháp`,
        `${summary.ready} sẵn sàng`,
        `${summary.inProgress} đang thực hiện`,
        `${summary.completed} hoàn thành`,
        other > 0 ? `${other} trạng thái khác` : null,
    ]
        .filter(Boolean)
        .join(', ');
}
