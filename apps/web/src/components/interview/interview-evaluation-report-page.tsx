'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { toast } from 'sonner';
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    BadgeCheck,
    Binary,
    Blocks,
    BookOpen,
    BookOpenCheck,
    BrainCircuit,
    BriefcaseBusiness,
    Braces,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    ClipboardList,
    Clock3,
    Crown,
    Database,
    FileText,
    Flag,
    FlaskConical,
    Gauge,
    Globe2,
    Handshake,
    HeartHandshake,
    Lightbulb,
    ListChecks,
    ListFilter,
    LoaderCircle,
    Megaphone,
    MessageCircle,
    Microscope,
    Network,
    Palette,
    PenLine,
    RefreshCw,
    Search,
    Scale,
    ShieldCheck,
    ShieldQuestion,
    ServerCog,
    Presentation,
    Sparkles,
    Target,
    Timer,
    UsersRound,
    Workflow,
} from 'lucide-react';
import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { ReviewSectionRenderer } from '@/components/interview/review/review-section-renderer';
import { parseInterviewReviewSections } from '@/components/interview/review/interview-review-section.schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useCreateInterviewEvaluation,
    useInterview,
    useInterviewEvaluation,
    useInterviewQuestionReviews,
    useInterviewTranscript,
    useReanalyzeInterviewQuestionReviews,
    useRetryInterviewEvaluation,
} from '@/hooks/interview/use-interviews';
import { useMe } from '@/hooks/auth/use-me';
import { cn } from '@/lib/utils';
import type {
    InterviewEvaluationReport,
    InterviewEvaluationResponse,
    InterviewReviewSection,
    InterviewTranscriptResponse,
} from '@/types/interview';

export function InterviewEvaluationReportPage({ id }: { id: string }) {
    const interview = useInterview(id);
    const evaluation = useInterviewEvaluation(id);
    const questionReviews = useInterviewQuestionReviews(id);
    const transcript = useInterviewTranscript(id);
    const create = useCreateInterviewEvaluation(id);
    const retry = useRetryInterviewEvaluation(id);
    const reanalyze = useReanalyzeInterviewQuestionReviews(id);
    const [reanalyzeOpen, setReanalyzeOpen] = useState(false);
    const started = useRef(false);

    useEffect(() => {
        if (
            evaluation.data?.status === 'NOT_STARTED' &&
            !started.current &&
            !create.isPending
        ) {
            started.current = true;
            create.mutate();
        }
    }, [create, evaluation.data?.status]);

    const title = interview.data?.targetRole ?? 'Báo cáo phỏng vấn';
    const status = evaluation.data?.status;
    const processing =
        evaluation.isPending ||
        create.isPending ||
        ['NOT_STARTED', 'PENDING', 'PROCESSING'].includes(status ?? 'PENDING');
    const report = evaluation.data?.report ?? null;

    const requestReanalysis = () => {
        reanalyze.mutate(undefined, {
            onSuccess: () => {
                toast.success('Đã bắt đầu phân tích lại báo cáo', {
                    description:
                        'Báo cáo hiện tại vẫn được giữ cho đến khi bản mới hoàn tất.',
                });
            },
            onError: () => {
                toast.error('Không thể phân tích lại báo cáo', {
                    description: 'Vui lòng thử lại sau.',
                });
            },
        });
    };

    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
            <header className="relative isolate overflow-hidden px-1 py-1 sm:px-0 lg:min-h-[236px]">
                <div className="relative z-10">
                    <PageBreadcrumb
                        items={[
                            { label: 'Phỏng vấn', href: '/interviews' },
                            { label: title, href: `/interviews/${id}` },
                            { label: 'Báo cáo đánh giá' },
                        ]}
                    />

                    <div className="mt-7 max-w-[920px] lg:pr-52">
                        <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase sm:text-sm">
                            Đánh giá sau phỏng vấn
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-slate-950 sm:text-4xl sm:leading-tight">
                            Báo cáo năng lực · {title}
                        </h1>
                        <p className="mt-3 max-w-4xl text-[15px] leading-7 font-medium text-slate-600">
                            Phân tích dựa trên câu trả lời thực tế, chuỗi câu
                            hỏi đào sâu và chuẩn năng lực của vị trí mục tiêu.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-3">
                            <HeaderMeta icon={Clock3}>
                                {formatReportDate(interview.data?.createdAt)}
                            </HeaderMeta>
                            <HeaderMeta icon={ListChecks}>
                                {interview.data?.questionCount ?? '—'} câu hỏi
                            </HeaderMeta>
                            <HeaderMeta icon={FileText}>
                                {interview.data?.durationMinutes ?? '—'} phút dự
                                kiến
                            </HeaderMeta>
                        </div>
                    </div>

                    <div className="mt-6 grid w-full gap-2.5 sm:w-auto sm:grid-cols-2 lg:absolute lg:right-0 lg:bottom-0 lg:mt-0">
                        <Button
                            asChild
                            variant="outline"
                            className="border-primary/30 text-primary hover:border-primary/45 hover:bg-primary/5 hover:text-primary h-12 min-w-52 rounded-sm bg-white/90 px-5 font-bold shadow-[0_6px_18px_rgba(51,65,85,0.06)]"
                        >
                            <Link href={`/interviews/${id}`}>
                                <FileText className="size-4" />
                                Chi tiết buổi phỏng vấn
                            </Link>
                        </Button>
                        {report && (
                            <Button
                                type="button"
                                className="h-12 min-w-44 rounded-sm px-5 font-bold shadow-[0_10px_24px_rgba(54,40,110,0.18)]"
                                disabled={processing || reanalyze.isPending}
                                onClick={() => setReanalyzeOpen(true)}
                            >
                                <RefreshCw
                                    className={
                                        reanalyze.isPending
                                            ? 'size-4 animate-spin'
                                            : 'size-4'
                                    }
                                />
                                Phân tích lại
                            </Button>
                        )}
                    </div>
                </div>

                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block"
                >
                    <Image
                        src="/images/interview/review-illustration.png"
                        alt=""
                        width={320}
                        height={250}
                        loading="eager"
                        className="absolute -top-8 right-2 h-56 w-auto object-contain opacity-80"
                    />
                </div>
            </header>

            {report ? (
                <>
                    {processing && <ReportReplacementStatus />}
                    {status === 'FAILED' && (
                        <ReportReplacementFailure
                            canRetry={Boolean(evaluation.data?.canRetry)}
                            pending={retry.isPending}
                            onRetry={() => retry.mutate()}
                        />
                    )}
                    <ReportContent
                        report={report}
                        answerReviews={
                            questionReviews.data?.reviews?.answerReviews ??
                            report.answerReviews
                        }
                        turns={transcript.data?.turns ?? []}
                    />
                </>
            ) : processing ? (
                <ReportProcessing />
            ) : evaluation.isError ? (
                <ReportFailure
                    canRetry
                    pending={false}
                    onRetry={() => void evaluation.refetch()}
                />
            ) : status === 'FAILED' ? (
                <ReportFailure
                    response={evaluation.data}
                    canRetry={Boolean(evaluation.data?.canRetry)}
                    pending={retry.isPending}
                    onRetry={() => retry.mutate()}
                />
            ) : (
                <ReportFailure canRetry={false} pending={false} />
            )}

            <ConfirmDialog
                open={reanalyzeOpen}
                onOpenChange={setReanalyzeOpen}
                title="Phân tích lại báo cáo?"
                description="Interviewly sẽ tạo lại toàn bộ đánh giá bằng dữ liệu phỏng vấn hiện có. Báo cáo hiện tại vẫn được giữ nếu lần phân tích mới thất bại."
                confirmLabel="Phân tích lại"
                onConfirm={requestReanalysis}
            />
        </main>
    );
}

function HeaderMeta({
    icon: Icon,
    children,
}: {
    icon: typeof Clock3;
    children: ReactNode;
}) {
    return (
        <span className="ring-primary/10 inline-flex min-h-10 items-center gap-2 rounded-lg bg-white/75 px-4 py-2 text-sm font-semibold text-slate-600 shadow-[0_5px_16px_rgba(51,65,85,0.05)] ring-1 backdrop-blur-sm">
            <Icon className="text-primary size-4" aria-hidden="true" />
            {children}
        </span>
    );
}

function formatReportDate(value?: string) {
    if (!value) return 'Chưa có ngày phỏng vấn';
    return new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
        .format(new Date(value))
        .replace(',', '');
}
function ReportReplacementStatus() {
    return (
        <div className="border-primary/15 bg-primary/5 mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm text-slate-700">
            <LoaderCircle className="text-primary mt-0.5 size-5 shrink-0 animate-spin" />
            <div>
                <p className="font-bold text-slate-900">
                    Đang tạo bản phân tích mới
                </p>
                <p className="mt-0.5 leading-6">
                    Bạn vẫn có thể xem báo cáo hiện tại. Nội dung chỉ được thay
                    thế sau khi bản mới hoàn tất thành công.
                </p>
            </div>
        </div>
    );
}

function ReportReplacementFailure({
    canRetry,
    pending,
    onRetry,
}: {
    canRetry: boolean;
    pending: boolean;
    onRetry: () => void;
}) {
    return (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                    <p className="font-bold">Bản phân tích mới chưa hoàn tất</p>
                    <p className="mt-0.5 leading-6">
                        Báo cáo trước đó vẫn được giữ nguyên và có thể tiếp tục
                        sử dụng.
                    </p>
                </div>
            </div>
            {canRetry && (
                <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 rounded-sm border-amber-300 bg-white px-4 font-bold text-amber-800 hover:bg-amber-100 hover:text-amber-900"
                    disabled={pending}
                    onClick={onRetry}
                >
                    <RefreshCw
                        className={pending ? 'size-4 animate-spin' : 'size-4'}
                    />
                    Thử lại
                </Button>
            )}
        </div>
    );
}

function ReportProcessing() {
    return (
        <section className="border-border bg-card mt-6 grid min-h-80 place-items-center rounded-2xl border p-8 text-center shadow-sm">
            <div>
                <div className="bg-primary/10 mx-auto grid size-16 place-items-center rounded-2xl">
                    <LoaderCircle className="text-primary size-8 animate-spin" />
                </div>
                <h2 className="mt-5 text-xl font-extrabold text-slate-950">
                    Đang phân tích câu trả lời và tổng hợp báo cáo...
                </h2>
                <p className="text-muted-foreground mt-2 max-w-md text-sm">
                    Báo cáo được xử lý nền và lưu lại. Bạn có thể rời trang rồi
                    quay lại sau mà không làm mất tiến trình.
                </p>
            </div>
        </section>
    );
}

function ReportFailure({
    response,
    canRetry,
    pending,
    onRetry,
}: {
    response?: InterviewEvaluationResponse;
    canRetry: boolean;
    pending: boolean;
    onRetry?: () => void;
}) {
    return (
        <section className="border-destructive/20 bg-card mt-6 rounded-2xl border p-8 text-center">
            <AlertTriangle className="text-destructive mx-auto size-10" />
            <h2 className="mt-4 text-xl font-extrabold text-slate-950">
                Chưa thể tạo báo cáo
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
                Dữ liệu phỏng vấn vẫn an toàn.
                {canRetry
                    ? ' Hãy thử lại khi dịch vụ AI ổn định.'
                    : ' Báo cáo đã đạt giới hạn xử lý tự động.'}
            </p>
            {response?.errorCode && (
                <p className="text-muted-foreground mt-2 text-xs">
                    Mã lỗi: {response.errorCode}
                </p>
            )}
            {canRetry && onRetry && (
                <Button
                    className="mt-5 rounded-sm"
                    disabled={pending}
                    onClick={onRetry}
                >
                    <RefreshCw className={pending ? 'animate-spin' : ''} /> Thử
                    lại
                </Button>
            )}
        </section>
    );
}

