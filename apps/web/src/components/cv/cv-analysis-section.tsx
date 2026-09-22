'use client';

import {
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    CircleHelp,
    FileText,
    LoaderCircle,
    MessageSquareWarning,
    RefreshCw,
    RotateCcw,
    Sparkles,
    Target,
    Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAnalyzeCv, useLatestCvAnalysis } from '@/hooks/cv';
import { ApiError } from '@/lib/api-error';
import { formatCvDateTime } from '@/lib/cv-formatters';
import type { CvAnalysis, CvDetail } from '@/types/cv';

export interface CvAnalysisSectionHandle {
    requestAnalysis: () => void;
}

export const CvAnalysisSection = forwardRef<
    CvAnalysisSectionHandle,
    { cv: CvDetail }
>(function CvAnalysisSection({ cv }, ref) {
    const latestQuery = useLatestCvAnalysis(cv.id);
    const analyzeMutation = useAnalyzeCv();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const canAnalyze =
        cv.processingStatus === 'READY' && Boolean(cv.extractedText?.trim());
    const latest = latestQuery.data ?? null;

    const runAnalysis = async () => {
        if (!canAnalyze || analyzeMutation.isPending) return;
        setAnalysisError(null);
        try {
            await analyzeMutation.mutateAsync({ cvId: cv.id });
            setConfirmOpen(false);
            toast.success(
                latest ? 'Đã phân tích lại CV.' : 'Phân tích CV hoàn tất.',
            );
        } catch (error) {
            const message = getCvAnalysisErrorMessage(error);
            if (!latest) setAnalysisError(message);
            toast.error('Không thể phân tích CV', {
                description: message,
            });
        }
    };

    useImperativeHandle(ref, () => ({
        requestAnalysis: () => {
            if (!canAnalyze || analyzeMutation.isPending) return;
            if (latest) setConfirmOpen(true);
            else void runAnalysis();
        },
    }));

    return (
        <section
            className="bg-primary/5 relative min-w-0 overflow-hidden rounded-2xl border border-violet-200/70 shadow-[0_8px_28px_rgba(76,57,126,0.055)]"
            aria-labelledby="cv-analysis-heading"
        >
            <div className="relative flex flex-col gap-4 px-5 pt-6 pb-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
                <div className="flex min-w-0 items-start gap-3.5">
                    <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <Sparkles className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2
                            id="cv-analysis-heading"
                            className="text-lg font-extrabold text-slate-950"
                        >
                            Phân tích CV bằng AI
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 font-semibold text-slate-500">
                            Đánh giá điểm mạnh, điểm cần cải thiện và mức độ sẵn
                            sàng cho buổi phỏng vấn.
                        </p>
                    </div>
                </div>
                {latest && (
                    <Link
                        href={`/cv/${latest.cvId}/analysis`}
                        className="text-primary inline-flex shrink-0 items-center gap-1.5 text-sm font-bold hover:underline"
                    >
                        Xem toàn bộ phân tích
                        <span aria-hidden="true">→</span>
                    </Link>
                )}
            </div>

            <div className="relative px-5 pb-6 sm:px-7 sm:pb-7">
                {latestQuery.isPending ? (
                    <AnalysisSkeleton />
                ) : latestQuery.isError ? (
                    <AnalysisQueryError
                        onRetry={() => void latestQuery.refetch()}
                    />
                ) : latest ? (
                    <CompletedAnalysis
                        analysis={latest}
                        analyzing={analyzeMutation.isPending}
                        canAnalyze={canAnalyze}
                        onRequestAnalyzeAgain={() => setConfirmOpen(true)}
                    />
                ) : analyzeMutation.isPending ? (
                    <AnalyzingState />
                ) : analysisError ? (
                    <FirstAnalysisError
                        message={analysisError}
                        onRetry={() => void runAnalysis()}
                    />
                ) : canAnalyze ? (
                    <FirstAnalysisState onAnalyze={() => void runAnalysis()} />
                ) : (
                    <UnavailableState cv={cv} />
                )}
            </div>

            <Dialog
                open={confirmOpen}
                onOpenChange={(open) =>
                    !analyzeMutation.isPending && setConfirmOpen(open)
                }
            >
                <DialogContent
                    className="max-w-md p-6"
                    showCloseButton={false}
                    onEscapeKeyDown={(event) =>
                        analyzeMutation.isPending && event.preventDefault()
                    }
                    onPointerDownOutside={(event) =>
                        analyzeMutation.isPending && event.preventDefault()
                    }
                >
                    <div className="flex gap-4">
                        <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                            <Sparkles className="size-5" aria-hidden="true" />
                        </span>
                        <div>
                            <DialogTitle>Phân tích lại CV?</DialogTitle>
                            <DialogDescription className="mt-2 leading-6">
                                Một lần phân tích mới sẽ được tạo. Kết quả trước
                                đó vẫn được giữ trong lịch sử.
                            </DialogDescription>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={analyzeMutation.isPending}
                            onClick={() => setConfirmOpen(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            aria-label="Xác nhận phân tích lại"
                            disabled={analyzeMutation.isPending}
                            onClick={() => void runAnalysis()}
                        >
                            {analyzeMutation.isPending && (
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            )}
                            {analyzeMutation.isPending
                                ? 'Đang phân tích...'
                                : 'Phân tích lại'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </section>
    );
});

function FirstAnalysisError({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-red-100 bg-red-50/60 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
                <CircleAlert
                    className="mt-0.5 size-5 shrink-0 text-red-600"
                    aria-hidden="true"
                />
                <div>
                    <h3 className="font-extrabold text-slate-900">
                        Chưa thể phân tích CV này
                    </h3>
                    <p className="mt-1 text-sm leading-6 font-medium text-slate-600">
                        {message}
                    </p>
                </div>
            </div>
            <Button
                type="button"
                variant="outline"
                className="w-full shrink-0 sm:w-auto"
                onClick={onRetry}
            >
                <RefreshCw className="size-4" aria-hidden="true" />
                Thử lại
            </Button>
        </div>
    );
}

function FirstAnalysisState({ onAnalyze }: { onAnalyze: () => void }) {
    return (
        <div className="flex flex-col gap-5 rounded-xl bg-violet-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 gap-3">
                <CheckCircle2
                    className="text-primary mt-0.5 size-5 shrink-0"
                    aria-hidden="true"
                />
                <div>
                    <h3 className="font-extrabold text-slate-900">
                        CV đã sẵn sàng để phân tích
                    </h3>
                    <p className="mt-1 text-sm leading-6 font-medium text-slate-500">
                        Quá trình có thể mất một chút thời gian. Bạn không cần
                        gửi lại nội dung CV.
                    </p>
                </div>
            </div>
            <Button className="w-full shrink-0 sm:w-auto" onClick={onAnalyze}>
                <Sparkles className="size-4" aria-hidden="true" />
                Phân tích CV
            </Button>
        </div>
    );
}

function AnalyzingState() {
    return (
        <div
            className="flex min-h-32 items-center gap-4 rounded-xl bg-violet-50/60 p-5 sm:p-6"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <LoaderCircle
                    className="size-5 animate-spin"
                    aria-hidden="true"
                />
            </span>
            <div>
                <h3 className="font-extrabold text-slate-900">
                    Đang phân tích CV của bạn...
                </h3>
                <p className="mt-1 text-sm leading-6 font-medium text-slate-500">
                    Interviewly đang đọc nội dung và tổng hợp đánh giá. Vui lòng
                    giữ trang này mở.
                </p>
            </div>
        </div>
    );
}

function CompletedAnalysis({
    analysis,
    analyzing,
    canAnalyze,
    onRequestAnalyzeAgain,
}: {
    analysis: CvAnalysis;
    analyzing: boolean;
    canAnalyze: boolean;
    onRequestAnalyzeAgain: () => void;
}) {
    const score =
        analysis.overallScore === null
            ? null
            : Math.max(0, Math.min(100, Math.round(analysis.overallScore)));

    return (
        <div aria-live="polite">
            {analyzing && (
                <div
                    className="mb-4 flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm font-bold text-violet-700"
                    aria-busy="true"
                >
                    <LoaderCircle
                        className="size-4 shrink-0 animate-spin"
                        aria-hidden="true"
                    />
                    Đang tạo phân tích mới. Kết quả gần nhất vẫn được giữ lại.
                </div>
            )}
            <div className="grid items-center gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
                <div
                    className="flex items-center justify-center"
                    aria-label={
                        score === null
                            ? 'Chưa có điểm tổng quan'
                            : `Điểm tổng quan ${score} trên 100`
                    }
                >
                    <div
                        className="flex size-28 shrink-0 items-center justify-center rounded-full p-2"
                        style={{
                            background:
                                score === null
                                    ? '#d9f3e6'
                                    : `conic-gradient(#35c779 ${score * 3.6}deg, #d9f3e6 0deg)`,
                        }}
                    >
                        <div className="flex size-full flex-col items-center justify-center rounded-full bg-white shadow-inner">
                            {score !== null && (
                                <span className="sr-only">{score}/100</span>
                            )}
                            <strong className="text-3xl font-black tracking-[-0.04em] text-slate-950">
                                {score ?? '—'}
                            </strong>
                            <span className="text-xs font-bold text-slate-500">
                                / 100
                            </span>
                        </div>
                    </div>
                </div>

                <dl className="grid min-w-0 gap-5 sm:grid-cols-3">
                    <SummaryItem
                        label="Vai trò"
                        value={analysis.detectedRole ?? 'Chưa xác định'}
                        // icon={BrainCircuit}
                        className="font-extrabold"
                    />
                    <SummaryItem
                        label="Cấp độ"
                        value={
                            analysis.detectedLevel
                                ? formatExperienceLevel(analysis.detectedLevel)
                                : 'Chưa xác định'
                        }
                        // icon={Target}
                        className="font-extrabold"
                    />
                    <SummaryItem
                        label="Phân tích lúc"
                        value={formatCvDateTime(
                            analysis.completedAt ?? analysis.createdAt,
                        )}
                        icon={CalendarDays}
                        className="flex items-center gap-3 text-sm font-bold"
                    />
                </dl>

                <div className="flex flex-col justify-center gap-2 border-t border-violet-200/70 pt-5 lg:min-w-64 lg:border-t-0 lg:border-l lg:py-1 lg:pl-7">
                    <Button asChild className="rounded-sm !p-5">
                        <Link
                            href={`/cv/${analysis.cvId}/analysis`}
                            aria-label="Xem phân tích đầy đủ"
                        >
                            <FileText className="size-4" aria-hidden="true" />
                            <span className="mt-0.5 font-bold">
                                Xem kết quả phân tích
                            </span>
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!canAnalyze || analyzing}
                        onClick={onRequestAnalyzeAgain}
                        className="text-primary !border-primary/50 hover:text-primary/90 rounded-sm !p-5 !font-bold"
                    >
                        {analyzing ? (
                            <LoaderCircle
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <RotateCcw
                                className="size-4"
                                aria-hidden="true"
                                strokeWidth={2.5}
                            />
                        )}
                        <span className="mt-0.5 !font-bold">
                            {analyzing
                                ? 'Đang phân tích lại...'
                                : 'Phân tích lại'}
                        </span>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function DetailedAnalysisReport({ analysis }: { analysis: CvAnalysis }) {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
                <InsightSection
                    title="Điểm mạnh"
                    description="Những lợi thế nên nhấn mạnh khi phỏng vấn."
                    icon={Sparkles}
                    items={analysis.strengths ?? []}
                    tone="positive"
                />
                <InsightSection
                    title="Điểm cần cải thiện"
                    description="Các nội dung nên bổ sung hoặc trình bày rõ hơn."
                    icon={Target}
                    items={analysis.weaknesses ?? []}
                    tone="warning"
                />
            </div>

            <SkillsSection skills={analysis.extractedSkills ?? []} />
            <InsightSection
                title="Rủi ro khi phỏng vấn"
                description="Những điểm nhà tuyển dụng có thể đặt câu hỏi sâu."
                icon={MessageSquareWarning}
                items={analysis.interviewRisks ?? []}
                tone="danger"
            />
            <SuggestionsSection suggestions={analysis.suggestions ?? []} />
            <QuestionsSection questions={analysis.potentialQuestions ?? []} />
        </div>
    );
}

function AnalysisBlock({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string;
    description: string;
    icon: typeof Sparkles;
    children: React.ReactNode;
}) {
    return (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_10px_34px_rgba(52,38,103,0.045)]">
            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                    <h3 className="font-extrabold text-slate-950">{title}</h3>
                    <p className="mt-0.5 text-sm leading-5 font-medium text-slate-500">
                        {description}
                    </p>
                </div>
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </section>
    );
}

function SkillsSection({
    skills,
}: {
    skills: NonNullable<CvAnalysis['extractedSkills']>;
}) {
    if (skills.length === 0) return null;
    const groups = groupSkillsByCategory(skills);

    return (
        <AnalysisBlock
            title="Kỹ năng được nhận diện"
            description="Tổng hợp từ nội dung và bằng chứng có trong CV."
            icon={Wrench}
        >
            <div className="divide-y divide-violet-100 overflow-hidden rounded-xl bg-violet-50/35">
                {groups.map((group) => (
                    <div
                        key={group.key}
                        className="grid min-w-0 gap-2 px-4 py-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start"
                    >
                        <p className="text-sm font-extrabold text-slate-800">
                            {group.label}
                        </p>
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                            {group.skills.map((skill, index) => (
                                <span
                                    key={`${skill.name}-${index}`}
                                    title={skill.evidence ?? undefined}
                                    className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700"
                                >
                                    {skill.name}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </AnalysisBlock>
    );
}

function groupSkillsByCategory(
    skills: NonNullable<CvAnalysis['extractedSkills']>,
) {
    const groups = new Map<
        string,
        {
            key: string;
            label: string;
            skills: NonNullable<CvAnalysis['extractedSkills']>;
        }
    >();

    for (const skill of skills) {
        const category = normalizeSkillCategory(skill.category);
        const current = groups.get(category.key);
        if (current) current.skills.push(skill);
        else groups.set(category.key, { ...category, skills: [skill] });
    }

    const order = ['frontend', 'backend', 'tools', 'other'];
    return [...groups.values()].sort(
        (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
    );
}

function normalizeSkillCategory(category: string | null) {
    const normalized = category?.trim().toLocaleLowerCase() ?? '';
    if (normalized.includes('front')) {
        return { key: 'frontend', label: 'Frontend' };
    }
    if (
        normalized.includes('back') ||
        normalized.includes('server') ||
        normalized.includes('database')
    ) {
        return { key: 'backend', label: 'Backend' };
    }
    if (
        normalized.includes('tool') ||
        normalized.includes('devops') ||
        normalized.includes('platform')
    ) {
        return { key: 'tools', label: 'Tools' };
    }
    return { key: 'other', label: category?.trim() || 'Khác' };
}

function InsightSection({
    title,
    description,
    icon: Icon,
    items,
    tone,
}: {
    title: string;
    description: string;
    icon: typeof Sparkles;
    items: NonNullable<CvAnalysis['strengths']>;
    tone: 'positive' | 'warning' | 'danger';
}) {
    if (items.length === 0) return null;
    const marker = {
        positive: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-rose-500',
    }[tone];
    return (
        <AnalysisBlock title={title} description={description} icon={Icon}>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <article
                        key={`${item.title}-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50/55 p-4"
                    >
                        <div className="flex gap-3">
                            <span
                                className={`mt-2 size-2 shrink-0 rounded-full ${marker}`}
                            />
                            <div className="min-w-0">
                                <h4 className="font-bold text-slate-900">
                                    {item.title}
                                </h4>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    {item.description}
                                </p>
                                {item.evidence && (
                                    <p className="mt-2 text-xs leading-5 font-medium text-slate-400">
                                        Bằng chứng: {item.evidence}
                                    </p>
                                )}
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </AnalysisBlock>
    );
}

function QuestionsSection({
    questions,
}: {
    questions: NonNullable<CvAnalysis['potentialQuestions']>;
}) {
    if (questions.length === 0) return null;
    return (
        <AnalysisBlock
            title="Câu hỏi phỏng vấn tiềm năng"
            description="Chuẩn bị trước các câu hỏi được suy ra trực tiếp từ CV."
            icon={CircleHelp}
        >
            <ol className="space-y-3">
                {questions.map((item, index) => (
                    <li
                        key={`${item.question}-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50/55 p-4"
                    >
                        <div className="flex gap-3">
                            <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black">
                                {index + 1}
                            </span>
                            <div>
                                <p className="leading-6 font-bold text-slate-900">
                                    {item.question}
                                </p>
                                {item.reason && (
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        {item.reason}
                                    </p>
                                )}
                                {item.basedOn && (
                                    <p className="mt-2 text-xs leading-5 font-medium text-slate-400">
                                        Dựa trên: {item.basedOn}
                                    </p>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ol>
        </AnalysisBlock>
    );
}

function SuggestionsSection({
    suggestions,
}: {
    suggestions: NonNullable<CvAnalysis['suggestions']>;
}) {
    if (suggestions.length === 0) return null;
    const priorityLabel = {
        HIGH: 'Ưu tiên cao',
        MEDIUM: 'Ưu tiên vừa',
        LOW: 'Ưu tiên thấp',
    } as const;
    return (
        <AnalysisBlock
            title="Đề xuất cải thiện"
            description="Các hành động nên thực hiện trước lần ứng tuyển tiếp theo."
            icon={Target}
        >
            <div className="grid gap-3 md:grid-cols-2">
                {suggestions.map((item, index) => (
                    <article
                        key={`${item.title}-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50/55 p-4"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <h4 className="font-bold text-slate-900">
                                {item.title}
                            </h4>
                            <span className="rounded-md bg-violet-50 px-2 py-1 text-[11px] font-extrabold text-violet-700">
                                {priorityLabel[item.priority]}
                            </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {item.description}
                        </p>
                    </article>
                ))}
            </div>
        </AnalysisBlock>
    );
}

function formatExperienceLevel(
    level: NonNullable<CvAnalysis['detectedLevel']>,
) {
    return {
        INTERN: 'Thực tập sinh',
        FRESHER: 'Fresher',
        JUNIOR: 'Junior',
        MIDDLE: 'Middle',
        SENIOR: 'Senior',
        LEAD: 'Lead',
    }[level];
}

function SummaryItem({
    label,
    value,
    className,
    icon: Icon,
}: {
    label: string;
    value: string;
    className?: string;
    icon?: typeof Sparkles;
}) {
    return (
        <div className="min-w-0">
            <dt className="flex items-center gap-2 text-sm font-bold text-slate-500">
                {label}
            </dt>
            <dd className={`mt-1.5 [overflow-wrap:anywhere] ${className}`}>
                {Icon && (
                    <Icon
                        className="size-4 text-violet-500"
                        aria-hidden="true"
                    />
                )}
                {value}
            </dd>
        </div>
    );
}

function AnalysisQueryError({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-red-100 bg-red-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
                <CircleAlert
                    className="mt-0.5 size-5 shrink-0 text-red-600"
                    aria-hidden="true"
                />
                <div>
                    <h3 className="font-extrabold text-slate-900">
                        Chưa thể tải trạng thái phân tích
                    </h3>
                    <p className="mt-1 text-sm leading-6 font-medium text-slate-500">
                        Thông tin CV vẫn có thể sử dụng bình thường. Hãy thử tải
                        lại riêng phần này.
                    </p>
                </div>
            </div>
            <Button
                type="button"
                variant="outline"
                className="w-full shrink-0 sm:w-auto"
                onClick={onRetry}
            >
                <RefreshCw className="size-4" aria-hidden="true" />
                Thử lại
            </Button>
        </div>
    );
}

function UnavailableState({ cv }: { cv: CvDetail }) {
    const message =
        cv.processingStatus === 'READY'
            ? 'CV chưa có nội dung văn bản có thể sử dụng để phân tích.'
            : 'CV cần hoàn tất xử lý trước khi có thể bắt đầu phân tích.';
    return (
        <div className="flex gap-3 rounded-xl bg-slate-50 p-5 text-sm font-medium text-slate-600">
            <CircleAlert
                className="mt-0.5 size-5 shrink-0 text-slate-400"
                aria-hidden="true"
            />
            {message}
        </div>
    );
}

function AnalysisSkeleton() {
    return (
        <div
            className="grid animate-pulse gap-4 sm:grid-cols-3"
            aria-label="Đang tải trạng thái phân tích CV"
            aria-busy="true"
        >
            <div className="h-20 rounded-xl bg-slate-100" />
            <div className="h-20 rounded-xl bg-slate-100" />
            <div className="h-20 rounded-xl bg-slate-100" />
        </div>
    );
}

export function getCvAnalysisErrorMessage(error: unknown): string {
    const code = error instanceof ApiError ? error.code : undefined;
    const messages: Record<string, string> = {
        CV_NOT_FOUND: 'Không tìm thấy CV hoặc bạn không còn quyền truy cập.',
        CV_NOT_READY: 'CV chưa sẵn sàng để phân tích.',
        CV_TEXT_UNAVAILABLE: 'CV không có nội dung văn bản để phân tích.',
        CV_ANALYSIS_ALREADY_PROCESSING: 'CV này đang được phân tích.',
        CV_ANALYSIS_DAILY_LIMIT_REACHED:
            'Bạn đã sử dụng hết lượt phân tích CV hôm nay. Vui lòng quay lại vào ngày mai.',
        AI_TIMEOUT: 'Quá trình phân tích mất quá nhiều thời gian. Hãy thử lại.',
        AI_RATE_LIMITED:
            'Dịch vụ AI đang nhận quá nhiều yêu cầu. Vui lòng thử lại sau.',
        AI_PROVIDER_ERROR:
            'Dịch vụ phân tích AI tạm thời không khả dụng. Vui lòng thử lại sau.',
        AI_EMPTY_RESPONSE: 'AI chưa thể tạo kết quả phân tích. Hãy thử lại.',
        AI_INVALID_RESPONSE: 'Kết quả AI chưa hợp lệ. Vui lòng thử lại.',
        AI_SCHEMA_VALIDATION_FAILED:
            'Kết quả AI chưa đúng định dạng. Vui lòng thử lại.',
    };
    return code && messages[code]
        ? messages[code]
        : 'Không thể hoàn tất phân tích CV. Vui lòng thử lại.';
}
