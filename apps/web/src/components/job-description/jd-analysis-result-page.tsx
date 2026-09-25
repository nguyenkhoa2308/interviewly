'use client';

import Link from 'next/link';
import {
    BrainCircuit, BriefcaseBusiness, CheckCircle2, Clock3,
    FileText, Lightbulb, ListChecks, MessageSquareText, RefreshCw,
    Sparkles, Star, Tag, Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import {
    useAnalyzeJobDescription, useJdAnalysisHistory, useJobDescription,
    useLatestJdAnalysis,
} from '@/hooks/job-description';
import { ApiError } from '@/lib/api-error';
import type { JdAnalysis } from '@/types/job-description';

export function JdAnalysisResultPage({ id }: { id: string }) {
    const [historyPage, setHistoryPage] = useState(1);
    const jd = useJobDescription(id);
    const latest = useLatestJdAnalysis(id);
    const history = useJdAnalysisHistory(id, {
        page: historyPage,
        limit: 5,
    });
    const analyze = useAnalyzeJobDescription(id);

    const rerun = async () => {
        try {
            await analyze.mutateAsync();
            toast.success('Đã cập nhật kết quả phân tích.');
        } catch (error) {
            const conflict = error instanceof ApiError && error.statusCode === 409;
            toast.error(
                conflict ? 'JD đang được phân tích' : 'Phân tích lại thất bại',
                {
                    description: conflict
                        ? 'Vui lòng chờ lần phân tích hiện tại hoàn tất.'
                        : error instanceof Error
                          ? error.message
                          : 'Kết quả trước đó vẫn được giữ nguyên.',
                },
            );
        }
    };

    if (jd.isPending || latest.isPending) return <AnalysisSkeleton />;
    if (!jd.data) return <Empty title="Không tìm thấy JD" id={id} />;
    if (!latest.data) {
        return (
            <Empty
                title="JD chưa có kết quả phân tích hoàn tất"
                id={id}
                action={() => void rerun()}
                pending={analyze.isPending}
            />
        );
    }

    const analysis = latest.data;
    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <PageBreadcrumb
                items={[
                    { label: 'Mô tả công việc', href: '/job-descriptions' },
                    {
                        label: jd.data.title,
                        href: `/job-descriptions/${id}`,
                    },
                    { label: 'Kết quả phân tích' },
                ]}
                className="mb-5"
            />
            <AnalysisHeader
                title={jd.data.title}
                company={jd.data.company}
                analysis={analysis}
                pending={analyze.isPending}
                onAnalyze={() => void rerun()}
            />

            <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
                <div className="space-y-5">
                    {analysis.summary && <SummaryCard summary={analysis.summary} />}
                    {(analysis.requiredSkills?.length ||
                        analysis.preferredSkills?.length) && (
                        <SkillsCard
                            required={analysis.requiredSkills}
                            preferred={analysis.preferredSkills}
                        />
                    )}
                    <NumberedCard
                        icon={ListChecks}
                        title="Trách nhiệm chính"
                        description="Các trách nhiệm được nhận diện từ mô tả công việc."
                        items={analysis.responsibilities}
                    />
                    <NumberedCard
                        icon={CheckCircle2}
                        title="Yêu cầu của vị trí"
                        description="Những yêu cầu chuyên môn và kinh nghiệm của vai trò."
                        items={analysis.requirements}
                    />
                    <KeywordCard items={analysis.keywords} />
                </div>

                <aside className="space-y-5">
                    <RoleCard analysis={analysis} />
                    <NumberedCard
                        icon={MessageSquareText}
                        title="Trọng tâm phỏng vấn"
                        description="Các chủ đề có khả năng được đề cập trong buổi phỏng vấn."
                        items={analysis.interviewFocus}
                    />
                    <InsightCard items={analysis.insights} />
                    <HistoryCard
                        items={history.data?.items ?? []}
                        pagination={history.data?.pagination}
                        pending={history.isPending}
                        error={history.isError}
                        page={historyPage}
                        onPageChange={setHistoryPage}
                        onRetry={() => void history.refetch()}
                    />
                </aside>
            </div>
        </main>
    );
}