function ReportContent({
    report,
    answerReviews,
    turns,
}: {
    report: InterviewEvaluationReport;
    answerReviews: InterviewEvaluationReport['answerReviews'];
    turns: InterviewTranscriptResponse['turns'];
}) {
    const misconceptions = report.diagnosticFindings.filter(
        (item) => item.category === 'MISCONCEPTION',
    );
    return (
        <div className="mt-6 space-y-6">
            <OverallReport report={report} />

            <CompetencySection competencies={report.competencies} />

            <section className="grid items-stretch gap-4 xl:grid-cols-2">
                <article className="flex h-full flex-col rounded-xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 to-emerald-50/45 p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                        <CheckCircle2
                            className="size-8 shrink-0 fill-emerald-500 stroke-[2.5] text-white"
                            aria-hidden="true"
                        />
                        <h2 className="text-base font-extrabold text-emerald-950 sm:text-lg">
                            Điểm mạnh đã thể hiện
                        </h2>
                    </div>

                    {report.demonstratedStrengths.length ? (
                        <ol className="mt-4 space-y-3">
                            {report.demonstratedStrengths.map((item, index) => (
                                <li
                                    key={`${item}-${index}`}
                                    className="flex gap-3 text-sm leading-6 text-slate-700"
                                >
                                    <CheckCircle2
                                        className="size-6 shrink-0 fill-emerald-500 stroke-[2.5] text-white"
                                        aria-hidden="true"
                                    />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <EmptyText text="Chưa có đủ bằng chứng để xác định điểm mạnh nổi bật." />
                    )}
                </article>

                <article className="flex h-full flex-col rounded-xl border border-rose-100/80 bg-gradient-to-br from-rose-50/90 to-rose-50/45 p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                        <CircleAlert
                            className="size-8 shrink-0 fill-rose-500 stroke-[2.5] text-white"
                            aria-hidden="true"
                        />
                        <h2 className="text-base font-extrabold text-rose-950 sm:text-lg">
                            Khoảng trống kiến thức và điểm cần cải thiện
                        </h2>
                    </div>

                    {report.diagnosticFindings.length ? (
                        <ol className="mt-4 space-y-3">
                            {report.diagnosticFindings.map((finding, index) => (
                                <li
                                    key={finding.id}
                                    className="flex items-start gap-3"
                                >
                                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-rose-500 text-xs font-black text-white">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                                            <h3 className="min-w-0 flex-1 text-sm leading-5 font-extrabold text-slate-950">
                                                {finding.subarea}
                                            </h3>
                                            <span className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600">
                                                {
                                                    severityLabels[
                                                        finding.severity
                                                    ]
                                                }
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm leading-5 text-slate-600">
                                            {finding.observation}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <div className="mt-5 rounded-xl border border-emerald-100 bg-white/70 p-4 text-sm font-semibold text-emerald-700">
                            Chưa ghi nhận khoảng trống đáng kể từ các bằng chứng
                            hiện có.
                        </div>
                    )}
                </article>
            </section>
            {misconceptions.length > 0 && (
                <ReportCard
                    icon={BrainCircuit}
                    title="Nhận thức chưa chính xác"
                    tone="danger"
                >
                    <div className="space-y-3">
                        {misconceptions.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-xl border border-red-100 bg-red-50/50 p-4"
                            >
                                <strong>{item.subarea}</strong>
                                <p className="mt-2 text-sm">
                                    {item.explanation}
                                </p>
                            </div>
                        ))}
                    </div>
                </ReportCard>
            )}

            <QuestionReviewSection reviews={answerReviews} turns={turns} />

            <ImprovementRoadmap recommendations={report.recommendations} />
            {report.stretchAchievements.length > 0 && (
                <ReportCard icon={Sparkles} title="Năng lực vượt mức kỳ vọng">
                    <BulletList items={report.stretchAchievements} />
                </ReportCard>
            )}
        </div>
    );
}

function ImprovementRoadmap({
    recommendations,
}: {
    recommendations: InterviewEvaluationReport['recommendations'];
}) {
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
    const desktopColumns =
        recommendations.length === 1
            ? 'xl:grid-cols-1 xl:max-w-xl'
            : recommendations.length === 2
              ? 'xl:grid-cols-2 xl:max-w-5xl'
              : recommendations.length === 3
                ? 'xl:grid-cols-3'
                : 'xl:grid-cols-4';

    const toggleStep = (index: number) => {
        setExpandedSteps((current) => {
            const next = new Set(current);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    return (
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_14px_40px_rgba(76,63,135,0.05)] sm:p-6">
            <div className="flex items-start gap-4">
                <div className="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center rounded-xl">
                    <BookOpenCheck
                        className="size-7 stroke-[2.4]"
                        aria-hidden="true"
                    />
                </div>
                <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                        Lộ trình cải thiện
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                        Từng bước được đề xuất từ những năng lực còn thiếu để
                        bạn biết nên bắt đầu từ đâu và cải thiện điều gì tiếp
                        theo.
                    </p>
                </div>
            </div>

            {recommendations.length ? (
                <ol
                    className={`mx-auto mt-8 grid w-full grid-cols-1 items-stretch gap-x-5 gap-y-7 md:grid-cols-2 ${desktopColumns}`}
                >
                    {recommendations.map((item, index) => {
                        const StepIcon =
                            roadmapIcons[index % roadmapIcons.length];
                        const accent =
                            roadmapStepAccents[
                                index % roadmapStepAccents.length
                            ];
                        const expanded = expandedSteps.has(index);
                        const visibleObjectives = item.learningObjectives.slice(
                            0,
                            4,
                        );
                        const detailsId = `roadmap-step-details-${index}`;
                        const hasDetails =
                            item.learningObjectives.length > 4 ||
                            item.suggestedExercises.length > 0 ||
                            Boolean(item.expectedOutcome);

                        return (
                            <li
                                key={`${item.competencyKey}-${index}`}
                                className="group relative isolate min-w-0 pt-[5rem]"
                            >
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute -top-1 left-1 z-0 text-[6.6rem] leading-none font-black tracking-[-0.09em] text-transparent sm:text-[7.25rem]"
                                    style={{
                                        WebkitTextStroke: `2px ${accent.stroke}`,
                                    }}
                                >
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <div
                                    aria-hidden="true"
                                    className={`pointer-events-none absolute top-[4.2rem] -left-4 z-0 h-[4.75rem] w-16 rounded-full opacity-80 ${accent.sideOrb}`}
                                />
                                <div
                                    aria-hidden="true"
                                    className={`pointer-events-none absolute top-9 left-[42%] z-0 h-[4.8rem] w-[46%] rounded-t-full opacity-90 ${accent.arch}`}
                                />
                                <div
                                    aria-hidden="true"
                                    className={`pointer-events-none absolute top-[3.2rem] right-0 left-[28%] z-0 h-9 rounded-[50%] border-t border-dashed ${accent.line}`}
                                />
                                <span
                                    aria-hidden="true"
                                    className={`absolute top-[2.9rem] right-7 z-[1] size-2 rounded-full ring-[3px] ring-white ${accent.dot}`}
                                />

                                <article
                                    className={`relative z-10 flex h-full flex-col overflow-hidden rounded-[18px] border shadow-[0_10px_30px_rgba(62,47,116,0.055)] transition-[border-color,box-shadow] duration-200 hover:shadow-[0_14px_36px_rgba(62,47,116,0.09)] ${accent.border} ${accent.cardBg}`}
                                >
                                    <div className="bg-primary h-1 w-full" />
                                    <div className="flex h-full flex-col p-5 sm:p-6">
                                        <div className="flex min-w-0 items-start gap-3.5">
                                            <span
                                                className={`grid size-12 shrink-0 place-items-center rounded-[14px] shadow-sm ${accent.iconBg} ${accent.text}`}
                                            >
                                                <StepIcon
                                                    className="size-6 stroke-[2.4]"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div className="min-w-0 flex-1 pt-0.5">
                                                <h3 className="text-base leading-6 font-extrabold text-slate-950">
                                                    {item.topic}
                                                </h3>
                                                <p className="mt-0.5 line-clamp-1 text-sm font-medium text-slate-500">
                                                    {formatRoadmapCategory(
                                                        item.competencyKey,
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${roadmapPriorityStyles[item.priority]}`}
                                            >
                                                <BarChart3
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {
                                                    roadmapPriorityLabels[
                                                        item.priority
                                                    ]
                                                }
                                            </span>
                                        </div>

                                        {item.reason && (
                                            <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                                                {item.reason}
                                            </p>
                                        )}

                                        {visibleObjectives.length > 0 && (
                                            <div className="mt-5 border-t border-slate-100 pt-4">
                                                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                                                    <BookOpenCheck
                                                        className={`size-[18px] stroke-[2.4] ${accent.text}`}
                                                        aria-hidden="true"
                                                    />
                                                    Nội dung học
                                                </div>
                                                <ul className="mt-3 space-y-2.5">
                                                    {visibleObjectives.map(
                                                        (
                                                            objective,
                                                            objectiveIndex,
                                                        ) => (
                                                            <li
                                                                key={`${objective}-${objectiveIndex}`}
                                                                className="flex gap-3.5 text-[13px] leading-5 text-slate-600"
                                                            >
                                                                <span
                                                                    className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full ${accent.dot}`}
                                                                    aria-hidden="true"
                                                                >
                                                                    <Check className="size-3 stroke-[3] text-white" />
                                                                </span>
                                                                <span>
                                                                    {objective}
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}

                                        {hasDetails && (
                                            <div
                                                id={detailsId}
                                                className={`grid transition-[grid-template-rows,opacity,margin] duration-300 motion-reduce:transition-none ${
                                                    expanded
                                                        ? 'mt-4 grid-rows-[1fr] opacity-100'
                                                        : 'mt-0 grid-rows-[0fr] opacity-0'
                                                }`}
                                            >
                                                <div className="min-h-0 overflow-hidden">
                                                    <div
                                                        className={`rounded-xl p-4 ${accent.detailBg}`}
                                                    >
                                                        {item.learningObjectives
                                                            .length > 4 && (
                                                            <RoadmapDetailList
                                                                title="Nội dung tiếp theo"
                                                                items={item.learningObjectives.slice(
                                                                    4,
                                                                )}
                                                            />
                                                        )}
                                                        {item.suggestedExercises
                                                            .length > 0 && (
                                                            <div
                                                                className={
                                                                    item
                                                                        .learningObjectives
                                                                        .length >
                                                                    4
                                                                        ? 'mt-4'
                                                                        : ''
                                                                }
                                                            >
                                                                <RoadmapDetailList
                                                                    title="Bài tập đề xuất"
                                                                    items={
                                                                        item.suggestedExercises
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                        {item.expectedOutcome && (
                                                            <div className="mt-4 border-t border-violet-100 pt-3">
                                                                <p
                                                                    className={`text-xs font-black tracking-wide uppercase ${accent.text}`}
                                                                >
                                                                    Kết quả mong
                                                                    đợi
                                                                </p>
                                                                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                                                                    {
                                                                        item.expectedOutcome
                                                                    }
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {hasDetails && (
                                            <div className="mt-auto pt-5">
                                                <button
                                                    type="button"
                                                    className={`flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-sm px-4 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${accent.button}`}
                                                    aria-expanded={expanded}
                                                    aria-controls={detailsId}
                                                    onClick={() =>
                                                        toggleStep(index)
                                                    }
                                                >
                                                    <span>
                                                        {expanded
                                                            ? 'Thu gọn'
                                                            : 'Xem chi tiết'}
                                                    </span>
                                                    <ArrowRight
                                                        className={`size-4 transition-transform duration-300 motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`}
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <div className="mt-6">
                    <EmptyText text="Chưa cần tạo lộ trình bổ sung từ kết quả hiện tại." />
                </div>
            )}
        </section>
    );
}

function RoadmapDetailList({
    title,
    items,
}: {
    title: string;
    items: string[];
}) {
    return (
        <div>
            <p className="text-xs font-black tracking-wide text-slate-800 uppercase">
                {title}
            </p>
            <ul className="mt-2 space-y-2">
                {items.map((item, index) => (
                    <li
                        key={`${item}-${index}`}
                        className="flex gap-3 text-xs leading-5 text-slate-600"
                    >
                        <span
                            className="bg-primary mt-2 size-1.5 shrink-0 rounded-full"
                            aria-hidden="true"
                        />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
function CompetencySection({
    competencies,
}: {
    competencies: InterviewEvaluationReport['competencies'];
}) {
    const [sort, setSort] = useState<'PRIORITY' | 'SCORE'>('PRIORITY');
    const [expandedCompetencies, setExpandedCompetencies] = useState<
        Set<string>
    >(new Set());
    const sortedCompetencies = useMemo(
        () =>
            [...competencies].sort((a, b) => {
                if (sort === 'SCORE') {
                    return (b.score ?? -1) - (a.score ?? -1);
                }
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }),
        [competencies, sort],
    );

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(51,65,85,0.05)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                    <Target className="text-primary mt-0.5 size-8 shrink-0 stroke-[2.5]" />
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-950">
                            Đánh giá theo năng lực
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Phân tích chi tiết theo từng nhóm năng lực quan
                            trọng của vị trí mục tiêu.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="hidden text-xs font-semibold text-slate-500 sm:inline">
                        Sắp xếp theo
                    </span>
                    <Select
                        value={sort}
                        onValueChange={(value) =>
                            setSort(value as 'PRIORITY' | 'SCORE')
                        }
                    >
                        <SelectTrigger
                            className="border-primary/20 text-primary hover:border-primary/35 hover:bg-primary/5 focus:border-primary/50 focus:ring-primary/20 h-10 w-[178px] rounded-sm bg-white px-3 font-bold shadow-none"
                            aria-label="Sắp xếp danh sách năng lực"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                            <SelectItem value="PRIORITY">
                                Mức ưu tiên
                            </SelectItem>
                            <SelectItem value="SCORE">Mức đánh giá</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mt-5 grid items-stretch gap-4 min-[1500px]:grid-cols-4 md:grid-cols-2 xl:grid-cols-3">
                {sortedCompetencies.map((item) => {
                    const scoreTone = getCompetencyScoreTone(item.score);
                    const isExpanded = expandedCompetencies.has(
                        item.competencyKey,
                    );
                    const panelId = `competency-${item.competencyKey}`;

                    return (
                        <article
                            key={item.competencyKey}
                            className={`flex h-full flex-col overflow-hidden rounded-xl border bg-white transition-colors duration-200 ${isExpanded ? 'border-primary/25' : 'border-slate-200'}`}
                        >
                            <div className="flex flex-1 flex-col p-4 min-[1500px]:p-3.5">
                                <div className="flex items-start gap-3.5">
                                    <CompetencyVisual
                                        competencyKey={item.competencyKey}
                                        name={item.name}
                                    />

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="line-clamp-2 min-h-12 text-[15px] leading-6 font-extrabold text-slate-950">
                                                {item.name}
                                            </h3>
                                            <span className="inline-flex shrink-0 items-center gap-1.5 text-lg font-black text-slate-950 tabular-nums">
                                                <span
                                                    className={`size-2 rotate-45 rounded-[2px] ${scoreTone.marker}`}
                                                    aria-hidden="true"
                                                />
                                                {item.score === null
                                                    ? '—'
                                                    : item.score}
                                                <span className="text-sm text-slate-900">
                                                    /10
                                                </span>
                                            </span>
                                        </div>

                                        <div className="mt-1.5 flex min-h-7 flex-wrap content-start gap-2 text-xs">
                                            <CompetencyBadge>
                                                {priorityLabels[item.priority]}
                                            </CompetencyBadge>
                                            <CompetencyBadge
                                                danger={
                                                    item.coverageStatus ===
                                                        'INSUFFICIENT' ||
                                                    item.coverageStatus ===
                                                        'NOT_ASSESSED'
                                                }
                                            >
                                                {
                                                    coverageLabels[
                                                        item.coverageStatus
                                                    ]
                                                }
                                            </CompetencyBadge>
                                            <CompetencyBadge
                                                danger={
                                                    item.confidence === 'LOW'
                                                }
                                            >
                                                Tin cậy{' '}
                                                {confidenceLabels[
                                                    item.confidence
                                                ].toLowerCase()}
                                            </CompetencyBadge>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-primary/12 mt-3 h-1.5 overflow-hidden rounded-full">
                                    {item.score !== null && (
                                        <div
                                            className="bg-primary h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                                            style={{
                                                width: `${item.score * 10}%`,
                                            }}
                                        />
                                    )}
                                </div>

                                <p className="mt-3 line-clamp-2 min-h-11 text-sm leading-[1.55] text-slate-600">
                                    {item.summary}
                                </p>

                                <button
                                    type="button"
                                    aria-expanded={isExpanded}
                                    aria-controls={panelId}
                                    onClick={() =>
                                        setExpandedCompetencies((current) => {
                                            const next = new Set(current);
                                            if (next.has(item.competencyKey)) {
                                                next.delete(item.competencyKey);
                                            } else {
                                                next.add(item.competencyKey);
                                            }
                                            return next;
                                        })
                                    }
                                    className={`focus-visible:ring-primary/25 mt-auto flex min-h-10 w-full items-center justify-between rounded-sm px-3.5 py-2.5 text-sm font-bold transition-colors duration-200 outline-none focus-visible:ring-2 ${isExpanded ? 'bg-primary/5 text-primary' : 'hover:bg-primary/5 hover:text-primary bg-slate-50 text-slate-600'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Globe2
                                            className="size-4 text-slate-400"
                                            aria-hidden="true"
                                        />
                                        {isExpanded
                                            ? 'Ẩn phân tích chi tiết'
                                            : 'Xem phân tích chi tiết'}
                                    </span>
                                    <ArrowRight
                                        className={`size-4 transition-transform duration-300 ease-out motion-reduce:transition-none ${isExpanded ? 'rotate-90' : ''}`}
                                        aria-hidden="true"
                                    />
                                </button>
                            </div>

                            <div
                                id={panelId}
                                aria-hidden={!isExpanded}
                                className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                            >
                                <div className="overflow-hidden">
                                    <div className="border-primary/10 bg-primary/[0.025] grid gap-5 border-t p-5 sm:grid-cols-2">
                                        <EvidenceList
                                            title="Điểm đã thể hiện"
                                            items={item.strengths}
                                            tone="success"
                                        />
                                        <EvidenceList
                                            title="Điểm cần cải thiện"
                                            items={item.weaknesses}
                                            tone="danger"
                                        />
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

type CompetencySkillLogo = {
    keywords: readonly string[];
    excludeKeywords?: readonly string[];
    src: string;
    alt: string;
};

const competencySkillLogos: readonly CompetencySkillLogo[] = [
    { keywords: ['react'], src: '/icons/skills/react.svg', alt: 'React' },
    {
        keywords: ['javascript', 'java script'],
        src: '/icons/skills/javascript.svg',
        alt: 'JavaScript',
    },
    {
        keywords: ['typescript', 'type script'],
        src: '/icons/skills/typescript.svg',
        alt: 'TypeScript',
    },
    {
        keywords: ['next.js', 'nextjs', 'next js'],
        src: '/icons/skills/nextjs.svg',
        alt: 'Next.js',
    },
    {
        keywords: ['node.js', 'nodejs', 'node js'],
        src: '/icons/skills/nodejs.svg',
        alt: 'Node.js',
    },
    {
        keywords: ['nestjs', 'nest.js', 'nest js'],
        src: '/icons/skills/nestjs.svg',
        alt: 'NestJS',
    },
    {
        keywords: ['express.js', 'expressjs', 'express js'],
        src: '/icons/skills/express.svg',
        alt: 'Express',
    },
    { keywords: ['angular'], src: '/icons/skills/angular.svg', alt: 'Angular' },
    {
        keywords: ['vue.js', 'vuejs', 'vue js'],
        src: '/icons/skills/vue.svg',
        alt: 'Vue.js',
    },
    { keywords: ['svelte'], src: '/icons/skills/svelte.svg', alt: 'Svelte' },
    {
        keywords: ['tailwind'],
        src: '/icons/skills/tailwindcss.svg',
        alt: 'Tailwind CSS',
    },
    {
        keywords: ['bootstrap'],
        src: '/icons/skills/bootstrap.svg',
        alt: 'Bootstrap',
    },
    {
        keywords: ['html5', 'html'],
        src: '/icons/skills/html5.svg',
        alt: 'HTML5',
    },
    {
        keywords: ['css3', 'css'],
        excludeKeywords: ['tailwind'],
        src: '/icons/skills/css3.svg',
        alt: 'CSS3',
    },
    {
        keywords: ['graphql', 'graph ql'],
        src: '/icons/skills/graphql.svg',
        alt: 'GraphQL',
    },
    { keywords: ['python'], src: '/icons/skills/python.svg', alt: 'Python' },
    {
        keywords: ['java'],
        excludeKeywords: ['javascript', 'java script'],
        src: '/icons/skills/java.svg',
        alt: 'Java',
    },
    {
        keywords: ['c#', 'csharp', 'c sharp'],
        src: '/icons/skills/csharp.svg',
        alt: 'C#',
    },
    {
        keywords: ['.net', 'dotnet', 'dot net'],
        src: '/icons/skills/dotnet.svg',
        alt: '.NET',
    },
    {
        keywords: ['golang', 'go language'],
        src: '/icons/skills/go.svg',
        alt: 'Go',
    },
    { keywords: ['php'], src: '/icons/skills/php.svg', alt: 'PHP' },
    { keywords: ['laravel'], src: '/icons/skills/laravel.svg', alt: 'Laravel' },
    {
        keywords: ['spring boot', 'springboot'],
        src: '/icons/skills/spring-boot.svg',
        alt: 'Spring Boot',
    },
    {
        keywords: ['postgresql', 'postgres', 'postgre sql'],
        src: '/icons/skills/postgresql.svg',
        alt: 'PostgreSQL',
    },
    {
        keywords: ['mongodb', 'mongo db'],
        src: '/icons/skills/mongodb.svg',
        alt: 'MongoDB',
    },
    {
        keywords: ['mysql', 'my sql'],
        src: '/icons/skills/mysql.svg',
        alt: 'MySQL',
    },
    { keywords: ['redis'], src: '/icons/skills/redis.svg', alt: 'Redis' },
    { keywords: ['prisma'], src: '/icons/skills/prisma.svg', alt: 'Prisma' },
    {
        keywords: ['docker', 'containerization'],
        src: '/icons/skills/docker.svg',
        alt: 'Docker',
    },
    {
        keywords: ['google cloud', 'gcp'],
        src: '/icons/skills/google-cloud.svg',
        alt: 'Google Cloud',
    },
    { keywords: ['github'], src: '/icons/skills/github.svg', alt: 'GitHub' },
    {
        keywords: ['git'],
        excludeKeywords: ['github'],
        src: '/icons/skills/git.svg',
        alt: 'Git',
    },
    {
        keywords: ['aws', 'amazon web services'],
        src: '/icons/skills/amazonwebservices.svg',
        alt: 'AWS',
    },
    {
        keywords: ['azure', 'microsoft azure'],
        src: '/icons/skills/azure.svg',
        alt: 'Microsoft Azure',
    },
    {
        keywords: ['kubernetes', 'k8s'],
        src: '/icons/skills/kubernetes.svg',
        alt: 'Kubernetes',
    },
    {
        keywords: ['terraform', 'infrastructure as code', 'iac'],
        src: '/icons/skills/terraform.svg',
        alt: 'Terraform',
    },
    { keywords: ['jenkins'], src: '/icons/skills/jenkins.svg', alt: 'Jenkins' },
    { keywords: ['nginx'], src: '/icons/skills/nginx.svg', alt: 'NGINX' },
    { keywords: ['linux'], src: '/icons/skills/linux.svg', alt: 'Linux' },
    {
        keywords: ['bash', 'shell scripting'],
        src: '/icons/skills/bash.svg',
        alt: 'Bash',
    },
    { keywords: ['gitlab'], src: '/icons/skills/gitlab.svg', alt: 'GitLab' },
    {
        keywords: ['bitbucket'],
        src: '/icons/skills/bitbucket.svg',
        alt: 'Bitbucket',
    },
    { keywords: ['jira'], src: '/icons/skills/jira.svg', alt: 'Jira' },
    {
        keywords: ['github actions'],
        src: '/icons/skills/githubactions.svg',
        alt: 'GitHub Actions',
    },
    {
        keywords: ['circleci', 'circle ci'],
        src: '/icons/skills/circleci.svg',
        alt: 'CircleCI',
    },
    { keywords: ['ansible'], src: '/icons/skills/ansible.svg', alt: 'Ansible' },
    {
        keywords: ['cloudflare'],
        src: '/icons/skills/cloudflare.svg',
        alt: 'Cloudflare',
    },
    {
        keywords: ['digitalocean', 'digital ocean'],
        src: '/icons/skills/digitalocean.svg',
        alt: 'DigitalOcean',
    },
    { keywords: ['heroku'], src: '/icons/skills/heroku.svg', alt: 'Heroku' },
    { keywords: ['vercel'], src: '/icons/skills/vercel.svg', alt: 'Vercel' },
    { keywords: ['django'], src: '/icons/skills/django.svg', alt: 'Django' },
    { keywords: ['flask'], src: '/icons/skills/flask.svg', alt: 'Flask' },
    {
        keywords: ['fastapi', 'fast api'],
        src: '/icons/skills/fastapi.svg',
        alt: 'FastAPI',
    },
    { keywords: ['ruby'], src: '/icons/skills/ruby.svg', alt: 'Ruby' },
    {
        keywords: ['ruby on rails', 'rails'],
        src: '/icons/skills/rails.svg',
        alt: 'Ruby on Rails',
    },
    { keywords: ['rust'], src: '/icons/skills/rust.svg', alt: 'Rust' },
    { keywords: ['kotlin'], src: '/icons/skills/kotlin.svg', alt: 'Kotlin' },
    { keywords: ['scala'], src: '/icons/skills/scala.svg', alt: 'Scala' },
    {
        keywords: ['adonisjs', 'adonis js'],
        src: '/icons/skills/adonisjs.svg',
        alt: 'AdonisJS',
    },
    { keywords: ['symfony'], src: '/icons/skills/symfony.svg', alt: 'Symfony' },
    {
        keywords: ['codeigniter', 'code igniter'],
        src: '/icons/skills/codeigniter.svg',
        alt: 'CodeIgniter',
    },
    { keywords: ['redux'], src: '/icons/skills/redux.svg', alt: 'Redux' },
    {
        keywords: ['material ui', 'material-ui', 'mui'],
        src: '/icons/skills/materialui.svg',
        alt: 'Material UI',
    },
    { keywords: ['sass', 'scss'], src: '/icons/skills/sass.svg', alt: 'Sass' },
    { keywords: ['less css'], src: '/icons/skills/less.svg', alt: 'Less' },
    {
        keywords: ['vite', 'vitejs'],
        src: '/icons/skills/vitejs.svg',
        alt: 'Vite',
    },
    { keywords: ['webpack'], src: '/icons/skills/webpack.svg', alt: 'Webpack' },
    {
        keywords: ['electron'],
        src: '/icons/skills/electron.svg',
        alt: 'Electron',
    },
    { keywords: ['flutter'], src: '/icons/skills/flutter.svg', alt: 'Flutter' },
    { keywords: ['dart'], src: '/icons/skills/dart.svg', alt: 'Dart' },
    { keywords: ['android'], src: '/icons/skills/android.svg', alt: 'Android' },
    {
        keywords: ['ios', 'macos', 'apple platform'],
        src: '/icons/skills/apple.svg',
        alt: 'Apple platforms',
    },
    { keywords: ['swift'], src: '/icons/skills/swift.svg', alt: 'Swift' },
    { keywords: ['sqlite'], src: '/icons/skills/sqlite.svg', alt: 'SQLite' },
    {
        keywords: ['mariadb', 'maria db'],
        src: '/icons/skills/mariadb.svg',
        alt: 'MariaDB',
    },
    {
        keywords: ['oracle database', 'oracle db'],
        src: '/icons/skills/oracle.svg',
        alt: 'Oracle',
    },
    {
        keywords: ['sql server', 'mssql', 'microsoft sql'],
        src: '/icons/skills/microsoftsqlserver.svg',
        alt: 'Microsoft SQL Server',
    },
    {
        keywords: ['elasticsearch', 'elastic search'],
        src: '/icons/skills/elasticsearch.svg',
        alt: 'Elasticsearch',
    },
    {
        keywords: ['cassandra'],
        src: '/icons/skills/cassandra.svg',
        alt: 'Apache Cassandra',
    },
    {
        keywords: ['dynamodb', 'dynamo db'],
        src: '/icons/skills/dynamodb.svg',
        alt: 'DynamoDB',
    },
    { keywords: ['neo4j'], src: '/icons/skills/neo4j.svg', alt: 'Neo4j' },
    { keywords: ['jest'], src: '/icons/skills/jest.svg', alt: 'Jest' },
    { keywords: ['vitest'], src: '/icons/skills/vitest.svg', alt: 'Vitest' },
    {
        keywords: ['cypress'],
        src: '/icons/skills/cypressio.svg',
        alt: 'Cypress',
    },
    {
        keywords: ['playwright'],
        src: '/icons/skills/playwright.svg',
        alt: 'Playwright',
    },
    {
        keywords: ['selenium'],
        src: '/icons/skills/selenium.svg',
        alt: 'Selenium',
    },
    { keywords: ['junit'], src: '/icons/skills/junit.svg', alt: 'JUnit' },
    { keywords: ['pytest'], src: '/icons/skills/pytest.svg', alt: 'Pytest' },
    {
        keywords: ['tensorflow', 'tensor flow'],
        src: '/icons/skills/tensorflow.svg',
        alt: 'TensorFlow',
    },
    {
        keywords: ['pytorch', 'py torch'],
        src: '/icons/skills/pytorch.svg',
        alt: 'PyTorch',
    },
    { keywords: ['pandas'], src: '/icons/skills/pandas.svg', alt: 'Pandas' },
    {
        keywords: ['numpy', 'num py'],
        src: '/icons/skills/numpy.svg',
        alt: 'NumPy',
    },
    {
        keywords: ['scikit-learn', 'scikit learn', 'sklearn'],
        src: '/icons/skills/scikitlearn.svg',
        alt: 'Scikit-learn',
    },
    {
        keywords: ['opencv', 'open cv'],
        src: '/icons/skills/opencv.svg',
        alt: 'OpenCV',
    },
    { keywords: ['jupyter'], src: '/icons/skills/jupyter.svg', alt: 'Jupyter' },
    {
        keywords: ['apache spark', 'spark'],
        src: '/icons/skills/apachespark.svg',
        alt: 'Apache Spark',
    },
    {
        keywords: ['apache kafka', 'kafka'],
        src: '/icons/skills/apachekafka.svg',
        alt: 'Apache Kafka',
    },
    {
        keywords: ['hadoop'],
        src: '/icons/skills/hadoop.svg',
        alt: 'Apache Hadoop',
    },
    {
        keywords: ['photoshop'],
        src: '/icons/skills/photoshop.svg',
        alt: 'Adobe Photoshop',
    },
    {
        keywords: ['illustrator'],
        src: '/icons/skills/illustrator.svg',
        alt: 'Adobe Illustrator',
    },
    { keywords: ['adobe xd'], src: '/icons/skills/xd.svg', alt: 'Adobe XD' },
    {
        keywords: ['after effects'],
        src: '/icons/skills/aftereffects.svg',
        alt: 'Adobe After Effects',
    },
    { keywords: ['canva'], src: '/icons/skills/canva.svg', alt: 'Canva' },
    { keywords: ['unity'], src: '/icons/skills/unity.svg', alt: 'Unity' },
    {
        keywords: ['unreal engine', 'unrealengine'],
        src: '/icons/skills/unrealengine.svg',
        alt: 'Unreal Engine',
    },
    { keywords: ['godot'], src: '/icons/skills/godot.svg', alt: 'Godot' },
    { keywords: ['blender'], src: '/icons/skills/blender.svg', alt: 'Blender' },
    {
        keywords: ['r language', 'r programming'],
        src: '/icons/skills/r.svg',
        alt: 'R',
    },
    { keywords: ['matlab'], src: '/icons/skills/matlab.svg', alt: 'MATLAB' },
    {
        keywords: ['c language', 'c programming', 'ansi c'],
        src: '/icons/skills/c.svg',
        alt: 'C',
    },
    {
        keywords: ['c++', 'cplusplus', 'cpp'],
        src: '/icons/skills/cplusplus.svg',
        alt: 'C++',
    },
    {
        keywords: ['objective-c', 'objective c'],
        src: '/icons/skills/objectivec.svg',
        alt: 'Objective-C',
    },
    {
        keywords: ['socket.io', 'socketio'],
        src: '/icons/skills/socketio.svg',
        alt: 'Socket.IO',
    },
    {
        keywords: ['rabbitmq', 'rabbit mq'],
        src: '/icons/skills/rabbitmq.svg',
        alt: 'RabbitMQ',
    },
    {
        keywords: ['swagger', 'openapi', 'open api'],
        src: '/icons/skills/swagger.svg',
        alt: 'Swagger',
    },
    { keywords: ['figma'], src: '/icons/skills/figma.svg', alt: 'Figma' },
    { keywords: ['postman'], src: '/icons/skills/postman.svg', alt: 'Postman' },
    {
        keywords: ['firebase'],
        src: '/icons/skills/firebase.svg',
        alt: 'Firebase',
    },
    {
        keywords: ['supabase'],
        src: '/icons/skills/supabase.svg',
        alt: 'Supabase',
    },
    {
        keywords: ['google analytics'],
        src: '/icons/skills/google-analytics.svg',
        alt: 'Google Analytics',
    },
    { keywords: ['hubspot'], src: '/icons/skills/hubspot.svg', alt: 'HubSpot' },
    {
        keywords: ['wordpress'],
        src: '/icons/skills/wordpress.svg',
        alt: 'WordPress',
    },
    { keywords: ['shopify'], src: '/icons/skills/shopify.svg', alt: 'Shopify' },
];

const semanticCompetencyVisuals = [
    {
        keywords: ['restful api', 'rest api', 'api integration'],
        label: 'API integration',
        icon: Braces,
        className: 'bg-blue-50 text-blue-600',
    },
    {
        keywords: [
            'database integration',
            'database',
            'sql',
            'data persistence',
        ],
        label: 'Database',
        icon: Database,
        className: 'bg-cyan-50 text-cyan-600',
    },
    {
        keywords: ['system design', 'software architecture', 'architecture'],
        label: 'System design',
        icon: Blocks,
        className: 'bg-violet-50 text-violet-600',
    },
    {
        keywords: ['testing', 'unit test', 'integration test', 'e2e'],
        label: 'Testing',
        icon: FlaskConical,
        className: 'bg-emerald-50 text-emerald-600',
    },
    {
        keywords: ['devops', 'deployment', 'ci/cd', 'infrastructure'],
        label: 'DevOps',
        icon: ServerCog,
        className: 'bg-slate-100 text-slate-600',
    },
    {
        keywords: ['algorithm', 'data structure'],
        label: 'Algorithms',
        icon: Binary,
        className: 'bg-indigo-50 text-indigo-600',
    },
    {
        keywords: ['ui/ux', 'user experience', 'user interface', 'design'],
        label: 'UI/UX',
        icon: Palette,
        className: 'bg-fuchsia-50 text-fuchsia-600',
    },
    {
        keywords: ['security', 'authentication', 'authorization'],
        label: 'Security',
        icon: ShieldCheck,
        className: 'bg-rose-50 text-rose-600',
    },
    {
        keywords: ['performance', 'optimization', 'optimisation'],
        label: 'Performance',
        icon: Gauge,
        className: 'bg-amber-50 text-amber-600',
    },
    {
        keywords: ['communication'],
        label: 'Communication',
        icon: MessageCircle,
        className: 'bg-sky-50 text-sky-600',
    },
    {
        keywords: ['teamwork', 'team work', 'collaboration'],
        label: 'Teamwork',
        icon: UsersRound,
        className: 'bg-emerald-50 text-emerald-600',
    },
    {
        keywords: ['leadership', 'people management'],
        label: 'Leadership',
        icon: Crown,
        className: 'bg-amber-50 text-amber-600',
    },
    {
        keywords: ['problem solving', 'troubleshooting', 'critical thinking'],
        label: 'Problem solving',
        icon: BrainCircuit,
        className: 'bg-violet-50 text-violet-600',
    },
    {
        keywords: ['adaptability', 'flexibility'],
        label: 'Adaptability',
        icon: RefreshCw,
        className: 'bg-teal-50 text-teal-600',
    },
    {
        keywords: ['creativity', 'innovation'],
        label: 'Creativity',
        icon: Lightbulb,
        className: 'bg-yellow-50 text-yellow-600',
    },
    {
        keywords: ['decision making', 'judgment'],
        label: 'Decision making',
        icon: Scale,
        className: 'bg-indigo-50 text-indigo-600',
    },
    {
        keywords: ['emotional intelligence', 'empathy'],
        label: 'Emotional intelligence',
        icon: HeartHandshake,
        className: 'bg-rose-50 text-rose-600',
    },
    {
        keywords: ['conflict resolution'],
        label: 'Conflict resolution',
        icon: Handshake,
        className: 'bg-orange-50 text-orange-600',
    },
    {
        keywords: ['mentoring', 'coaching'],
        label: 'Mentoring',
        icon: BookOpen,
        className: 'bg-blue-50 text-blue-600',
    },
    {
        keywords: ['attention to detail', 'detail oriented'],
        label: 'Attention to detail',
        icon: Search,
        className: 'bg-cyan-50 text-cyan-600',
    },
    {
        keywords: ['organization', 'organizational'],
        label: 'Organization',
        icon: ClipboardList,
        className: 'bg-slate-100 text-slate-600',
    },
    {
        keywords: ['ownership', 'accountability'],
        label: 'Ownership',
        icon: BadgeCheck,
        className: 'bg-emerald-50 text-emerald-600',
    },
    {
        keywords: ['continuous learning', 'self learning', 'learning agility'],
        label: 'Learning agility',
        icon: BookOpen,
        className: 'bg-violet-50 text-violet-600',
    },
    {
        keywords: ['strategic thinking', 'strategy'],
        label: 'Strategic thinking',
        icon: Flag,
        className: 'bg-purple-50 text-purple-600',
    },
    {
        keywords: ['resilience'],
        label: 'Resilience',
        icon: ShieldCheck,
        className: 'bg-rose-50 text-rose-600',
    },
    {
        keywords: ['networking', 'relationship building'],
        label: 'Relationship building',
        icon: Network,
        className: 'bg-sky-50 text-sky-600',
    },
    {
        keywords: ['writing', 'documentation'],
        label: 'Writing',
        icon: PenLine,
        className: 'bg-indigo-50 text-indigo-600',
    },
    {
        keywords: ['research'],
        label: 'Research',
        icon: Microscope,
        className: 'bg-teal-50 text-teal-600',
    },
    {
        keywords: ['agile', 'scrum', 'workflow'],
        label: 'Workflow',
        icon: Workflow,
        className: 'bg-indigo-50 text-indigo-600',
    },
    {
        keywords: ['project management', 'product management'],
        label: 'Project management',
        icon: BriefcaseBusiness,
        className: 'bg-blue-50 text-blue-600',
    },
    {
        keywords: ['presentation', 'public speaking'],
        label: 'Presentation',
        icon: Presentation,
        className: 'bg-fuchsia-50 text-fuchsia-600',
    },
    {
        keywords: ['negotiation', 'stakeholder'],
        label: 'Negotiation',
        icon: Handshake,
        className: 'bg-orange-50 text-orange-600',
    },
    {
        keywords: ['customer service', 'customer support'],
        label: 'Customer service',
        icon: HeartHandshake,
        className: 'bg-rose-50 text-rose-600',
    },
    {
        keywords: ['marketing', 'content marketing', 'growth'],
        label: 'Marketing',
        icon: Megaphone,
        className: 'bg-pink-50 text-pink-600',
    },
    {
        keywords: ['time management'],
        label: 'Time management',
        icon: Timer,
        className: 'bg-cyan-50 text-cyan-600',
    },
] as const;
function CompetencyVisual({
    competencyKey,
    name,
}: {
    competencyKey: string;
    name: string;
}) {
    const searchableValue = `${competencyKey} ${name}`
        .toLowerCase()
        .replaceAll('_', ' ')
        .replaceAll('-', ' ');
    const logos = competencySkillLogos
        .filter(
            (logo) =>
                logo.keywords.some((keyword) =>
                    searchableValue.includes(keyword),
                ) &&
                !logo.excludeKeywords?.some((keyword) =>
                    searchableValue.includes(keyword),
                ),
        )
        .slice(0, 2);
    const semanticVisual = semanticCompetencyVisuals.find((visual) =>
        visual.keywords.some((keyword) => searchableValue.includes(keyword)),
    );

    if (logos.length === 0) {
        const FallbackIcon = semanticVisual?.icon ?? Target;

        return (
            <span
                title={semanticVisual?.label ?? name}
                className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-xl',
                    semanticVisual?.className ?? 'bg-primary/8 text-primary',
                )}
            >
                <FallbackIcon
                    className="size-6 stroke-[2.35]"
                    aria-hidden="true"
                />
            </span>
        );
    }

    if (logos.length === 1) {
        const logo = logos[0];

        return (
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
                <Image
                    src={logo.src}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 object-contain"
                    title={logo.alt}
                />
            </span>
        );
    }

    return (
        <span
            className="relative size-11 shrink-0"
            title={logos.map((logo) => logo.alt).join(' & ')}
            aria-hidden="true"
        >
            <span className="absolute top-0 left-0 grid size-8 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
                <Image
                    src={logos[0].src}
                    alt=""
                    width={22}
                    height={22}
                    className="size-[22px] object-contain"
                />
            </span>
            <span className="absolute right-0 bottom-0 grid size-7 place-items-center rounded-lg bg-white shadow-sm ring-2 ring-white">
                <Image
                    src={logos[1].src}
                    alt=""
                    width={19}
                    height={19}
                    className="size-[19px] object-contain"
                />
            </span>
        </span>
    );
}
function CompetencyBadge({
    children,
    danger = false,
}: {
    children: ReactNode;
    danger?: boolean;
}) {
    return (
        <span
            className={
                danger
                    ? 'rounded-full bg-rose-50 px-3 py-1 font-bold text-rose-500'
                    : 'bg-primary/10 text-primary rounded-full px-3 py-1 font-bold'
            }
        >
            {children}
        </span>
    );
}

function getCompetencyScoreTone(score: number | null) {
    if (score === null) {
        return { marker: 'bg-slate-400' };
    }
    if (score >= 8) {
        return { marker: 'bg-emerald-500' };
    }
    if (score >= 6.5) {
        return { marker: 'bg-primary' };
    }
    if (score >= 4) {
        return { marker: 'bg-amber-500' };
    }
    return { marker: 'bg-rose-500' };
}
const REVIEW_SECTION_LABELS: Record<number, string> = {
    0: 'Giới thiệu bản thân',
    1: 'Kiến thức kỹ thuật chuyên môn',
    2: 'Kinh nghiệm dự án thực tế',
    3: 'Kỹ năng mềm và phong cách làm việc',
    4: 'Câu hỏi từ ứng viên',
};
const REVIEW_QUESTION_TYPE_LABELS: Record<string, string> = {
    GENERAL: 'Giới thiệu bản thân',
    TECHNICAL: 'Kiến thức kỹ thuật chuyên môn',
    PROJECT: 'Kinh nghiệm dự án thực tế',
    BEHAVIORAL: 'Kỹ năng mềm và phong cách làm việc',
    CANDIDATE: 'Câu hỏi từ ứng viên',
};

function getReviewTopicKey(
    review: InterviewEvaluationReport['answerReviews'][number],
) {
    if (typeof review.sectionIndex === 'number') {
        return `SECTION_${review.sectionIndex}`;
    }
    return review.questionType ?? review.competencyKey ?? 'GENERAL';
}

function getReviewTopicLabel(
    review: InterviewEvaluationReport['answerReviews'][number],
) {
    if (typeof review.sectionIndex === 'number') {
        return (
            REVIEW_SECTION_LABELS[review.sectionIndex] ??
            review.sectionTitle?.trim() ??
            `Phần ${review.sectionIndex + 1}`
        );
    }
    if (review.sectionTitle?.trim()) return review.sectionTitle;
    if (
        review.questionType &&
        REVIEW_QUESTION_TYPE_LABELS[review.questionType]
    ) {
        return REVIEW_QUESTION_TYPE_LABELS[review.questionType];
    }
    return review.competencyKey
        ? formatRoadmapCategory(review.competencyKey)
        : 'Câu hỏi chung';
}
function QuestionReviewSection({
    reviews,
    turns,
}: {
    reviews: InterviewEvaluationReport['answerReviews'];
    turns: InterviewTranscriptResponse['turns'];
}) {
    const [query, setQuery] = useState('');
    const [topic, setTopic] = useState('ALL');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const questionReviewRef = useRef<HTMLElement>(null);
    const shouldRestoreReviewPositionRef = useRef(false);
    const [selectedTurnId, setSelectedTurnId] = useState(
        reviews[0]?.turnId ?? '',
    );
    const [activeTab, setActiveTab] = useState('ANALYSIS');
    const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(
        new Set(),
    );

    const topics = useMemo(
        () =>
            Array.from(
                new Map(
                    reviews.map((review) => [
                        getReviewTopicKey(review),
                        getReviewTopicLabel(review),
                    ]),
                ),
                ([value, label]) => ({ value, label }),
            ),
        [reviews],
    );
    const filtered = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase('vi');
        return reviews.filter((review) => {
            const matchesTopic =
                topic === 'ALL' || getReviewTopicKey(review) === topic;
            const matchesQuery =
                !normalizedQuery ||
                review.questionText
                    .toLocaleLowerCase('vi')
                    .includes(normalizedQuery) ||
                (review.answerText ?? '')
                    .toLocaleLowerCase('vi')
                    .includes(normalizedQuery);
            return matchesTopic && matchesQuery;
        });
    }, [query, reviews, topic]);

    const selectedReview =
        reviews.find((review) => review.turnId === selectedTurnId) ??
        reviews[0];
    const selectedIndex = selectedReview
        ? reviews.findIndex((review) => review.turnId === selectedReview.turnId)
        : -1;
    const selectedTurn = turns.find(
        (turn) => turn.id === selectedReview?.turnId,
    );

    const openQuestion = (turnId: string, restoreReviewPosition = false) => {
        const nextReview = reviews.find((review) => review.turnId === turnId);
        shouldRestoreReviewPositionRef.current = restoreReviewPosition;
        setSelectedTurnId(turnId);
        const nextTabs = nextReview ? buildQuestionReviewTabs(nextReview) : [];
        setActiveTab(nextTabs[0]?.id ?? 'ANALYSIS');
        setDrawerOpen(false);
    };
    const restoreQuestionReviewPosition = () => {
        if (!shouldRestoreReviewPositionRef.current) return;
        shouldRestoreReviewPositionRef.current = false;
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                questionReviewRef.current?.scrollIntoView({
                    behavior: 'auto',
                    block: 'start',
                });
            });
        });
    };
    const navigateQuestion = (offset: number) => {
        const next = reviews[selectedIndex + offset];
        if (next) openQuestion(next.turnId);
    };
    useEffect(() => {
        const handleQuestionNavigation = (event: KeyboardEvent) => {
            if (
                drawerOpen ||
                (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey
            ) {
                return;
            }

            const target = event.target;
            if (
                target instanceof HTMLElement &&
                target.closest(
                    'input, textarea, select, button, [contenteditable="true"], [role="tablist"]',
                )
            ) {
                return;
            }

            const section = questionReviewRef.current;
            if (!section) return;
            const sectionRect = section.getBoundingClientRect();
            const sectionIsInViewport =
                sectionRect.top < window.innerHeight && sectionRect.bottom > 0;
            if (!sectionIsInViewport) return;

            const offset = event.key === 'ArrowRight' ? 1 : -1;
            const nextReview = reviews[selectedIndex + offset];
            if (!nextReview) return;

            event.preventDefault();
            const nextTabs = buildQuestionReviewTabs(nextReview);
            shouldRestoreReviewPositionRef.current = false;
            setSelectedTurnId(nextReview.turnId);
            setActiveTab(nextTabs[0]?.id ?? 'ANALYSIS');
        };

        window.addEventListener('keydown', handleQuestionNavigation);
        return () =>
            window.removeEventListener('keydown', handleQuestionNavigation);
    }, [drawerOpen, reviews, selectedIndex]);

    const toggleAnswer = (turnId: string) => {
        setExpandedAnswers((current) => {
            const next = new Set(current);
            if (next.has(turnId)) next.delete(turnId);
            else next.add(turnId);
            return next;
        });
    };

    if (!selectedReview) {
        return (
            <section
                id="question-review"
                className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_44px_rgba(51,65,85,0.055)]"
            >
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <EmptyText text="Chưa có câu trả lời để xem lại." />
                </div>
            </section>
        );
    }

    return (
        <section
            ref={questionReviewRef}
            id="question-review"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_44px_rgba(51,65,85,0.055)]"
        >
            <header className="px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-start gap-3.5">
                        <span className="bg-primary grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-[0_8px_18px_color-mix(in_srgb,var(--primary)_22%,transparent)]">
                            <RefreshCw className="size-5 stroke-[2.4]" />
                        </span>
                        <div>
                            <h2 className="text-xl font-extrabold tracking-[-0.015em] text-slate-950">
                                Xem lại từng câu trả lời
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Đánh giá chi tiết, bằng chứng và gợi ý cải thiện
                                cho từng câu hỏi.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex min-w-52 flex-1 items-center gap-3 xl:w-72">
                            <span className="shrink-0 text-sm font-black text-slate-900">
                                Câu {selectedIndex + 1} / {reviews.length}
                            </span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                <div
                                    className="bg-primary h-full rounded-full transition-[width] duration-500"
                                    style={{
                                        width: `${((selectedIndex + 1) / reviews.length) * 100}%`,
                                    }}
                                />
                            </div>
                            <span className="text-primary shrink-0 text-xs font-black tabular-nums">
                                {Math.round(
                                    ((selectedIndex + 1) / reviews.length) *
                                        100,
                                )}
                                %
                            </span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-11 rounded-sm px-5 text-sm font-bold"
                                disabled={selectedIndex <= 0}
                                onClick={() => navigateQuestion(-1)}
                            >
                                <ChevronLeft className="size-4" />
                                <span className="hidden sm:inline">
                                    Câu trước
                                </span>
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-11 rounded-sm px-5 text-sm font-bold"
                                disabled={selectedIndex === reviews.length - 1}
                                onClick={() => navigateQuestion(1)}
                            >
                                <span className="hidden sm:inline">
                                    Câu tiếp theo
                                </span>
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-3 sm:px-7 sm:pt-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                        <span className="bg-primary/8 text-primary shrink-0 rounded-full px-3.5 py-1.5 text-sm font-black">
                            Câu {selectedIndex + 1} / {reviews.length}
                        </span>
                        <span className="bg-primary/8 text-primary max-w-full truncate rounded-full px-3.5 py-1.5 text-sm font-bold">
                            Nhóm: {getReviewTopicLabel(selectedReview)}
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-primary h-11 shrink-0 rounded-sm px-5 text-sm font-bold"
                        onClick={() => setDrawerOpen(true)}
                    >
                        <ListFilter className="size-4" />
                        Danh sách câu hỏi
                    </Button>
                </div>

                <QuestionReviewDetail
                    key={selectedReview.turnId}
                    review={selectedReview}
                    answeredAt={selectedTurn?.answeredAt}
                    activeTab={activeTab}
                    onActiveTabChange={setActiveTab}
                    answerExpanded={expandedAnswers.has(selectedReview.turnId)}
                    onToggleAnswer={() => toggleAnswer(selectedReview.turnId)}
                />
            </div>

            <QuestionListDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                reviews={reviews}
                filtered={filtered}
                selectedTurnId={selectedReview.turnId}
                query={query}
                onQueryChange={setQuery}
                topic={topic}
                onTopicChange={setTopic}
                topics={topics}
                onSelect={(turnId) => openQuestion(turnId, true)}
                onAfterClose={restoreQuestionReviewPosition}
            />
        </section>
    );
}

function QuestionListDrawer({
    open,
    onOpenChange,
    reviews,
    filtered,
    selectedTurnId,
    query,
    onQueryChange,
    topic,
    onTopicChange,
    topics,
    onSelect,
    onAfterClose,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reviews: InterviewEvaluationReport['answerReviews'];
    filtered: InterviewEvaluationReport['answerReviews'];
    selectedTurnId: string;
    query: string;
    onQueryChange: (value: string) => void;
    topic: string;
    onTopicChange: (value: string) => void;
    topics: Array<{ value: string; label: string }>;
    onSelect: (turnId: string) => void;
    onAfterClose: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                mobileVariant="bottom-sheet"
                mobileContentPosition="start"
                onCloseAutoFocus={(event) => {
                    event.preventDefault();
                    onAfterClose();
                }}
                className="data-[state=open]:sm:slide-in-from-right data-[state=closed]:sm:slide-out-to-right flex max-h-[88dvh] max-w-xl flex-col overflow-hidden overscroll-contain p-0 sm:!top-0 sm:!right-0 sm:!bottom-0 sm:!left-auto sm:!h-dvh sm:!max-h-none sm:!w-[min(460px,100vw)] sm:!max-w-none sm:!translate-x-0 sm:!translate-y-0 sm:!rounded-none sm:!border-y-0 sm:!border-r-0 max-sm:[&>div:first-child]:overflow-hidden"
            >
                <DialogHeader className="border-b border-slate-200 px-5 py-5 pr-14 sm:px-6">
                    <DialogTitle>Danh sách câu hỏi</DialogTitle>
                    <DialogDescription>
                        Chọn nhanh câu trả lời bạn muốn xem lại.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(event) =>
                                onQueryChange(event.target.value)
                            }
                            placeholder="Tìm kiếm câu hỏi..."
                            className="h-11 pl-9"
                            aria-label="Tìm kiếm câu hỏi"
                        />
                    </div>
                    <Select value={topic} onValueChange={onTopicChange}>
                        <SelectTrigger
                            className="h-11"
                            aria-label="Lọc câu hỏi theo chủ đề"
                        >
                            <SelectValue placeholder="Tất cả chủ đề" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả chủ đề</SelectItem>
                            {topics.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="scrollbar-primary min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pt-2 pb-[max(var(--dialog-mobile-bottom-clearance,5.5rem),env(safe-area-inset-bottom))] sm:p-3">
                    {filtered.length > 0 ? (
                        <div className="space-y-1">
                            {filtered.map((review) => {
                                const index = reviews.findIndex(
                                    (item) => item.turnId === review.turnId,
                                );
                                const active = review.turnId === selectedTurnId;
                                const issueCount =
                                    review.missingAspects.length +
                                    review.incorrectAspects.length;
                                return (
                                    <button
                                        key={review.turnId}
                                        type="button"
                                        className={`focus-visible:ring-primary/25 group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                                            active
                                                ? 'bg-primary/7 ring-primary/15 ring-1'
                                                : 'hover:bg-slate-50'
                                        }`}
                                        aria-current={
                                            active ? 'true' : undefined
                                        }
                                        onClick={() => onSelect(review.turnId)}
                                    >
                                        <span
                                            className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black tabular-nums ${
                                                active
                                                    ? 'bg-primary text-white'
                                                    : 'text-primary bg-violet-50'
                                            }`}
                                        >
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="line-clamp-2 block text-sm leading-5 font-bold text-slate-900">
                                                {review.questionText}
                                            </span>
                                            <span className="mt-1 block truncate text-xs text-slate-500">
                                                {getReviewTopicLabel(review)}
                                            </span>
                                        </span>
                                        {issueCount > 0 ? (
                                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                                                {issueCount} điểm
                                            </span>
                                        ) : (
                                            <CheckCircle2 className="size-4.5 shrink-0 text-emerald-500" />
                                        )}
                                        <ChevronRight className="text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyText text="Không tìm thấy câu hỏi phù hợp với bộ lọc." />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
type QuestionReviewTab = {
    id: string;
    label: string;
    section?: InterviewReviewSection;
    legacyContent?: 'ANALYSIS' | 'IMPROVED_ANSWER' | 'COMPARISON';
};

function getReviewSectionTabLabel(
    section: InterviewReviewSection,
    questionType?: string | null,
) {
    switch (section.type) {
        case 'CRITERIA_ANALYSIS':
            return 'Phân tích chi tiết';
        case 'ANSWER_STRUCTURE':
            return 'Cấu trúc gợi ý';
        case 'KNOWLEDGE_EXPLANATION':
            return 'Giải thích & kiến thức';
        case 'CODE_EXAMPLE':
            return 'Ví dụ code';
        case 'SCENARIO_APPROACH':
            return 'Cách tiếp cận';
        case 'TRADEOFF_ANALYSIS':
            return 'Phân tích đánh đổi';
        case 'STAR_ANALYSIS':
            return 'Phân tích STAR';
        case 'INTERVIEWER_PERSPECTIVE':
            return 'Góc nhìn nhà tuyển dụng';
        case 'IMPROVED_ANSWER':
            return questionType === 'GENERAL'
                ? 'Ví dụ câu trả lời'
                : 'Câu trả lời tốt hơn';
        case 'ANSWER_COMPARISON':
            return 'So sánh';
        case 'SCENARIO_ANALYSIS':
            return 'Phân tích tình huống';
    }
}

function getQuestionReviewMobileTabLabel(tab: QuestionReviewTab) {
    switch (tab.section?.type) {
        case 'CRITERIA_ANALYSIS':
            return 'Phân tích';
        case 'ANSWER_STRUCTURE':
            return 'Cấu trúc';
        case 'KNOWLEDGE_EXPLANATION':
            return 'Kiến thức';
        case 'CODE_EXAMPLE':
            return 'Code';
        case 'SCENARIO_APPROACH':
            return 'Tiếp cận';
        case 'TRADEOFF_ANALYSIS':
            return 'Đánh đổi';
        case 'STAR_ANALYSIS':
            return 'STAR';
        case 'INTERVIEWER_PERSPECTIVE':
            return 'Góc nhìn';
        case 'IMPROVED_ANSWER':
            return 'Câu mẫu';
        case 'ANSWER_COMPARISON':
            return 'So sánh';
        case 'SCENARIO_ANALYSIS':
            return 'Tình huống';
        default:
            return tab.legacyContent === 'ANALYSIS'
                ? 'Phân tích'
                : tab.legacyContent === 'IMPROVED_ANSWER'
                  ? 'Câu mẫu'
                  : tab.legacyContent === 'COMPARISON'
                    ? 'So sánh'
                    : tab.label;
    }
}

function QuestionReviewTabIcon({ tab }: { tab: QuestionReviewTab }) {
    const sectionType = tab.section?.type;
    const Icon =
        sectionType === 'CRITERIA_ANALYSIS' || tab.legacyContent === 'ANALYSIS'
            ? BarChart3
            : sectionType === 'ANSWER_STRUCTURE'
              ? ListChecks
              : sectionType === 'KNOWLEDGE_EXPLANATION'
                ? BookOpenCheck
                : sectionType === 'CODE_EXAMPLE'
                  ? BrainCircuit
                  : sectionType === 'IMPROVED_ANSWER' ||
                      tab.legacyContent === 'IMPROVED_ANSWER'
                    ? FileText
                    : sectionType === 'ANSWER_COMPARISON' ||
                        tab.legacyContent === 'COMPARISON'
                      ? Target
                      : Sparkles;

    return <Icon className="size-4 shrink-0" aria-hidden="true" />;
}

function getImprovedAnswer(
    review: InterviewEvaluationReport['answerReviews'][number],
) {
    const section = parseInterviewReviewSections(review.reviewSections).find(
        (
            item,
        ): item is Extract<
            InterviewReviewSection,
            { type: 'IMPROVED_ANSWER' }
        > => item.type === 'IMPROVED_ANSWER',
    );
    return section?.data.answer ?? review.exampleImprovedAnswer ?? null;
}

function buildQuestionReviewTabs(
    review: InterviewEvaluationReport['answerReviews'][number],
): QuestionReviewTab[] {
    const sections = parseInterviewReviewSections(review.reviewSections);
    if (sections.length > 0) {
        const tabs: QuestionReviewTab[] = sections.map((section, index) => ({
            id: `SECTION_${section.type}_${index}`,
            label: getReviewSectionTabLabel(section, review.questionType),
            section,
        }));
        const hasImprovedAnswer = sections.some(
            (section) => section.type === 'IMPROVED_ANSWER',
        );
        const hasComparison = sections.some(
            (section) => section.type === 'ANSWER_COMPARISON',
        );
        if (review.exampleImprovedAnswer && !hasImprovedAnswer) {
            tabs.push({
                id: 'LEGACY_IMPROVED_ANSWER',
                label: 'Câu trả lời tốt hơn',
                legacyContent: 'IMPROVED_ANSWER',
            });
            if (!hasComparison) {
                tabs.push({
                    id: 'LEGACY_COMPARISON',
                    label: 'So sánh',
                    legacyContent: 'COMPARISON',
                });
            }
        }
        return tabs;
    }

    const tabs: QuestionReviewTab[] = [
        {
            id: 'ANALYSIS',
            label: 'Phân tích chi tiết',
            legacyContent: 'ANALYSIS',
        },
    ];
    if (review.exampleImprovedAnswer) {
        tabs.push({
            id: 'LEGACY_IMPROVED_ANSWER',
            label: 'Câu trả lời tốt hơn',
            legacyContent: 'IMPROVED_ANSWER',
        });
        tabs.push({
            id: 'LEGACY_COMPARISON',
            label: 'So sánh',
            legacyContent: 'COMPARISON',
        });
    }
    return tabs;
}
function QuestionReviewDetail({
    review,
    answeredAt,
    activeTab,
    onActiveTabChange,
    answerExpanded,
    onToggleAnswer,
}: {
    review: InterviewEvaluationReport['answerReviews'][number];
    answeredAt?: string | null;
    activeTab: string;
    onActiveTabChange: (value: string) => void;
    answerExpanded: boolean;
    onToggleAnswer: () => void;
}) {
    const currentUser = useMe({ refetchOnMount: false }).data;
    const userInitials = getInitials(currentUser?.fullName);
    const issueCount =
        review.missingAspects.length + review.incorrectAspects.length;
    const answerText = review.answerText ?? '';
    const answerWordCount = answerText.trim()
        ? answerText.trim().split(/\s+/u).length
        : 0;
    const answerIsLong =
        answerText.length > 360 || answerText.split('\n').length > 5;
    const improvedAnswer = getImprovedAnswer(review);
    const tabs = buildQuestionReviewTabs(review);
    const resolvedActiveTab = tabs.some((tab) => tab.id === activeTab)
        ? activeTab
        : (tabs[0]?.id ?? 'ANALYSIS');
    const activeTabData = tabs.find((tab) => tab.id === resolvedActiveTab);
    const activeSection = activeTabData?.section;
    const activeTabIndex = Math.max(
        0,
        tabs.findIndex((tab) => tab.id === resolvedActiveTab),
    );

    return (
        <article className="animate-in fade-in min-w-0 duration-300">
            <div className="px-5 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="max-w-5xl text-xl leading-8 font-extrabold tracking-[-0.015em] text-slate-950 sm:text-2xl">
                        {review.questionText}
                    </h3>
                    <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
                            issueCount > 0
                                ? 'bg-amber-50 text-amber-700'
                                : review.correctAspects.length > 0
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                        {issueCount > 0
                            ? `${issueCount} điểm cần xem lại`
                            : review.correctAspects.length > 0
                              ? 'Đã ghi nhận bằng chứng'
                              : 'Chưa đủ bằng chứng'}
                    </span>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl bg-[linear-gradient(135deg,#fafaff_0%,#f6f7ff_100%)] p-4 sm:p-5">
                    <Avatar className="size-10 border-2 border-white shadow-sm">
                        <AvatarImage
                            src={currentUser?.avatarUrl ?? undefined}
                            alt={currentUser?.fullName ?? 'Người dùng'}
                        />
                        <AvatarFallback className="text-xs">
                            {userInitials}
                        </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-slate-950">
                            Câu trả lời của bạn
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
                            {answeredAt && (
                                <span>
                                    Trả lời lúc {formatReportDate(answeredAt)}
                                </span>
                            )}
                            {answeredAt && <span aria-hidden="true">•</span>}
                            <span>
                                {answerWordCount.toLocaleString('vi-VN')} từ
                            </span>
                        </div>

                        <p
                            className={`mt-3 text-sm leading-7 whitespace-pre-wrap text-slate-700 ${answerIsLong && !answerExpanded ? 'line-clamp-7' : ''}`}
                        >
                            {answerText || 'Chưa có câu trả lời.'}
                        </p>
                        {answerIsLong && (
                            <button
                                type="button"
                                className="text-primary mt-3 text-sm font-bold hover:underline"
                                onClick={onToggleAnswer}
                            >
                                {answerExpanded
                                    ? 'Thu gọn câu trả lời'
                                    : 'Xem toàn bộ câu trả lời'}
                            </button>
                        )}
                    </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-[linear-gradient(135deg,rgba(236,253,245,0.92)_0%,rgba(240,253,250,0.58)_100%)] p-4 sm:p-5">
                        <EvidenceList
                            title="Điểm đã thể hiện tốt"
                            items={review.correctAspects}
                            tone="success"
                        />
                    </div>
                    <div className="rounded-xl bg-[linear-gradient(135deg,rgba(255,241,242,0.9)_0%,rgba(255,247,247,0.64)_100%)] p-4 sm:p-5">
                        <EvidenceList
                            title="Điểm cần cải thiện"
                            items={[
                                ...review.missingAspects,
                                ...review.incorrectAspects,
                            ]}
                            tone="danger"
                        />
                    </div>
                </div>
            </div>

            <div>
                <div
                    className="relative flex w-full md:grid md:[grid-template-columns:repeat(var(--question-review-tab-count),minmax(0,1fr))]"
                    style={
                        {
                            '--question-review-tab-count': tabs.length,
                        } as CSSProperties
                    }
                    role="tablist"
                    aria-label="Nội dung xem lại câu trả lời"
                    onKeyDown={(event) => {
                        if (
                            ![
                                'ArrowLeft',
                                'ArrowRight',
                                'Home',
                                'End',
                            ].includes(event.key)
                        )
                            return;
                        event.preventDefault();
                        const currentIndex = tabs.findIndex(
                            (tab) => tab.id === resolvedActiveTab,
                        );
                        const nextIndex =
                            event.key === 'Home'
                                ? 0
                                : event.key === 'End'
                                  ? tabs.length - 1
                                  : event.key === 'ArrowRight'
                                    ? (currentIndex + 1) % tabs.length
                                    : (currentIndex - 1 + tabs.length) %
                                      tabs.length;
                        const nextTab = tabs[nextIndex];
                        if (!nextTab) return;
                        onActiveTabChange(nextTab.id);
                        requestAnimationFrame(() =>
                            document
                                .getElementById(
                                    `question-review-tab-${nextTab.id}`,
                                )
                                ?.focus(),
                        );
                    }}
                >
                    {tabs.map((tab) => (
                        <button
                            id={`question-review-tab-${tab.id}`}
                            key={tab.id}
                            type="button"
                            role="tab"
                            tabIndex={resolvedActiveTab === tab.id ? 0 : -1}
                            aria-selected={resolvedActiveTab === tab.id}
                            aria-controls="question-review-tabpanel"
                            aria-label={tab.label}
                            title={tab.label}
                            className={`after:bg-primary relative z-10 inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold whitespace-nowrap transition-[color,flex] duration-300 after:absolute after:right-3 after:bottom-0 after:left-3 after:h-0.5 after:origin-center after:transition-transform after:duration-300 after:ease-out sm:min-h-14 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm md:flex-none md:after:hidden ${
                                resolvedActiveTab === tab.id
                                    ? 'text-primary flex-[2_1_0%] after:scale-x-100'
                                    : 'flex-[1_1_0%] text-slate-500 after:scale-x-0 hover:text-slate-900'
                            }`}
                            onClick={() => onActiveTabChange(tab.id)}
                        >
                            <QuestionReviewTabIcon tab={tab} />
                            <span
                                className={
                                    resolvedActiveTab === tab.id
                                        ? 'inline max-w-full truncate md:hidden'
                                        : 'hidden'
                                }
                            >
                                {getQuestionReviewMobileTabLabel(tab)}
                            </span>
                            <span className="hidden whitespace-nowrap md:inline md:truncate">
                                {tab.label}
                            </span>
                        </button>
                    ))}
                    <span
                        aria-hidden="true"
                        className="bg-primary pointer-events-none absolute bottom-0 z-20 hidden h-0.5 transition-[left,width] duration-300 ease-out md:block"
                        style={{
                            width: `calc(${100 / tabs.length}% - 3rem)`,
                            left: `calc(${(activeTabIndex * 100) / tabs.length}% + 1.5rem)`,
                        }}
                    />
                </div>
            </div>

            <div
                aria-hidden="true"
                className="mx-5 border-t border-slate-200/80 sm:mx-7"
            />

            <div
                id="question-review-tabpanel"
                className="min-h-52 px-5 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-7"
                role="tabpanel"
                aria-labelledby={`question-review-tab-${resolvedActiveTab}`}
            >
                {activeSection && (
                    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                        <ReviewSectionRenderer sections={[activeSection]} />
                    </div>
                )}
                {activeTabData?.legacyContent === 'ANALYSIS' && (
                    <div className="animate-in fade-in slide-in-from-bottom-1 grid gap-5 duration-300 md:grid-cols-2">
                        <div>
                            <p className="text-base font-extrabold text-slate-950">
                                Đánh giá tổng quan
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                                {review.improvement}
                            </p>
                        </div>
                        <div className="md:border-l md:border-slate-200 md:pl-5">
                            <p className="text-primary text-base font-extrabold">
                                Vì sao nội dung này quan trọng?
                            </p>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                                {review.whyItMatters}
                            </p>
                        </div>
                    </div>
                )}
                {activeTabData?.legacyContent === 'IMPROVED_ANSWER' &&
                    improvedAnswer && (
                        <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                            <div className="border-primary/20 bg-primary/5 rounded-xl border p-4 sm:p-5">
                                <p className="text-primary text-sm font-extrabold">
                                    Câu trả lời tham khảo
                                </p>
                                <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-slate-700">
                                    {improvedAnswer}
                                </p>
                            </div>
                        </div>
                    )}
                {activeTabData?.legacyContent === 'COMPARISON' &&
                    improvedAnswer && (
                        <div className="animate-in fade-in slide-in-from-bottom-1 grid gap-4 duration-300 lg:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                                <p className="text-sm font-extrabold text-slate-950">
                                    Câu trả lời hiện tại
                                </p>
                                <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-slate-600">
                                    {answerText || 'Chưa có câu trả lời.'}
                                </p>
                            </div>
                            <div className="border-primary/20 bg-primary/5 rounded-xl border p-4 sm:p-5">
                                <p className="text-primary text-sm font-extrabold">
                                    Câu trả lời tham khảo
                                </p>
                                <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-slate-700">
                                    {improvedAnswer}
                                </p>
                            </div>
                        </div>
                    )}
            </div>
        </article>
    );
}
function OverallReport({ report }: { report: InterviewEvaluationReport }) {
    const score = report.overallScore;
    const coveragePercent = Math.round(report.coverage * 100);

    return (
        <section className="border-border bg-card grid gap-7 rounded-2xl border p-5 shadow-[0_18px_45px_rgba(51,65,85,0.06)] lg:grid-cols-[220px_minmax(0,1fr)] lg:p-7">
            <div className="flex items-center justify-center py-2">
                <div
                    className="relative grid size-44 place-items-center sm:size-48"
                    aria-label={
                        score === null
                            ? 'Chưa đủ dữ liệu để tính điểm tổng quan'
                            : `Điểm tổng quan ${score} trên 10`
                    }
                >
                    <svg
                        viewBox="0 0 128 128"
                        className="absolute inset-0 size-full -rotate-90 overflow-visible"
                        aria-hidden="true"
                    >
                        <circle
                            cx="64"
                            cy="64"
                            r="53"
                            fill="none"
                            stroke="color-mix(in srgb, var(--primary) 14%, transparent)"
                            strokeWidth="11"
                        />
                        {score !== null && (
                            <circle
                                cx="64"
                                cy="64"
                                r="53"
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="11"
                                strokeLinecap="round"
                                pathLength="100"
                                strokeDasharray="100"
                                strokeDashoffset={100 - score * 10}
                                className="drop-shadow-[0_4px_8px_rgba(54,40,110,0.14)]"
                            />
                        )}
                    </svg>

                    <div className="relative z-10 -mt-1 text-center">
                        <strong className="block text-[2.6rem] leading-none font-black tracking-[-0.04em] text-slate-950 tabular-nums">
                            {score === null ? '—' : score.toFixed(1)}
                        </strong>
                        <span className="mt-2 block text-sm font-semibold text-slate-500">
                            trên 10
                        </span>
                    </div>
                </div>
            </div>

            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <BarChart3 className="text-primary size-8 stroke-[2.5]" />
                    <h2 className="text-xl font-extrabold text-slate-950">
                        Đánh giá tổng quan
                    </h2>
                    <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-bold">
                        Dựa trên câu trả lời thực tế
                    </span>
                </div>

                <p className="mt-4 max-w-none text-sm leading-7 text-slate-600 sm:text-base">
                    {report.overallSummary}
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <OverviewMetric
                        icon={BookOpenCheck}
                        label="Mức đáp ứng"
                        value={levelLabels[report.levelAssessment]}
                    />
                    <OverviewMetric
                        icon={BarChart3}
                        label="Độ phủ bằng chứng"
                        value={`${coveragePercent}%`}
                        progress={coveragePercent}
                    />
                    <OverviewMetric
                        icon={ShieldQuestion}
                        label="Độ tin cậy"
                        value={confidenceLabels[report.confidence]}
                    />
                </div>

                {score === null && (
                    <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                        <span
                            className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-amber-400 font-black text-white"
                            aria-hidden="true"
                        >
                            !
                        </span>
                        <p>
                            Chưa đủ dữ liệu để đánh giá tổng thể. Các nhận xét
                            có bằng chứng vẫn được hiển thị bên dưới.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

function OverviewMetric({
    icon: Icon,
    label,
    value,
    progress,
}: {
    icon: typeof BarChart3;
    label: string;
    value: string;
    progress?: number;
}) {
    return (
        <div className="flex min-h-24 items-center gap-3 rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-100">
            <span className="border-primary/20 bg-primary/5 text-primary grid size-12 shrink-0 place-items-center rounded-xl border">
                <Icon className="size-7 stroke-[2.25]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="mt-0.5 font-extrabold text-slate-950">{value}</p>
                {progress !== undefined && (
                    <div
                        className="bg-primary/10 mt-2 h-1.5 overflow-hidden rounded-full"
                        role="progressbar"
                        aria-label={label}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                    >
                        <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function ReportCard({
    icon: Icon,
    title,
    tone = 'primary',
    children,
}: {
    icon: typeof Sparkles;
    title: string;
    tone?: 'primary' | 'success' | 'danger';
    children: ReactNode;
}) {
    const color =
        tone === 'success'
            ? 'text-emerald-600'
            : tone === 'danger'
              ? 'text-red-500'
              : 'text-primary';
    return (
        <section className="border-border bg-card rounded-2xl border p-5 shadow-[0_14px_35px_rgba(51,65,85,0.05)] sm:p-6">
            <div className="mb-4 flex items-center gap-3">
                <Icon className={`${color} size-7 stroke-[2.5]`} />
                <h2 className="text-lg font-extrabold text-slate-950">
                    {title}
                </h2>
            </div>
            {children}
        </section>
    );
}
function BulletList({ items }: { items: string[] }) {
    return items.length ? (
        <ul className="mt-3 space-y-2 text-sm">
            {items.map((item, index) => (
                <li className="flex gap-2" key={`${item}-${index}`}>
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    ) : (
        <EmptyText text="Chưa có dữ liệu." />
    );
}
function EvidenceList({
    title,
    items,
    tone = 'neutral',
}: {
    title: string;
    items: string[];
    tone?: 'neutral' | 'success' | 'danger';
}) {
    const color =
        tone === 'success'
            ? 'text-emerald-700'
            : tone === 'danger'
              ? 'text-red-600'
              : 'text-foreground';
    const ToneIcon = tone === 'success' ? CheckCircle2 : CircleAlert;
    const iconClassName =
        tone === 'success'
            ? 'fill-emerald-500 text-white'
            : tone === 'danger'
              ? 'fill-rose-500 text-white'
              : 'text-slate-500';

    return (
        <div>
            <div className="flex items-center gap-3">
                <ToneIcon
                    className={`size-8 shrink-0 stroke-[2.5] ${iconClassName}`}
                    aria-hidden="true"
                />
                <p className={`text-sm font-black ${color}`}>{title}</p>
            </div>
            {items.length ? (
                <ul className="mt-2.5 list-disc space-y-1 pl-[3.25rem] text-sm leading-6 text-slate-600 marker:text-slate-400">
                    {items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted-foreground mt-2.5 pl-11 text-sm">
                    Không ghi nhận.
                </p>
            )}
        </div>
    );
}
function EmptyText({ text }: { text: string }) {
    return <p className="text-muted-foreground text-sm">{text}</p>;
}

function formatRoadmapCategory(value: string) {
    const acronyms = new Set([
        'ai',
        'api',
        'css',
        'git',
        'html',
        'hr',
        'js',
        'qa',
        'sql',
        'ui',
        'ux',
    ]);

    return value
        .split(/[_-]+/)
        .filter(Boolean)
        .map((word) =>
            acronyms.has(word.toLowerCase())
                ? word.toUpperCase()
                : word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(' ');
}
const roadmapIcons = [BrainCircuit, BookOpenCheck, Globe2, Target] as const;
const roadmapStepAccents = [
    {
        stroke: '#7c5cff',
        border: 'border-violet-200/80',
        iconBg: 'bg-gradient-to-br from-violet-100 to-violet-200',
        text: 'text-violet-600',
        arch: 'bg-gradient-to-t from-violet-300/65 via-violet-200/45 to-transparent',
        sideOrb: 'bg-gradient-to-br from-violet-200/75 to-violet-50/20',
        line: 'border-violet-200',
        cardBg: 'bg-gradient-to-b from-white via-white to-violet-50/25',
        detailBg: 'bg-violet-50/75',
        dot: 'bg-violet-500',
        button: 'bg-violet-50 text-violet-700 hover:bg-violet-100 focus-visible:ring-violet-300',
    },
    {
        stroke: '#5b8ff9',
        border: 'border-blue-200/80',
        iconBg: 'bg-gradient-to-br from-blue-100 to-blue-200',
        text: 'text-blue-600',
        arch: 'bg-gradient-to-t from-blue-300/60 via-blue-200/40 to-transparent',
        sideOrb: 'bg-gradient-to-br from-blue-200/70 to-blue-50/20',
        line: 'border-blue-200',
        cardBg: 'bg-gradient-to-b from-white via-white to-blue-50/25',
        detailBg: 'bg-blue-50/75',
        dot: 'bg-blue-500',
        button: 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:ring-blue-300',
    },
    {
        stroke: '#ff8a65',
        border: 'border-orange-200/80',
        iconBg: 'bg-gradient-to-br from-orange-100 to-orange-200',
        text: 'text-orange-600',
        arch: 'bg-gradient-to-t from-orange-300/60 via-orange-200/40 to-transparent',
        sideOrb: 'bg-gradient-to-br from-orange-200/70 to-orange-50/20',
        line: 'border-orange-200',
        cardBg: 'bg-gradient-to-b from-white via-white to-orange-50/25',
        detailBg: 'bg-orange-50/75',
        dot: 'bg-orange-500',
        button: 'bg-orange-50 text-orange-700 hover:bg-orange-100 focus-visible:ring-orange-300',
    },
    {
        stroke: '#31c995',
        border: 'border-emerald-200/80',
        iconBg: 'bg-gradient-to-br from-emerald-100 to-emerald-200',
        text: 'text-emerald-600',
        arch: 'bg-gradient-to-t from-emerald-300/60 via-emerald-200/40 to-transparent',
        sideOrb: 'bg-gradient-to-br from-emerald-200/70 to-emerald-50/20',
        line: 'border-emerald-200',
        cardBg: 'bg-gradient-to-b from-white via-white to-emerald-50/25',
        detailBg: 'bg-emerald-50/75',
        dot: 'bg-emerald-500',
        button: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-300',
    },
] as const;
const roadmapPriorityLabels = {
    KEY: 'Ưu tiên cốt lõi',
    HIGH: 'Ưu tiên cao',
    MEDIUM: 'Ưu tiên trung bình',
    LOW: 'Ưu tiên thấp',
} as const;
const roadmapPriorityStyles = {
    KEY: 'bg-rose-50 text-rose-600',
    HIGH: 'bg-rose-50 text-rose-600',
    MEDIUM: 'bg-amber-50 text-amber-600',
    LOW: 'bg-emerald-50 text-emerald-600',
} as const;
const priorityOrder = { KEY: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
const priorityLabels = {
    KEY: 'Cốt lõi',
    HIGH: 'Cao',
    MEDIUM: 'Trung bình',
    LOW: 'Bổ trợ',
} as const;
const coverageLabels = {
    SUFFICIENT: 'Đủ bằng chứng',
    PARTIAL: 'Một phần',
    INSUFFICIENT: 'Bằng chứng yếu',
    NOT_ASSESSED: 'Chưa đánh giá',
} as const;
const severityLabels = {
    CRITICAL: 'Nghiêm trọng',
    HIGH: 'Cao',
    MEDIUM: 'Trung bình',
    LOW: 'Thấp',
} as const;
const levelLabels = {
    ABOVE_EXPECTATIONS: 'Vượt kỳ vọng',
    MEETS_EXPECTATIONS: 'Đáp ứng kỳ vọng',
    PARTIALLY_MEETS_EXPECTATIONS: 'Đáp ứng một phần',
    BELOW_EXPECTATIONS: 'Chưa đáp ứng',
    INSUFFICIENT_EVIDENCE: 'Chưa đủ bằng chứng',
} as const;
const confidenceLabels = {
    HIGH: 'Cao',
    MEDIUM: 'Trung bình',
    LOW: 'Thấp',
} as const;

function getInitials(fullName?: string): string {
    if (!fullName?.trim()) return 'U';

    const parts = fullName.trim().split(/\s+/);
    return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
}
