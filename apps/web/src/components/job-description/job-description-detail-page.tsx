'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Edit3,
    FileText,
    MessageSquareText,
    Save,
    Sparkles,
    Tag,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import {
    useAnalyzeJobDescription,
    useDeleteJobDescription,
    useJobDescription,
    useLatestJdAnalysis,
    useUpdateJobDescription,
} from '@/hooks/job-description';
import { ApiError } from '@/lib/api-error';
import type { JdAnalysis, JobDescriptionDetail } from '@/types/job-description';

export function JobDescriptionDetailPage({ id }: { id: string }) {
    const router = useRouter();
    const query = useJobDescription(id);
    const latest = useLatestJdAnalysis(id);
    const update = useUpdateJobDescription(id);
    const remove = useDeleteJobDescription();
    const analyze = useAnalyzeJobDescription(id);
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [content, setContent] = useState('');

    if (query.isPending) return <DetailSkeleton />;
    if (query.isError || !query.data) {
        return (
            <State
                title="Không thể mở mô tả công việc"
                action={() => void query.refetch()}
            />
        );
    }
    const jd = query.data;
    const analysis = latest.data ?? null;
    const beginEditing = () => {
        setTitle(jd.title);
        setCompany(jd.company ?? '');
        setContent(jd.content);
        setEditing(true);
    };
    const save = async () => {
        try {
            await update.mutateAsync({
                title: title.trim(),
                company: company.trim() || null,
                content: content.trim(),
            });
            setEditing(false);
            toast.success('Đã cập nhật JD.');
        } catch (error) {
            toast.error('Không thể cập nhật', {
                description:
                    error instanceof Error
                        ? error.message
                        : 'Vui lòng thử lại.',
            });
        }
    };
    const runAnalysis = async () => {
        try {
            await analyze.mutateAsync();
            toast.success('Phân tích JD đã hoàn tất.');
        } catch (error) {
            const conflict =
                error instanceof ApiError && error.statusCode === 409;
            toast.error(
                conflict ? 'JD đang được phân tích' : 'Không thể phân tích JD',
                {
                    description: conflict
                        ? 'Vui lòng chờ lần phân tích hiện tại hoàn tất.'
                        : error instanceof Error
                          ? error.message
                          : 'Vui lòng thử lại.',
                },
            );
        }
    };

    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <PageBreadcrumb
                items={[
                    { label: 'Mô tả công việc', href: '/job-descriptions' },
                    { label: jd.title },
                ]}
            />
            <DetailHeader
                jd={jd}
                analysis={analysis}
                editing={editing}
                title={title}
                company={company}
                setTitle={setTitle}
                setCompany={setCompany}
                analysisPending={analyze.isPending}
                updatePending={update.isPending}
                onAnalyze={() => void runAnalysis()}
                onEdit={beginEditing}
                onCancel={() => setEditing(false)}
                onSave={() => void save()}
                onDelete={() => setConfirmDelete(true)}
            />
            <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
                <div className="space-y-5">
                    <JobInformationCard jd={jd} analysis={analysis} />
                    <JobDescriptionCard
                        content={editing ? content : jd.content}
                        editing={editing}
                        onChange={setContent}
                    />
                </div>
                <aside className="space-y-4">
                    {analysis ? (
                        <>
                            <AnalysisOverview
                                analysis={analysis}
                                detailHref={`/job-descriptions/${id}/analysis`}
                            />
                            {!!analysis.requiredSkills?.length && (
                                <KeyRequirements
                                    items={analysis.requiredSkills}
                                    detailHref={`/job-descriptions/${id}/analysis`}
                                />
                            )}
                            {!!analysis.interviewFocus?.length && (
                                <InterviewFocus
                                    items={analysis.interviewFocus}
                                    detailHref={`/job-descriptions/${id}/analysis`}
                                />
                            )}
                        </>
                    ) : (
                        <NoAnalysisCard
                            pending={analyze.isPending}
                            onAnalyze={() => void runAnalysis()}
                        />
                    )}
                </aside>
            </div>
            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="Xóa mô tả công việc?"
                description="JD và toàn bộ lịch sử phân tích sẽ không còn truy cập được."
                confirmLabel="Xóa JD"
                destructive
                onConfirm={async () => {
                    try {
                        await remove.mutateAsync(id);
                        toast.success('Đã xóa JD.');
                        router.replace('/job-descriptions');
                    } catch {
                        toast.error('Không thể xóa JD.');
                    }
                }}
            />
        </main>
    );
}

