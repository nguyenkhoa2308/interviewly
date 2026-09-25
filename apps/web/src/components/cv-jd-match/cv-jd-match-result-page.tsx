'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
    AlertTriangle,
    BarChart3,
    CircleAlert,
    ArrowLeftRight,
    ArrowRight,
    Bot,
    CalendarDays,
    CheckCircle2,
    Clock3,
    ChevronLeft,
    ChevronRight,
    FileText,
    Info,
    Lightbulb,
    ExternalLink,
    RefreshCw,
    Sparkles,
    Star,
    Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { Button } from '@/components/ui/button';
import {
    useCreateCvJdMatch,
    useCvJdMatch,
    useCvJdMatches,
} from '@/hooks/cv-jd-match/use-cv-jd-matches';
import type {
    CvJdMatch,
    CvJdMatchStatus,
    CvJdMatchSummary,
    MatchInsight,
    MatchScoreBreakdown,
} from '@/types/cv-jd-match';

export function CvJdMatchResultPage({ id }: { id: string }) {
    const router = useRouter();
    const query = useCvJdMatch(id);
    const create = useCreateCvJdMatch();
    const [historyPage, setHistoryPage] = useState(1);
    const match = query.data;
    const history = useCvJdMatches(
        match
            ? {
                  cvId: match.cvId,
                  jobDescriptionId: match.jobDescriptionId,
                  page: historyPage,
                  limit: 5,
              }
            : {},
    );
    if (query.isPending)
        return (
            <main className="mx-auto max-w-[1600px] p-6">
                <div className="h-[680px] animate-pulse rounded-2xl bg-slate-100" />
            </main>
        );
    if (query.isError || !match)
        return (
            <main className="mx-auto max-w-[1600px] p-6">
                <Card
                    title="Không thể tải kết quả đối chiếu"
                    icon={AlertTriangle}
                >
                    <Button variant="outline" onClick={() => query.refetch()}>
                        Thử lại
                    </Button>
                </Card>
            </main>
        );

    const rematch = async () => {
        if (create.isPending) return;
        try {
            const next = await create.mutateAsync({
                cvId: match.cvId,
                jobDescriptionId: match.jobDescriptionId,
            });
            router.push(`/matching/${next.id}`);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể đối chiếu lại.',
            );
        }
    };

    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <PageBreadcrumb
                items={[
                    { label: 'Đối chiếu CV – JD', href: '/matching' },
                    { label: 'Kết quả đối chiếu' },
                ]}
            />
            <header className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                            <FileText className="size-5" />
                        </span>
                        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                            Kết quả đối chiếu CV – JD
                        </h1>
                    </div>
                    <p className="mt-2 text-slate-500">
                        Phân tích mức độ phù hợp giữa CV và mô tả công việc bằng
                        AI.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Source
                            icon={FileText}
                            title={match.cvNameSnapshot}
                            detail={`Phiên bản ${match.cvVersionNumber}`}
                        />
                        <ArrowLeftRight className="text-primary mx-3 hidden size-5 shrink-0 sm:block" />
                        <Source
                            icon={FileText}
                            title={match.jdTitleSnapshot}
                            detail={
                                match.jdCompanySnapshot ??
                                'Không có tên công ty'
                            }
                        />
                    </div>
                </div>
                <Button
                    className="h-11 self-start rounded-lg px-5 font-bold"
                    disabled={create.isPending}
                    onClick={rematch}
                >
                    {create.isPending ? (
                        <RefreshCw className="size-4 animate-spin" />
                    ) : (
                        <Sparkles className="size-4" />
                    )}
                    {create.isPending ? 'Đang đối chiếu...' : 'Đối chiếu lại'}
                </Button>
            </header>

            {match.status === 'COMPLETED' ? (
                <ResultGrid
                    match={match}
                    history={history.data?.items ?? []}
                    historyPage={historyPage}
                    historyTotalPages={history.data?.pagination.totalPages ?? 0}
                    historyPending={history.isFetching}
                    onHistoryPageChange={setHistoryPage}
                />
            ) : (
                <Lifecycle status={match.status} />
            )}
        </main>
    );
}