function AnalysisHeader({
    title,
    company,
    analysis,
    pending,
    onAnalyze,
}: {
    title: string;
    company: string | null;
    analysis: JdAnalysis;
    pending: boolean;
    onAnalyze: () => void;
}) {
    return (
        <header className="border-b border-slate-200 pb-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                            <BrainCircuit className="size-5" aria-hidden="true" />
                        </span>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                            Kết quả phân tích AI
                        </h1>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <p className="text-lg font-extrabold text-slate-900 sm:text-xl">
                            {title}
                        </p>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            Đã phân tích
                        </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-500">
                        {company && (
                            <span className="inline-flex items-center gap-2">
                                <BriefcaseBusiness className="size-4 text-slate-400" aria-hidden="true" />
                                {company}
                            </span>
                        )}
                        {analysis.completedAt && (
                            <span className="inline-flex items-center gap-2">
                                <Clock3 className="text-primary size-4" aria-hidden="true" />
                                Phân tích {formatDate(analysis.completedAt)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex w-full flex-wrap justify-end gap-2.5 lg:w-auto">
                    <Button
                        className="h-11 rounded-sm px-5 font-extrabold"
                        disabled={pending}
                        onClick={onAnalyze}
                    >
                        <RefreshCw className={`size-4 ${pending ? 'animate-spin' : ''}`} />
                        {pending ? 'Đang phân tích...' : 'Phân tích lại'}
                    </Button>
                </div>
            </div>
        </header>
    );
}

function SummaryCard({ summary }: { summary: string }) {
    return (
        <Card>
            <SectionTitle icon={FileText} title="Tổng quan phân tích" />
            <div className="mt-4 rounded-xl bg-violet-50/70 p-5">
                <p className="text-[15px] leading-7 font-medium text-slate-700">
                    {summary}
                </p>
            </div>
        </Card>
    );
}

function RoleCard({ analysis }: { analysis: JdAnalysis }) {
    return (
        <Card>
            <SectionTitle icon={Target} title="Thông tin vai trò" />
            <div className="mt-4 divide-y divide-violet-100 rounded-xl bg-violet-50/70 px-4">
                <RoleMetric
                    icon={BriefcaseBusiness}
                    label="Vai trò nhận diện"
                    value={analysis.detectedRole || 'Chưa xác định'}
                />
                <RoleMetric
                    icon={Target}
                    label="Cấp độ kinh nghiệm"
                    value={analysis.seniority || 'Chưa xác định'}
                />
            </div>
        </Card>
    );
}

function RoleMetric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Target;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 py-4">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-0.5 font-extrabold break-words text-slate-950">{value}</p>
            </div>
        </div>
    );
}

function SkillsCard({
    required,
    preferred,
}: {
    required: string[] | null;
    preferred: string[] | null;
}) {
    const total = (required?.length ?? 0) + (preferred?.length ?? 0);
    return (
        <Card>
            <div className="flex items-start justify-between gap-3">
                <SectionTitle
                    icon={Tag}
                    title="Yêu cầu kỹ năng"
                    description="Kỹ năng bắt buộc và ưu tiên được trích xuất từ JD."
                />
                <span className="bg-primary/10 text-primary shrink-0 rounded-full px-3 py-1 text-xs font-extrabold">
                    {total} kỹ năng
                </span>
            </div>
            {!!required?.length && (
                <SkillGroup
                    label="Kỹ năng bắt buộc"
                    items={required}
                    markerClass="bg-rose-400"
                />
            )}
            {!!preferred?.length && (
                <SkillGroup
                    label="Kỹ năng ưu tiên"
                    items={preferred}
                    markerClass="bg-amber-400"
                    separated={Boolean(required?.length)}
                />
            )}
        </Card>
    );
}

function SkillGroup({
    label,
    items,
    markerClass,
    separated = false,
}: {
    label: string;
    items: string[];
    markerClass: string;
    separated?: boolean;
}) {
    return (
        <div className={separated ? 'mt-5 border-t border-slate-100 pt-5' : 'mt-5'}>
            <p className="flex items-center gap-2 text-sm font-extrabold text-slate-700">
                <span className={`size-2.5 rounded-full ${markerClass}`} aria-hidden="true" />
                {label}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                {items.map((item) => (
                    <span
                        key={item}
                        className="bg-primary/8 text-primary max-w-full rounded-full px-3 py-1.5 text-xs font-bold break-words"
                    >
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}

function NumberedCard({
    icon,
    title,
    description,
    items,
}: {
    icon: typeof Target;
    title: string;
    description: string;
    items: string[] | null;
}) {
    if (!items?.length) return null;
    return (
        <Card>
            <SectionTitle icon={icon} title={title} description={description} />
            <ol className="mt-4 space-y-3">
                {items.map((item, index) => (
                    <li
                        key={item}
                        className="grid grid-cols-[30px_minmax(0,1fr)] items-start gap-3 text-sm leading-6 font-medium text-slate-600"
                    >
                        <span className="bg-primary/10 text-primary flex size-7.5 items-center justify-center rounded-full text-xs font-extrabold">
                            {index + 1}
                        </span>
                        <span>{item}</span>
                    </li>
                ))}
            </ol>
        </Card>
    );
}

function InsightCard({ items }: { items: string[] | null }) {
    if (!items?.length) return null;
    return (
        <Card className="border-violet-200 bg-violet-50/45">
            <SectionTitle
                icon={Lightbulb}
                title="Gợi ý chuẩn bị phỏng vấn"
                description="Nhận định từ nội dung và yêu cầu của JD."
            />
            <ul className="mt-4 space-y-2.5">
                {items.map((item) => (
                    <li
                        key={item}
                        className="flex gap-3 text-sm leading-6 font-medium text-slate-600"
                    >
                        <Sparkles className="text-primary mt-1.5 size-3.5 shrink-0" aria-hidden="true" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function KeywordCard({ items }: { items: string[] | null }) {
    if (!items?.length) return null;
    return (
        <Card>
            <SectionTitle
                icon={Star}
                title="Từ khóa quan trọng"
                description="Các từ khóa nổi bật trong mô tả công việc."
            />
            <div className="mt-4 flex flex-wrap gap-2">
                {items.map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                        {item}
                    </span>
                ))}
            </div>
        </Card>
    );
}

function HistoryCard({
    items,
    pagination,
    pending,
    error,
    page,
    onPageChange,
    onRetry,
}: {
    items: Array<{
        id: string;
        status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
        createdAt: string;
    }>;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    pending: boolean;
    error: boolean;
    page: number;
    onPageChange: (page: number) => void;
    onRetry: () => void;
}) {
    return (
        <Card>
            <SectionTitle
                icon={Clock3}
                title="Lịch sử phân tích"
                description="Các lần phân tích được lưu độc lập."
            />
            {pending ? (
                <div className="mt-4 space-y-2" aria-label="Đang tải lịch sử phân tích">
                    {[0, 1, 2].map((item) => (
                        <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                </div>
            ) : error ? (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    <p>Không thể tải lịch sử phân tích.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
                        Thử lại
                    </Button>
                </div>
            ) : items.length === 0 ? (
                <p className="mt-4 text-sm font-medium text-slate-500">
                    Chưa có lần phân tích nào.
                </p>
            ) : (
                <>
                    <div className="mt-4 divide-y divide-slate-100">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between gap-4 py-3 text-sm"
                            >
                                <span className="font-semibold text-slate-600">
                                    {formatDate(item.createdAt)}
                                </span>
                                <AnalysisStatus status={item.status} />
                            </div>
                        ))}
                    </div>
                    {pagination && pagination.totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => onPageChange(page - 1)}
                            >
                                Trang trước
                            </Button>
                            <span className="text-sm font-bold text-slate-500">
                                {page}/{pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.totalPages}
                                onClick={() => onPageChange(page + 1)}
                            >
                                Trang sau
                            </Button>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}

function AnalysisStatus({
    status,
}: {
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
}) {
    const styles =
        status === 'COMPLETED'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'FAILED'
              ? 'bg-red-50 text-red-600'
              : 'bg-amber-50 text-amber-700';
    const label =
        status === 'COMPLETED'
            ? 'Hoàn tất'
            : status === 'FAILED'
              ? 'Thất bại'
              : 'Đang xử lý';
    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${styles}`}>
            {label}
        </span>
    );
}

function Card({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.035)] sm:p-6 ${className}`}>
            {children}
        </section>
    );
}

function SectionTitle({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Target;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
                {description && (
                    <p className="mt-0.5 text-xs leading-5 font-medium text-slate-500">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

function AnalysisSkeleton() {
    return (
        <main
            aria-label="Đang tải kết quả phân tích"
            aria-busy="true"
            className="mx-auto w-full max-w-[1600px] animate-pulse px-4 py-6 sm:px-6 lg:px-8"
        >
            <div className="h-32 rounded-2xl bg-slate-100" />
            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
                <div className="h-[580px] rounded-2xl bg-slate-100" />
                <div className="h-[420px] rounded-2xl bg-slate-100" />
            </div>
        </main>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(value));
}

function Empty({
    title,
    id,
    action,
    pending,
}: {
    title: string;
    id: string;
    action?: () => void;
    pending?: boolean;
}) {
    return (
        <main className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col items-center justify-center px-6 text-center">
            <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
                <BrainCircuit className="size-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold text-slate-950">{title}</h1>
            <p className="mt-2 text-sm leading-6 font-medium text-slate-500">
                Phân tích JD để xem vai trò, kỹ năng và trọng tâm phỏng vấn.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button asChild variant="outline" className="h-11 rounded-sm px-5 font-extrabold">
                    <Link href={`/job-descriptions/${id}`}>Xem JD</Link>
                </Button>
                {action && (
                    <Button
                        className="h-11 rounded-sm px-5 font-extrabold"
                        onClick={action}
                        disabled={pending}
                    >
                        <Sparkles className="size-4" />
                        {pending ? 'Đang phân tích...' : 'Phân tích JD'}
                    </Button>
                )}
            </div>
        </main>
    );
}
