'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowRight,
    Bot,
    BriefcaseBusiness,
    CheckCircle2,
    Gauge,
    Lightbulb,
    LoaderCircle,
    LogOut,
    RotateCw,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { InterviewAnswerEditor } from '@/components/interview/interview-answer-editor';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getInterviewTypeLabel } from '@/constants/interview-options';
import {
    useInterviewRuntime,
    useStartInterview,
    useSubmitInterviewAnswer,
} from '@/hooks/interview/use-interviews';
import { ApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import type { InterviewRuntimeState } from '@/types/interview';

const levelLabels: Record<string, string> = {
    INTERN: 'Thực tập sinh',
    FRESHER: 'Fresher',
    JUNIOR: 'Junior',
    MIDDLE: 'Middle',
    SENIOR: 'Senior',
    LEAD: 'Lead',
};

export function InterviewSessionPage({ id }: { id: string }) {
    const router = useRouter();
    const runtime = useInterviewRuntime(id);
    const start = useStartInterview(id);
    const submit = useSubmitInterviewAnswer(id);
    const [answer, setAnswer] = useState('');
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [leaveOpen, setLeaveOpen] = useState(false);
    const submittingRef = useRef(false);
    const previousTurnId = useRef<string | null>(null);
    const state = runtime.data;
    const turnId = state?.currentTurn?.id ?? null;

    useEffect(() => {
        if (
            previousTurnId.current &&
            turnId &&
            previousTurnId.current !== turnId
        ) {
            setAnswer('');
            setSubmitError(null);
        }
        previousTurnId.current = turnId;
    }, [turnId]);

    async function begin() {
        try {
            await start.mutateAsync();
            toast.success('Buổi phỏng vấn đã bắt đầu');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể bắt đầu buổi phỏng vấn.',
            );
        }
    }

    async function sendAnswer(answerOverride = answer) {
        const normalized = answerOverride.trim();
        if (
            !turnId ||
            !normalized ||
            submit.isPending ||
            submittingRef.current
        ) {
            return;
        }

        submittingRef.current = true;
        setSubmitError(null);
        try {
            const next = await submit.mutateAsync({
                turnId,
                answer: normalized,
            });
            setAnswer('');
            if (next.completed) {
                toast.success('Bạn đã hoàn thành buổi phỏng vấn');
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Không thể gửi câu trả lời. Vui lòng thử lại.';
            if (
                error instanceof ApiError &&
                error.code === 'INTERVIEW_TURN_STALE'
            ) {
                toast.info(
                    'Câu hỏi đã thay đổi ở tab khác. Đã tải lại trạng thái mới nhất.',
                );
            } else {
                setSubmitError(message);
                toast.error(message);
            }
            await runtime.refetch();
        } finally {
            submittingRef.current = false;
        }
    }

    if (runtime.isPending) return <SessionSkeleton />;
    if (runtime.isError || !state) {
        return <SessionError onRetry={() => void runtime.refetch()} />;
    }
    if (!state.session) {
        return (
            <SessionStart
                state={state}
                pending={start.isPending}
                onStart={() => void begin()}
            />
        );
    }

    return (
        <>
            <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                <PageBreadcrumb
                    items={[
                        { label: 'Phỏng vấn', href: '/interviews' },
                        {
                            label: state.interview.targetRole,
                            href: '/interviews/' + id,
                        },
                        {
                            label: state.completed
                                ? 'Hoàn thành'
                                : 'Đang thực hiện',
                        },
                    ]}
                />
                <SessionPageHeader
                    state={state}
                    onLeave={() => setLeaveOpen(true)}
                />
                <SessionStatusBar state={state} />

                <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0">
                        {state.completed ? (
                            <CompletedState />
                        ) : state.currentTurn ? (
                            <QuestionCard
                                state={state}
                                answer={answer}
                                error={submitError}
                                pending={submit.isPending || state.processing}
                                onAnswerChange={(value) => {
                                    setAnswer(value);
                                    if (submitError) setSubmitError(null);
                                }}
                                onSubmit={(value) => void sendAnswer(value)}
                            />
                        ) : (
                            <ThinkingState />
                        )}
                    </div>
                    <InterviewContextSidebar state={state} />
                </div>
            </main>

            <ConfirmDialog
                open={leaveOpen}
                onOpenChange={setLeaveOpen}
                title="Rời phiên phỏng vấn?"
                description="Tiến trình đã được lưu trên hệ thống. Bạn có thể quay lại và tiếp tục đúng câu hỏi hiện tại."
                confirmLabel="Rời phiên"
                onConfirm={() => router.push('/interviews')}
            />
        </>
    );
}

function SessionPageHeader({
    state,
    onLeave,
}: {
    state: InterviewRuntimeState;
    onLeave: () => void;
}) {
    return (
        <header className="border-border mt-4 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <p className="text-primary text-xs font-black tracking-[0.16em] uppercase">
                    Phỏng vấn mô phỏng
                </p>
                <h1 className="text-foreground mt-2 truncate text-2xl font-black tracking-tight sm:text-3xl">
                    Phiên phỏng vấn
                </h1>
                <p className="text-muted-foreground mt-1.5 text-sm font-medium">
                    Trả lời từng câu hỏi theo nhịp độ của bạn.
                </p>
            </div>
            {!state.completed && (
                <Button
                    type="button"
                    variant="outline"
                    className="!border-destructive/70 text-destructive hover:bg-destructive/5 hover:text-destructive self-start rounded-lg font-bold sm:self-auto"
                    onClick={onLeave}
                >
                    <LogOut className="size-4" />
                    Rời phiên
                </Button>
            )}
        </header>
    );
}

function SessionStatusBar({ state }: { state: InterviewRuntimeState }) {
    const targetLevel = state.interview.targetLevel
        ? (levelLabels[state.interview.targetLevel] ??
          state.interview.targetLevel)
        : 'Chưa xác định';

    return (
        <section className="border-border bg-card mt-5 rounded-xl border p-4 shadow-[0_8px_28px_rgba(60,45,110,0.045)] sm:p-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex min-w-0 items-center gap-3.5">
                    <span className="bg-secondary text-primary grid size-11 shrink-0 place-items-center rounded-xl">
                        <BriefcaseBusiness
                            className="size-5"
                            strokeWidth={2.2}
                            aria-hidden="true"
                        />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-card-foreground truncate text-lg font-extrabold">
                            {state.interview.targetRole}
                        </h2>
                        <p className="text-muted-foreground mt-0.5 truncate text-sm font-semibold">
                            {getInterviewTypeLabel(
                                state.interview.interviewType,
                            )}{' '}
                            · {targetLevel}
                        </p>
                    </div>
                </div>

                {state.progress.currentSection && (
                    <div className="bg-secondary/70 rounded-xl px-4 py-3 sm:text-right">
                        <p className="text-primary text-xs font-extrabold tracking-wide uppercase">
                            Phần {state.progress.sectionNumber}/
                            {state.progress.totalSections}
                        </p>
                        <p className="text-foreground mt-0.5 text-sm font-bold">
                            {state.progress.currentSection}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
function QuestionCard({
    state,
    answer,
    error,
    pending,
    onAnswerChange,
    onSubmit,
}: {
    state: InterviewRuntimeState;
    answer: string;
    error: string | null;
    pending: boolean;
    onAnswerChange: (value: string) => void;
    onSubmit: (value: string) => void;
}) {
    const turn = state.currentTurn!;

    return (
        <section
            key={turn.id}
            className="animate-in fade-in slide-in-from-bottom-1 border-border bg-card relative min-h-[520px] overflow-hidden rounded-xl border shadow-[0_16px_44px_rgba(66,48,125,0.065)] duration-300 motion-reduce:animate-none"
            aria-busy={pending}
        >
            <div
                className={cn(
                    'transition-[opacity,filter] duration-300',
                    pending &&
                        'pointer-events-none opacity-25 blur-[0.35px] select-none',
                )}
                aria-hidden={pending || undefined}
            >
                <div className="p-5 sm:p-7 lg:p-8">
                    <div className="bg-accent text-accent-foreground inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-extrabold">
                        Câu hỏi hiện tại
                    </div>

                    <h2 className="text-card-foreground mt-4 max-w-4xl text-xl leading-8 font-extrabold sm:text-2xl sm:leading-10">
                        {turn.questionText}
                    </h2>
                </div>

                <div className="border-border border-t p-5 sm:p-7 lg:p-8">
                    <InterviewAnswerEditor
                        key={turn.id}
                        value={answer}
                        error={error}
                        pending={pending}
                        onChange={onAnswerChange}
                        onSubmit={onSubmit}
                    />
                </div>
            </div>

            {pending && <AnswerProcessingOverlay />}
        </section>
    );
}
function AnswerProcessingOverlay() {
    return (
        <div
            className="bg-card/72 absolute inset-0 z-10 grid place-items-center px-6 text-center backdrop-blur-[1.5px]"
            role="status"
            aria-live="polite"
        >
            <div className="animate-in fade-in zoom-in-95 duration-300 motion-reduce:animate-none">
                <div className="relative mx-auto grid size-24 place-items-center">
                    <span className="bg-primary/8 absolute inset-0 animate-pulse rounded-full" />
                    <span className="bg-secondary ring-primary/10 relative grid size-16 place-items-center rounded-full ring-8">
                        <Bot
                            className="text-primary size-9"
                            strokeWidth={2.15}
                            aria-hidden="true"
                        />
                    </span>
                    <span className="bg-primary absolute right-3 bottom-2 size-2.5 animate-bounce rounded-full [animation-delay:80ms]" />
                    <span className="bg-primary/70 absolute right-0 -bottom-1 size-2 animate-bounce rounded-full [animation-delay:180ms]" />
                </div>
                <h2 className="text-foreground mt-5 text-lg font-extrabold sm:text-xl">
                    Đang phân tích câu trả lời của bạn...
                </h2>
                <p className="text-muted-foreground mt-1.5 text-sm font-medium">
                    Vui lòng chờ trong giây lát
                </p>
            </div>
        </div>
    );
}
function ThinkingState() {
    return (
        <section
            className="border-border bg-card grid min-h-[520px] place-items-center rounded-xl border p-7 text-center shadow-[0_16px_44px_rgba(66,48,125,0.065)]"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="max-w-lg">
                <div className="relative mx-auto grid size-20 place-items-center">
                    <span className="bg-primary/10 absolute inset-0 animate-ping rounded-full motion-reduce:animate-none" />
                    <span className="bg-secondary text-primary relative grid size-16 place-items-center rounded-2xl">
                        <Sparkles className="size-7 animate-pulse motion-reduce:animate-none" />
                    </span>
                </div>
                <h2 className="text-card-foreground mt-6 text-2xl font-extrabold">
                    Đang phân tích câu trả lời của bạn...
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-6 font-medium">
                    Vui lòng chờ trong giây lát. Người phỏng vấn đang chuẩn bị
                    câu hỏi tiếp theo.
                </p>
                <div
                    className="mx-auto mt-6 flex w-fit gap-1.5"
                    aria-hidden="true"
                >
                    {[0, 1, 2].map((item) => (
                        <span
                            key={item}
                            className="bg-primary/70 size-2 animate-bounce rounded-full motion-reduce:animate-none"
                            style={{ animationDelay: item * 120 + 'ms' }}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

function CompletedState() {
    return (
        <section className="border-border bg-card grid min-h-[520px] place-items-center overflow-hidden rounded-xl border p-7 text-center shadow-[0_16px_44px_rgba(66,48,125,0.065)]">
            <div className="relative max-w-xl">
                <span className="bg-primary/5 absolute -top-10 -left-8 size-16 rounded-full" />
                <span className="bg-secondary/70 absolute -right-8 -bottom-8 size-24 rounded-full" />
                <span className="relative mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="size-10" strokeWidth={2.2} />
                </span>
                <h2 className="text-card-foreground relative mt-6 text-2xl font-black sm:text-3xl">
                    Bạn đã hoàn thành buổi phỏng vấn!
                </h2>
                <p className="text-muted-foreground relative mx-auto mt-3 max-w-lg leading-7">
                    Cảm ơn bạn đã tham gia. Kết quả phỏng vấn đang được tổng
                    hợp.
                </p>
                <Button
                    asChild
                    className="relative mt-7 rounded-lg px-6 py-5 font-bold"
                >
                    <Link href="/interviews">
                        Về danh sách phỏng vấn
                        <ArrowRight className="size-4" />
                    </Link>
                </Button>
            </div>
        </section>
    );
}

function InterviewContextSidebar({ state }: { state: InterviewRuntimeState }) {
    const targetLevel = state.interview.targetLevel
        ? (levelLabels[state.interview.targetLevel] ??
          state.interview.targetLevel)
        : 'Chưa xác định';

    return (
        <aside className="grid h-fit gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <SidebarCard
                title="Thông tin buổi phỏng vấn"
                icon={<Gauge className="size-5" strokeWidth={2.2} />}
            >
                <InfoRow label="Vị trí" value={state.interview.targetRole} />
                <InfoRow label="Cấp bậc" value={targetLevel} />
                <InfoRow
                    label="Thời lượng"
                    value={'~ ' + state.interview.durationMinutes + ' phút'}
                />
                <InfoRow
                    label="Hình thức"
                    value={getInterviewTypeLabel(state.interview.interviewType)}
                    last={state.interview.focusAreas.length === 0}
                />
                {state.interview.focusAreas.length > 0 && (
                    <div className="pt-4">
                        <p className="text-muted-foreground text-xs font-bold">
                            Trọng tâm
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {state.interview.focusAreas
                                .slice(0, 8)
                                .map((area) => (
                                    <span
                                        key={area}
                                        className="bg-secondary text-secondary-foreground rounded-md px-2.5 py-1 text-xs font-bold"
                                    >
                                        {area}
                                    </span>
                                ))}
                        </div>
                    </div>
                )}
            </SidebarCard>

            <SidebarCard
                title="Mẹo nhỏ"
                icon={<Lightbulb className="size-5" strokeWidth={2.2} />}
            >
                <ul className="text-muted-foreground space-y-3 text-sm leading-6 font-medium">
                    <Tip>Trả lời rõ ràng, có cấu trúc.</Tip>
                    <Tip>Có thể đưa ra ví dụ thực tế.</Tip>
                    <Tip>Giải thích đủ ý thay vì trả lời quá ngắn.</Tip>
                    <Tip>
                        Nếu chưa chắc, hãy chia sẻ hướng tiếp cận của bạn.
                    </Tip>
                </ul>
            </SidebarCard>
        </aside>
    );
}

function SidebarCard({
    title,
    icon,
    children,
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="border-border bg-card rounded-xl border p-5">
            <div className="text-card-foreground flex items-center gap-2.5 font-extrabold">
                <span className="text-primary">{icon}</span>
                <h2>{title}</h2>
            </div>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function InfoRow({
    label,
    value,
    last = false,
}: {
    label: string;
    value: string;
    last?: boolean;
}) {
    const classes =
        'flex items-start justify-between gap-4 py-3 first:pt-0 ' +
        (last ? '' : 'border-b border-border');
    return (
        <div className={classes}>
            <span className="text-muted-foreground text-sm font-semibold">
                {label}
            </span>
            <span className="text-foreground max-w-[60%] text-right text-sm font-extrabold">
                {value}
            </span>
        </div>
    );
}

function Tip({ children }: { children: ReactNode }) {
    return (
        <li className="flex gap-2.5">
            <CheckCircle2
                className="text-primary mt-1 size-4 shrink-0"
                strokeWidth={2.2}
                aria-hidden="true"
            />
            <span>{children}</span>
        </li>
    );
}

function SessionStart({
    state,
    pending,
    onStart,
}: {
    state: InterviewRuntimeState;
    pending: boolean;
    onStart: () => void;
}) {
    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <PageBreadcrumb
                items={[
                    { label: 'Phỏng vấn', href: '/interviews' },
                    { label: state.interview.targetRole },
                ]}
            />
            <section className="border-border bg-card mt-7 overflow-hidden rounded-xl border p-7 text-center shadow-[0_16px_44px_rgba(66,48,125,0.055)] sm:p-12">
                <span className="bg-secondary text-primary mx-auto grid size-16 place-items-center rounded-2xl">
                    <Bot className="size-8" strokeWidth={2.1} />
                </span>
                <h1 className="text-card-foreground mt-5 text-2xl font-black sm:text-3xl">
                    Sẵn sàng bắt đầu?
                </h1>
                <p className="text-muted-foreground mx-auto mt-3 max-w-xl leading-7">
                    Câu trả lời được lưu sau mỗi lần gửi. Bạn có thể rời trang
                    và tiếp tục đúng câu hỏi hiện tại khi quay lại.
                </p>
                <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                    <span className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 text-sm font-bold">
                        {state.interview.targetRole}
                    </span>
                    <span className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm font-bold">
                        {getInterviewTypeLabel(state.interview.interviewType)}
                    </span>
                    <span className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm font-bold">
                        ~ {state.interview.durationMinutes} phút
                    </span>
                </div>
                <Button
                    className="mt-7 rounded-lg px-7 py-5 font-bold"
                    disabled={pending}
                    onClick={onStart}
                >
                    {pending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                        <ArrowRight className="size-4" />
                    )}
                    Bắt đầu phỏng vấn
                </Button>
            </section>
        </main>
    );
}

function SessionError({ onRetry }: { onRetry: () => void }) {
    return (
        <main className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4">
            <section className="border-border bg-card w-full rounded-xl border p-8 text-center">
                <span className="bg-destructive/10 text-destructive mx-auto grid size-14 place-items-center rounded-xl">
                    <RotateCw className="size-6" />
                </span>
                <h1 className="text-card-foreground mt-5 text-xl font-extrabold">
                    Không thể tải phiên phỏng vấn
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    Vui lòng kiểm tra kết nối rồi thử lại.
                </p>
                <Button className="mt-5 rounded-lg font-bold" onClick={onRetry}>
                    <RotateCw className="size-4" />
                    Thử lại
                </Button>
            </section>
        </main>
    );
}

function SessionSkeleton() {
    return (
        <main
            className="mx-auto w-full max-w-[1600px] animate-pulse px-4 py-6 sm:px-6 lg:px-8"
            aria-label="Đang tải phiên phỏng vấn"
        >
            <div className="bg-muted h-5 w-52 rounded" />
            <div className="bg-muted mt-5 h-24 rounded-xl" />
            <div className="bg-muted mt-5 h-40 rounded-xl" />
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="bg-muted h-[520px] rounded-xl" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="bg-muted h-72 rounded-xl" />
                    <div className="bg-muted h-64 rounded-xl" />
                </div>
            </div>
        </main>
    );
}