function ResultGrid({
    match,
    history,
    historyPage,
    historyTotalPages,
    historyPending,
    onHistoryPageChange,
}: {
    match: CvJdMatch;
    history: CvJdMatchSummary[];
    historyPage: number;
    historyTotalPages: number;
    historyPending: boolean;
    onHistoryPageChange: (page: number) => void;
}) {
    const score = Math.round(match.matchScore ?? 0);
    const alignment =
        score >= 75
            ? {
                  label: 'Phù hợp tốt',
                  className: 'bg-emerald-100 text-emerald-700',
              }
            : score >= 50
              ? {
                    label: 'Phù hợp một phần',
                    className: 'bg-amber-100 text-amber-700',
                }
              : {
                    label: 'Mức phù hợp thấp',
                    className: 'bg-rose-100 text-rose-700',
                };
    const overview = (
        <Card title="Tổng quan mức độ phù hợp" icon={BarChart3}>
            <div className="grid gap-6 md:grid-cols-[192px_minmax(0,1fr)] md:items-center">
                <ScoreRing score={score} />
                <div className="min-w-0">
                    <span
                        className={`inline-flex rounded-full px-4 py-1.5 text-sm font-extrabold ${alignment.className}`}
                    >
                        {alignment.label}
                    </span>
                    <p className="mt-2 text-[15px] leading-7 text-slate-600">
                        {match.matchSummary}
                    </p>
                    {match.scoreBreakdown && (
                        <ScoreBreakdown breakdown={match.scoreBreakdown} />
                    )}
                    <div className="mt-4 flex gap-3 rounded-xl bg-violet-50 px-4 py-3 text-sm leading-5 text-slate-600">
                        <Info
                            className="text-primary mt-0.5 size-5 shrink-0"
                            strokeWidth={2.5}
                        />
                        <span>
                            Điểm số thể hiện mức độ khớp giữa bằng chứng trong
                            CV và yêu cầu trong JD, không phải xác suất được
                            tuyển dụng.
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    );
    const details = (
        <Card title="Chi tiết đối chiếu" icon={FileText}>
            <div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <Detail
                        icon={FileText}
                        label="CV"
                        value={match.cvNameSnapshot}
                        description={`${match.cvUpdatedAtSnapshot ? `Cập nhật ${formatShortDate(match.cvUpdatedAtSnapshot)} · ` : ''}Phiên bản ${match.cvVersionNumber}`}
                        href={`/cv/${match.cvId}/analysis`}
                        action="Xem phân tích CV"
                    />
                    <Detail
                        icon={FileText}
                        label="Mô tả công việc"
                        value={match.jdTitleSnapshot}
                        description={`${match.jdCompanySnapshot ?? 'Không có tên công ty'}${match.jdUpdatedAtSnapshot ? ` · Cập nhật ${formatShortDate(match.jdUpdatedAtSnapshot)}` : ''}`}
                        href={`/job-descriptions/${match.jobDescriptionId}/analysis`}
                        action="Xem phân tích JD"
                        divided
                    />
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3">
                    <Meta
                        icon={CalendarDays}
                        label="Ngày đối chiếu"
                        value={formatDate(match.completedAt ?? match.createdAt)}
                    />
                    <Meta label="Trạng thái" value="Hoàn tất" status />
                    <Meta
                        icon={Bot}
                        label="Mô hình"
                        value={match.modelName ?? 'AI'}
                        // description={match.promptVersion ?? undefined}
                    />
                </div>
            </div>
        </Card>
    );
    const skills = (
        <Card
            title="Kỹ năng phù hợp"
            icon={CheckCircle2}
            tone="success"
            subtitle="Các yêu cầu đã có bằng chứng trong CV."
        >
            {match.matchedSkills?.length ? (
                <div className="flex flex-wrap gap-2.5">
                    {match.matchedSkills.map((item) => (
                        <span
                            key={item.name}
                            title={item.evidence}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700"
                        >
                            <CheckCircle2 className="size-3.5" />
                            {item.name}
                            <span className="sr-only">: {item.evidence}</span>
                        </span>
                    ))}
                </div>
            ) : (
                <EmptyEvidence text="Chưa tìm thấy kỹ năng phù hợp có đủ bằng chứng trong CV." />
            )}
        </Card>
    );
    const skillGaps = (
        <Card
            title="Khoảng trống kỹ năng"
            icon={CircleAlert}
            subtitle="Các kỹ năng hoặc yêu cầu từ JD chưa được thể hiện rõ trong CV."
            tone="danger"
        >
            {match.skillGaps?.length ? (
                <div className="space-y-3">
                    {match.skillGaps.map((item) => (
                        <article
                            key={`${item.importance}-${item.name}`}
                            title={item.explanation}
                            className="border-l-2 border-rose-200 pl-3"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-extrabold text-slate-900">
                                    {item.name}
                                </h3>
                                <span className="text-xs font-bold text-rose-600">
                                    {item.importance === 'REQUIRED'
                                        ? 'Bắt buộc'
                                        : 'Ưu tiên'}
                                </span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                {item.explanation}
                            </p>
                        </article>
                    ))}
                </div>
            ) : (
                <EmptyEvidence
                    text="Không có khoảng trống kỹ năng đáng chú ý trong lần đối chiếu này."
                    positive
                />
            )}
        </Card>
    );
    const experience = (
        <Card
            title="Mức độ phù hợp về kinh nghiệm"
            icon={BarChart3}
            subtitle="So sánh yêu cầu công việc với kinh nghiệm được thể hiện trong CV."
        >
            {match.experienceAlignment ? (
                <>
                    <p className="mb-4 text-[15px] leading-7 text-slate-700">
                        {match.experienceAlignment.summary}
                    </p>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="grid grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)] bg-violet-50/70 px-4 py-2.5 text-xs font-extrabold text-slate-500">
                            <span>Nội dung</span>
                            <span>Kỳ vọng từ JD</span>
                            <span>Bằng chứng trong CV</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 px-4 py-4 text-sm leading-6 text-slate-600 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)]">
                            <strong className="text-slate-900">
                                Kinh nghiệm tổng thể
                            </strong>
                            <p>
                                {match.experienceAlignment.jdExpectation ||
                                    'Chưa có dữ liệu.'}
                            </p>
                            <p>
                                {match.experienceAlignment.cvEvidence ||
                                    'Chưa có dữ liệu.'}
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <EmptyEvidence text="Chưa có đủ dữ liệu để đánh giá kinh nghiệm." />
            )}
        </Card>
    );
    const recommendations = (
        <Card
            title="Đề xuất cải thiện"
            icon={Lightbulb}
            subtitle="Những việc nên ưu tiên để chuẩn bị tốt hơn cho vị trí này."
        >
            {match.recommendations?.length ? (
                <ol className="space-y-4">
                    {match.recommendations.map((item, index) => (
                        <li
                            key={`${item.title}-${index}`}
                            className="grid grid-cols-[32px_1fr] gap-3"
                        >
                            <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg text-sm font-black">
                                {index + 1}
                            </span>
                            <div>
                                <h3 className="font-bold text-slate-900">
                                    {item.title}
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    {item.description}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>
            ) : (
                <EmptyEvidence
                    text="Chưa có đề xuất bổ sung cho lần đối chiếu này."
                    positive
                />
            )}
        </Card>
    );
    const strengths = match.strengths?.length ? (
        <Insights title="Điểm mạnh" icon={Star} items={match.strengths} />
    ) : (
        <Card title="Điểm mạnh" icon={Star}>
            <EmptyEvidence text="Chưa có điểm mạnh nổi bật được ghi nhận." />
        </Card>
    );
    const risks = match.gaps?.length ? (
        <Insights
            title="Khoảng trống và rủi ro"
            icon={AlertTriangle}
            items={match.gaps}
            danger
        />
    ) : (
        <Card title="Khoảng trống và rủi ro" icon={AlertTriangle} tone="danger">
            <EmptyEvidence
                text="Không có rủi ro đáng chú ý trong lần đối chiếu này."
                positive
            />
        </Card>
    );

    return (
        <div className="mt-7 grid items-start gap-5 2xl:grid-cols-[minmax(0,1.8fr)_minmax(390px,1fr)]">
            <div className="space-y-5">
                {overview}
                <div className="grid items-start gap-5 lg:grid-cols-2">
                    {skills}
                    {skillGaps}
                </div>
                {experience}
                {recommendations}
            </div>
            <aside className="space-y-5">
                {details}
                {strengths}
                {risks}
                <History
                    items={history}
                    currentId={match.id}
                    page={historyPage}
                    totalPages={historyTotalPages}
                    pending={historyPending}
                    onPageChange={onHistoryPageChange}
                />
            </aside>
        </div>
    );
}

function EmptyEvidence({
    text,
    positive = false,
}: {
    text: string;
    positive?: boolean;
}) {
    return (
        <div
            className={`flex min-h-20 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${positive ? 'border-emerald-100 bg-emerald-50/60 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
        >
            <CheckCircle2 className="size-5 shrink-0" />
            {text}
        </div>
    );
}

function Card({
    title,
    icon: Icon,
    subtitle,
    accent = false,
    tone = 'default',
    children,
}: {
    title: string;
    icon: typeof Target;
    subtitle?: string;
    accent?: boolean;
    tone?: 'default' | 'danger' | 'success';
    children: React.ReactNode;
}) {
    return (
        <section
            className={`rounded-2xl border p-5 shadow-[0_8px_28px_rgba(76,29,149,0.035)] sm:p-6 ${accent ? 'border-violet-100 bg-[linear-gradient(135deg,rgba(124,58,237,0.065),rgba(255,255,255,0.96))]' : 'border-slate-200 bg-white'}`}
        >
            <header className="mb-4 flex gap-3">
                <span
                    className={`flex size-8 shrink-0 items-center justify-center ${tone === 'danger' ? 'text-rose-500' : tone === 'success' ? 'text-emerald-600' : 'text-primary'}`}
                >
                    <Icon className="size-7" strokeWidth={2.5} />
                </span>
                <div>
                    <h2 className="font-extrabold text-slate-950">{title}</h2>
                    {subtitle && (
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            {subtitle}
                        </p>
                    )}
                </div>
            </header>
            {children}
        </section>
    );
}
function Source({
    icon: Icon,
    title,
    detail,
}: {
    icon: typeof FileText;
    title: string;
    detail: string;
}) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-5" />
            </span>
            <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">{title}</p>
                <p className="truncate text-sm text-slate-500">{detail}</p>
            </div>
        </div>
    );
}
function ScoreBreakdown({
    breakdown,
}: {
    breakdown: MatchScoreBreakdown;
}) {
    const rows = [
        ['Kỹ năng bắt buộc', breakdown.requiredSkills],
        ['Kỹ năng ưu tiên', breakdown.preferredSkills],
        ['Kinh nghiệm và vai trò', breakdown.experienceAndRole],
        ['Minh chứng trách nhiệm', breakdown.responsibilityEvidence],
        ['Học vấn và lĩnh vực', breakdown.educationAndDomain],
    ] as const;

    return (
        <div className="mt-4 grid gap-x-5 gap-y-4 xl:grid-cols-2">
            {rows.map(([label, dimension]) => {
                const percentage =
                    (dimension.earned / dimension.maximum) * 100;
                return (
                    <div key={label}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="min-w-0 text-xs leading-5 font-bold text-slate-600">
                                {label}
                            </span>
                            <span className="shrink-0 text-xs font-extrabold text-slate-800">
                                {dimension.earned}/{dimension.maximum}
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="bg-primary h-full rounded-full transition-[width]"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <p className="mt-1.5 text-xs leading-5 text-slate-500">
                            {dimension.reason}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
function ScoreRing({ score }: { score: number }) {
    const normalizedScore = Math.min(100, Math.max(0, score));
    return (
        <div
            role="img"
            aria-label={`Điểm đối chiếu ${score} trên 100`}
            className="relative mx-auto size-44"
        >
            <svg
                viewBox="0 0 176 176"
                className="size-full -rotate-90"
                aria-hidden="true"
            >
                <circle
                    cx="88"
                    cy="88"
                    r="72"
                    fill="none"
                    stroke="#d8d5e8"
                    strokeWidth="14"
                />
                <circle
                    cx="88"
                    cy="88"
                    r="72"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="14"
                    pathLength="100"
                    strokeDasharray={`${normalizedScore} ${100 - normalizedScore}`}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                    <strong className="block text-[34px] leading-none font-black text-slate-950">
                        {score}%
                    </strong>
                    <span className="mt-2 block text-xs font-bold text-slate-500">
                        Điểm phù hợp
                    </span>
                </div>
            </div>
        </div>
    );
}
function Detail({
    icon: Icon,
    label,
    value,
    description,
    href,
    action,
    divided = false,
}: {
    icon: typeof FileText;
    label: string;
    value: string;
    description: string;
    href: string;
    action: string;
    divided?: boolean;
}) {
    return (
        <div
            className={`flex items-center gap-3 bg-white p-3 ${divided ? 'border-t border-slate-100' : ''}`}
        >
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-6" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="truncate text-[15px] font-extrabold text-slate-900">
                    {value}
                </p>
                <p className="truncate text-xs text-slate-500">{description}</p>
            </div>
            <Link
                href={href}
                className="text-primary hidden shrink-0 items-center gap-1.5 rounded-md border border-violet-100 px-3 py-3 text-sm font-bold shadow-sm transition-colors hover:bg-violet-50 sm:inline-flex"
            >
                {action}
                <ExternalLink className="size-3.5" />
            </Link>
        </div>
    );
}
function Meta({
    icon: Icon,
    label,
    value,
    description,
    status = false,
}: {
    icon?: typeof Target;
    label: string;
    value: string;
    description?: string;
    status?: boolean;
}) {
    return (
        <div className="relative flex min-h-20 min-w-0 items-center gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0 sm:border-t-0 sm:before:absolute sm:before:inset-y-3 sm:before:left-0 sm:before:w-px sm:before:bg-slate-200 sm:first:before:hidden">
            {Icon && (
                <Icon
                    className="size-6 shrink-0 text-slate-500"
                    strokeWidth={2}
                    aria-hidden="true"
                />
            )}
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                {status ? (
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-sm bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                        {value}
                    </span>
                ) : (
                    <>
                        <p className="mt-0.5 text-sm leading-5 font-bold break-words text-slate-700">
                            {value}
                        </p>
                        {description && (
                            <p className="text-xs font-semibold text-slate-500">
                                {description}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
function Insights({
    title,
    icon,
    items,
    danger = false,
}: {
    title: string;
    icon: typeof Target;
    items: MatchInsight[];
    danger?: boolean;
}) {
    return (
        <Card title={title} icon={icon} tone={danger ? 'danger' : 'default'}>
            <ol className="space-y-3">
                {items.map((item, index) => (
                    <li key={`${item.title}-${index}`} className="flex gap-3">
                        <span
                            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${danger ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'}`}
                        >
                            {index + 1}
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                {item.title}
                            </h3>
                            <p className="mt-0.5 text-sm leading-6 text-slate-600">
                                {item.description}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </Card>
    );
}
function History({
    items,
    currentId,
    page,
    totalPages,
    pending,
    onPageChange,
}: {
    items: CvJdMatchSummary[];
    currentId: string;
    page: number;
    totalPages: number;
    pending: boolean;
    onPageChange: (page: number) => void;
}) {
    return (
        <Card
            title="Lịch sử đối chiếu"
            icon={Clock3}
            subtitle="Các lần đối chiếu của cùng cặp CV và JD."
        >
            <div className="-mt-2 mb-3 flex justify-end">
                <Link
                    href="/matching"
                    className="text-primary inline-flex items-center gap-1 text-xs font-bold hover:underline"
                >
                    Xem tất cả
                    <ArrowRight className="size-3.5" />
                </Link>
            </div>
            {items.length ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-[1fr_52px_84px_auto] gap-2 bg-violet-50/70 px-3 py-2 text-[11px] font-extrabold text-slate-500">
                        <span>Ngày</span>
                        <span className="text-center">Điểm</span>
                        <span>Trạng thái</span>
                        <span className="text-right">Thao tác</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className={`grid grid-cols-[1fr_52px_84px_auto] items-center gap-2 px-3 py-2.5 text-xs ${item.id === currentId ? 'bg-violet-50/40' : 'bg-white'}`}
                            >
                                <span className="font-semibold text-slate-600">
                                    {formatDate(item.createdAt)}
                                </span>
                                <MiniScore
                                    status={item.status}
                                    score={item.matchScore}
                                />
                                <span
                                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 font-bold ${item.status === 'FAILED' ? 'bg-rose-50 text-rose-600' : item.status === 'PROCESSING' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
                                >
                                    {statusLabel(item.status)}
                                </span>
                                <Link
                                    href={`/matching/${item.id}`}
                                    className="text-primary text-right font-bold hover:underline"
                                >
                                    {item.status === 'FAILED'
                                        ? 'Chi tiết'
                                        : 'Kết quả'}
                                </Link>
                            </div>
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-3 py-2.5">
                            <span className="text-xs font-semibold text-slate-500">
                                Trang {page} / {totalPages}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    aria-label="Trang lịch sử trước"
                                    disabled={pending || page <= 1}
                                    className="text-primary grid size-8 place-items-center rounded-lg border border-slate-200 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() => onPageChange(page - 1)}
                                >
                                    <ChevronLeft className="size-4" strokeWidth={2.5} />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Trang lịch sử tiếp theo"
                                    disabled={pending || page >= totalPages}
                                    className="text-primary grid size-8 place-items-center rounded-lg border border-slate-200 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() => onPageChange(page + 1)}
                                >
                                    <ChevronRight className="size-4" strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-sm text-slate-500">
                    Chưa có lịch sử đối chiếu.
                </p>
            )}
        </Card>
    );
}
function MiniScore({
    status,
    score,
}: {
    status: CvJdMatchStatus;
    score: number | null;
}) {
    if (status !== 'COMPLETED' || score === null)
        return <span className="text-center font-bold text-slate-400">—</span>;
    const rounded = Math.round(score);
    const normalizedScore = Math.min(100, Math.max(0, rounded));
    const color =
        rounded >= 75 ? '#10b981' : rounded >= 50 ? '#f59e0b' : '#f43f5e';
    return (
        <span className="relative mx-auto grid size-9 place-items-center text-[10px] font-black">
            <svg
                viewBox="0 0 36 36"
                className="absolute inset-0 size-full -rotate-90"
                aria-hidden="true"
            >
                <circle
                    cx="18"
                    cy="18"
                    r="14.5"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="3"
                />
                <circle
                    cx="18"
                    cy="18"
                    r="14.5"
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    pathLength="100"
                    strokeDasharray={`${normalizedScore} ${100 - normalizedScore}`}
                    strokeLinecap="round"
                />
            </svg>
            <span className="relative" style={{ color }}>
                {rounded}%
            </span>
        </span>
    );
}
function Lifecycle({ status }: { status: CvJdMatchStatus }) {
    const failed = status === 'FAILED';
    return (
        <div className="mt-6">
            <Card
                title={
                    failed
                        ? 'Đối chiếu chưa thành công'
                        : 'Đang phân tích mức độ phù hợp'
                }
                icon={failed ? AlertTriangle : RefreshCw}
            >
                <p className="text-sm text-slate-600">
                    {failed
                        ? 'Bạn có thể thử lại mà không ảnh hưởng đến các kết quả trước.'
                        : 'Kết quả sẽ được cập nhật sau khi phân tích hoàn tất.'}
                </p>
            </Card>
        </div>
    );
}
function formatShortDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(
        new Date(value),
    );
}
function formatDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}
function statusLabel(status: CvJdMatchStatus) {
    return status === 'COMPLETED'
        ? 'Hoàn tất'
        : status === 'FAILED'
          ? 'Thất bại'
          : 'Đang xử lý';
}