function DetailHeader({
    jd,
    analysis,
    editing,
    title,
    company,
    setTitle,
    setCompany,
    analysisPending,
    updatePending,
    onAnalyze,
    onEdit,
    onCancel,
    onSave,
    onDelete,
}: {
    jd: JobDescriptionDetail;
    analysis: JdAnalysis | null;
    editing: boolean;
    title: string;
    company: string;
    setTitle: (value: string) => void;
    setCompany: (value: string) => void;
    analysisPending: boolean;
    updatePending: boolean;
    onAnalyze: () => void;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    onDelete: () => void;
}) {
    return (
        <header className="mt-5 border-b border-slate-200 pb-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    {editing ? (
                        <div className="max-w-2xl space-y-3">
                            <Input
                                aria-label="Vị trí tuyển dụng"
                                value={title}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                className="h-12 rounded-sm text-lg font-extrabold"
                            />
                            <Input
                                aria-label="Tên công ty"
                                value={company}
                                onChange={(event) =>
                                    setCompany(event.target.value)
                                }
                                placeholder="Tên công ty"
                                className="h-11 rounded-sm font-semibold"
                            />
                        </div>
                    ) : (
                        <>
                            <div className="flex min-w-0 flex-wrap items-center gap-3">
                                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                                    <FileText
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <h1 className="min-w-0 text-3xl leading-tight font-extrabold tracking-tight break-words text-slate-950 sm:text-4xl">
                                    {jd.title}
                                </h1>
                                {analysis && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
                                        <CheckCircle2
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        Đã phân tích
                                    </span>
                                )}
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-semibold text-slate-500">
                                <HeaderMeta icon={Building2}>
                                    {jd.company || 'Chưa có tên công ty'}
                                </HeaderMeta>
                                <HeaderMeta icon={CalendarDays}>
                                    Tạo {formatDate(jd.createdAt)}
                                </HeaderMeta>
                                <HeaderMeta icon={Clock3}>
                                    Cập nhật {formatDate(jd.updatedAt)}
                                </HeaderMeta>
                                {analysis?.completedAt && (
                                    <HeaderMeta icon={Sparkles}>
                                        Phân tích{' '}
                                        {formatDate(analysis.completedAt)}
                                    </HeaderMeta>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="flex w-full flex-wrap justify-end gap-2.5 lg:w-auto">
                    {editing ? (
                        <>
                            <ActionButton
                                variant="outline"
                                disabled={updatePending}
                                onClick={onCancel}
                            >
                                <X className="size-4" /> Hủy
                            </ActionButton>
                            <ActionButton
                                disabled={updatePending}
                                onClick={onSave}
                            >
                                <Save className="size-4" />
                                {updatePending ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </ActionButton>
                        </>
                    ) : (
                        <>
                            <ActionButton
                                disabled={analysisPending}
                                onClick={onAnalyze}
                            >
                                <Sparkles className="size-4" />
                                {analysisPending
                                    ? 'Đang phân tích...'
                                    : analysis
                                      ? 'Phân tích lại'
                                      : 'Phân tích JD'}
                            </ActionButton>
                            <ActionButton variant="outline" onClick={onEdit}>
                                <Edit3 className="size-4" /> Chỉnh sửa
                            </ActionButton>
                            <ActionButton
                                // variant=""
                                className="!bg-destructive !border-destructive hover:!bg-destructive/80 rounded-sm font-bold text-white hover:text-white"
                                onClick={onDelete}
                            >
                                <Trash2 className="size-4" /> Xóa
                            </ActionButton>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

function HeaderMeta({
    icon: Icon,
    children,
}: {
    icon: typeof FileText;
    children: React.ReactNode;
}) {
    return (
        <span className="inline-flex items-center gap-2">
            <Icon className="size-4 text-slate-400" aria-hidden="true" />
            {children}
        </span>
    );
}

function ActionButton({
    className = '',
    ...props
}: React.ComponentProps<typeof Button>) {
    return (
        <Button
            {...props}
            className={`h-11 rounded-sm px-5 font-extrabold ${className}`}
        />
    );
}

function JobInformationCard({
    jd,
    analysis,
}: {
    jd: JobDescriptionDetail;
    analysis: JdAnalysis | null;
}) {
    return (
        <Card>
            <CardTitle icon={FileText}>Thông tin công việc</CardTitle>
            <dl className="mt-4 grid gap-x-8 gap-y-4 rounded-xl bg-slate-50/80 p-4 sm:grid-cols-2 sm:p-5">
                <Info label="Công ty" value={jd.company || 'Chưa cập nhật'} />
                <Info label="Ngày tạo" value={formatDate(jd.createdAt)} />
                <Info
                    label="Cập nhật gần nhất"
                    value={formatDate(jd.updatedAt)}
                />
                <Info
                    label="Phân tích gần nhất"
                    value={
                        analysis?.completedAt
                            ? formatDate(analysis.completedAt)
                            : 'Chưa phân tích'
                    }
                />
            </dl>
        </Card>
    );
}

function JobDescriptionCard({
    content,
    editing,
    onChange,
}: {
    content: string;
    editing: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <Card>
            <CardTitle icon={FileText}>Nội dung công việc</CardTitle>
            {editing ? (
                <textarea
                    aria-label="Nội dung mô tả công việc"
                    value={content}
                    onChange={(event) => onChange(event.target.value)}
                    rows={24}
                    maxLength={50000}
                    className="focus-visible:border-primary focus-visible:ring-primary/20 mt-5 w-full resize-y rounded-xl border border-slate-200 p-4 text-[15px] leading-7 outline-none focus-visible:ring-3"
                />
            ) : (
                <JobDescriptionContent content={content} />
            )}
        </Card>
    );
}

function AnalysisOverview({
    analysis,
    detailHref,
}: {
    analysis: JdAnalysis;
    detailHref: string;
}) {
    return (
        <Card className="border-violet-100">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle icon={Sparkles}>Tổng quan phân tích AI</CardTitle>
                {analysis.completedAt && (
                    <span className="text-xs font-semibold text-slate-400">
                        {formatDate(analysis.completedAt)}
                    </span>
                )}
            </div>
            <div className="mt-4 divide-y divide-violet-100 rounded-xl bg-violet-50/70 px-4 sm:px-5">
                <AnalysisMetric
                    icon={BriefcaseBusiness}
                    label="Vai trò nhận diện"
                    value={analysis.detectedRole || 'Chưa xác định'}
                />
                <AnalysisMetric
                    icon={Building2}
                    label="Cấp độ kinh nghiệm"
                    value={analysis.seniority || 'Chưa xác định'}
                />
            </div>
            <Link
                href={detailHref}
                className="text-primary mt-4 flex h-11 items-center justify-center gap-2 rounded-sm border border-violet-200 bg-violet-50/70 text-sm font-extrabold transition-colors hover:bg-violet-100"
            >
                Xem toàn bộ kết quả
                <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
        </Card>
    );
}

function KeyRequirements({
    items,
    detailHref,
}: {
    items: string[];
    detailHref: string;
}) {
    return (
        <Card>
            <PreviewTitle
                icon={Tag}
                title="Yêu cầu chính"
                count={items.length}
                href={detailHref}
            />
            <div className="mt-4 flex flex-wrap gap-2">
                {items.slice(0, 10).map((item) => (
                    <span
                        key={item}
                        className="bg-primary/8 text-primary rounded-full px-3 py-1.5 text-xs font-bold"
                    >
                        {item}
                    </span>
                ))}
            </div>
        </Card>
    );
}

function InterviewFocus({
    items,
    detailHref,
}: {
    items: string[];
    detailHref: string;
}) {
    return (
        <Card>
            <PreviewTitle
                icon={MessageSquareText}
                title="Trọng tâm phỏng vấn"
                count={items.length}
                href={detailHref}
            />
            <ol className="mt-4 space-y-3">
                {items.slice(0, 4).map((item, index) => (
                    <li
                        key={item}
                        className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 text-sm leading-6 font-medium text-slate-600"
                    >
                        <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-full text-xs font-extrabold">
                            {index + 1}
                        </span>
                        <span>{item}</span>
                    </li>
                ))}
            </ol>
        </Card>
    );
}

function NoAnalysisCard({
    pending,
    onAnalyze,
}: {
    pending: boolean;
    onAnalyze: () => void;
}) {
    return (
        <Card className="border-violet-100 text-center">
            <span className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-2xl">
                <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-extrabold text-slate-950">
                Chưa có bản phân tích
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 font-medium text-slate-500">
                Phân tích JD để nhận diện vai trò, kỹ năng cần thiết và những
                chủ đề nên tập trung khi phỏng vấn.
            </p>
            <Button
                className="mt-5 h-11 rounded-sm px-5 font-extrabold"
                disabled={pending}
                onClick={onAnalyze}
            >
                <Sparkles className="size-4" />
                {pending ? 'Đang phân tích...' : 'Phân tích JD'}
            </Button>
        </Card>
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
        <section
            className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.035)] sm:p-6 ${className}`}
        >
            {children}
        </section>
    );
}

function CardTitle({
    icon: Icon,
    children,
}: {
    icon: typeof FileText;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="text-primary size-5" aria-hidden="true" />
            <h2 className="text-lg font-extrabold text-slate-950">
                {children}
            </h2>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid min-w-0 grid-cols-[minmax(100px,0.75fr)_minmax(0,1fr)] gap-3 text-sm">
            <dt className="font-semibold text-slate-500">{label}</dt>
            <dd className="font-bold break-words text-slate-800">{value}</dd>
        </div>
    );
}

function AnalysisMetric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof FileText;
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
                <p className="mt-0.5 font-extrabold break-words text-slate-950">
                    {value}
                </p>
            </div>
        </div>
    );
}

function PreviewTitle({
    icon: Icon,
    title,
    count,
    href,
}: {
    icon: typeof FileText;
    title: string;
    count: number;
    href: string;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <CardTitle icon={Icon}>{title}</CardTitle>
            <Link
                href={href}
                className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-bold hover:underline"
            >
                Xem tất cả ({count})
                <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
        </div>
    );
}

function JobDescriptionContent({ content }: { content: string }) {
    const lines = content
        .split(String.fromCharCode(10))
        .map((line) => line.trim())
        .filter(Boolean);

    return (
        <div className="mt-5 space-y-3 text-[15px] leading-7 text-slate-700">
            {lines.map((line, index) => {
                const bullet = getBulletContent(line);
                if (isContentHeading(line)) {
                    return (
                        <h3
                            key={index}
                            className="pt-3 text-base font-extrabold text-slate-950 first:pt-0"
                        >
                            {line.endsWith(':') ? line.slice(0, -1) : line}
                        </h3>
                    );
                }
                if (bullet) {
                    return (
                        <div
                            key={index}
                            className="grid grid-cols-[5px_minmax(0,1fr)] items-start gap-3 pl-1"
                        >
                            <span
                                aria-hidden="true"
                                className="bg-primary mt-[11px] size-1.5 rounded-full"
                            />
                            <p>{bullet}</p>
                        </div>
                    );
                }
                return <p key={index}>{line}</p>;
            })}
        </div>
    );
}

function getBulletContent(line: string) {
    const markers = ['- ', '* ', '• ', '▪ ', '◦ '];
    const marker = markers.find((item) => line.startsWith(item));
    if (marker) return line.slice(marker.length).trim();
    const numbered = line.match(/^[0-9]+[.)] +/);
    return numbered ? line.slice(numbered[0].length).trim() : null;
}

function isContentHeading(line: string) {
    const normalized = line.endsWith(':')
        ? line.slice(0, -1).trim()
        : line.trim();
    if (normalized.length > 80) return false;
    const headings = [
        'mô tả công việc',
        'trách nhiệm',
        'nhiệm vụ',
        'yêu cầu',
        'yêu cầu công việc',
        'yêu cầu ứng viên',
        'quyền lợi',
        'phúc lợi',
        'kỹ năng',
        'kinh nghiệm',
        'địa điểm làm việc',
        'thời gian làm việc',
        'mức lương',
        'about us',
        'about the role',
        'job description',
        'responsibilities',
        'requirements',
        'qualifications',
        'benefits',
        'skills',
        'experience',
    ];
    const letters = normalized.replace(/[^A-Za-zÀ-ỹ]/g, '');
    const uppercase = letters.replace(/[^A-ZÀ-Ỹ]/g, '');
    return (
        headings.includes(normalized.toLocaleLowerCase('vi-VN')) ||
        line.endsWith(':') ||
        (letters.length >= 4 && uppercase.length / letters.length > 0.8)
    );
}

function DetailSkeleton() {
    return (
        <main
            aria-label="Đang tải chi tiết JD"
            aria-busy="true"
            className="mx-auto w-full max-w-[1600px] animate-pulse px-4 py-6 sm:px-6 lg:px-8"
        >
            <div className="h-5 w-44 rounded bg-slate-100" />
            <div className="mt-6 h-28 rounded-2xl bg-slate-100" />
            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
                <div className="h-[520px] rounded-2xl bg-slate-100" />
                <div className="h-80 rounded-2xl bg-slate-100" />
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

function State({ title, action }: { title: string; action: () => void }) {
    return (
        <main className="mx-auto max-w-3xl p-8 text-center">
            <h1 className="text-xl font-bold">{title}</h1>
            <Button className="mt-4" onClick={action}>
                Thử lại
            </Button>
        </main>
    );
}
