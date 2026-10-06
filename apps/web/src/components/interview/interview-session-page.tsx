'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    MessageSquareText,
    RotateCw,
    Send,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-error';
import {
    useInterviewRuntime,
    useStartInterview,
    useSubmitInterviewAnswer,
} from '@/hooks/interview/use-interviews';
import { getInterviewTypeLabel } from '@/constants/interview-options';

const MAX_ANSWER_LENGTH = 10_000;

export function InterviewSessionPage({ id }: { id: string }) {
    const router = useRouter();
    const runtime = useInterviewRuntime(id);
    const start = useStartInterview(id);
    const submit = useSubmitInterviewAnswer(id);
    const [answer, setAnswer] = useState('');
    const state = runtime.data;
    const turnId = state?.currentTurn?.id;

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

    async function sendAnswer() {
        if (!turnId || !answer.trim()) return;
        try {
            const next = await submit.mutateAsync({
                turnId,
                answer: answer.trim(),
            });
            setAnswer('');
            if (next.completed)
                toast.success('Bạn đã hoàn thành buổi phỏng vấn');
        } catch (error) {
            if (
                error instanceof ApiError &&
                error.code === 'INTERVIEW_TURN_STALE'
            ) {
                toast.info(
                    'Câu hỏi đã thay đổi ở tab khác. Đã tải câu hỏi hiện tại.',
                );
            } else {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'Không thể gửi câu trả lời. Nội dung của bạn vẫn được giữ lại.',
                );
            }
            await runtime.refetch();
        }
    }

    if (runtime.isPending) return <SessionSkeleton />;
    if (runtime.isError || !state) {
        return (
            <main className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center px-4">
                <div className="text-center">
                    <h1 className="text-xl font-extrabold text-slate-950">
                        Không thể tải phiên phỏng vấn
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Vui lòng kiểm tra kết nối rồi thử lại.
                    </p>
                    <Button
                        className="mt-5"
                        onClick={() => void runtime.refetch()}
                    >
                        <RotateCw className="size-4" /> Thử lại
                    </Button>
                </div>
            </main>
        );
    }

    if (!state.session) {
        return (
            <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
                <PageBreadcrumb
                    items={[
                        { label: 'Phỏng vấn', href: '/interviews' },
                        { label: state.interview.targetRole },
                    ]}
                />
                <section className="mt-8 rounded-3xl border border-violet-100 bg-white p-8 text-center shadow-sm sm:p-12">
                    <span className="text-primary mx-auto grid size-16 place-items-center rounded-2xl bg-violet-50">
                        <Sparkles className="size-8" />
                    </span>
                    <h1 className="mt-5 text-2xl font-extrabold text-slate-950">
                        Sẵn sàng bắt đầu?
                    </h1>
                    <p className="mx-auto mt-2 max-w-xl leading-7 text-slate-500">
                        Mỗi câu trả lời được lưu riêng. Bạn có thể rời trang và
                        tiếp tục đúng câu đang làm sau đó.
                    </p>
                    <Button
                        className="mt-7 rounded-lg px-7 py-5 font-bold"
                        disabled={start.isPending}
                        onClick={() => void begin()}
                    >
                        {start.isPending ? (
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

    if (state.completed) {
        return (
            <main className="mx-auto grid min-h-[70vh] max-w-4xl place-items-center px-4 py-8">
                <section className="w-full rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm sm:p-14">
                    <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="size-10" strokeWidth={2.3} />
                    </span>
                    <h1 className="mt-6 text-3xl font-black text-slate-950">
                        Hoàn thành buổi phỏng vấn
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
                        Tất cả câu trả lời đã được lưu. Phần đánh giá và báo cáo
                        sẽ được bổ sung ở phase tiếp theo.
                    </p>
                    <Button
                        asChild
                        className="mt-7 rounded-lg px-6 py-5 font-bold"
                    >
                        <Link href="/interviews">
                            <ArrowLeft className="size-4" /> Về danh sách phỏng
                            vấn
                        </Link>
                    </Button>
                </section>
            </main>
        );
    }

    if (state.processing) {
        return (
            <main className="mx-auto grid min-h-[65vh] max-w-4xl place-items-center px-4 py-8">
                <section
                    className="w-full rounded-3xl border border-violet-100 bg-white p-8 text-center shadow-sm sm:p-12"
                    aria-live="polite"
                >
                    <span className="text-primary mx-auto grid size-16 place-items-center rounded-2xl bg-violet-50">
                        <Sparkles className="size-8 animate-pulse" />
                    </span>
                    <h1 className="mt-5 text-2xl font-extrabold text-slate-950">
                        Đang chuẩn bị câu hỏi tiếp theo...
                    </h1>
                    <p className="mx-auto mt-2 max-w-lg leading-7 text-slate-500">
                        Interviewer đang xem xét câu trả lời vừa rồi để tiếp tục
                        cuộc trao đổi một cách tự nhiên.
                    </p>
                </section>
            </main>
        );
    }

    const turn = state.currentTurn;
    if (!turn) return null;

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
            <PageBreadcrumb
                items={[
                    { label: 'Phỏng vấn', href: '/interviews' },
                    {
                        label: state.interview.targetRole,
                        href: `/interviews/${id}`,
                    },
                    { label: 'Đang thực hiện' },
                ]}
            />

            <header className="mt-5 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-primary text-xs font-black tracking-[0.16em] uppercase">
                        Phỏng vấn mô phỏng
                    </p>
                    <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                        {state.interview.targetRole}
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        {getInterviewTypeLabel(state.interview.interviewType)}
                        {state.interview.targetLevel
                            ? ` · ${state.interview.targetLevel}`
                            : ''}
                        {` · ${state.interview.durationMinutes} phút dự kiến`}
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="self-start rounded-lg font-bold sm:self-auto"
                    onClick={() => router.push('/interviews')}
                >
                    <ArrowLeft className="size-4" /> Rời phiên
                </Button>
            </header>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-extrabold text-slate-900">
                            {turn.isAdaptive
                                ? 'C�u h?i b? sung'
                                : `C�u ${turn.ordinal} / ${state.progress.totalQuestions}`}
                        </p>
                        <p className="text-primary mt-1 text-xs font-bold">
                            Phần {state.progress.sectionNumber} /{' '}
                            {state.progress.totalSections} · {turn.sectionTitle}
                        </p>
                    </div>
                    <span className="text-primary rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold">
                        {state.progress.percentage}% hoàn thành
                    </span>
                </div>
                <div
                    className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-label="Tiến độ phỏng vấn"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={state.progress.percentage}
                >
                    <div
                        className="to-primary h-full rounded-full bg-gradient-to-r from-violet-500 transition-[width] duration-500"
                        style={{ width: `${state.progress.percentage}%` }}
                    />
                </div>
            </section>

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-[0_16px_45px_rgba(79,70,229,0.07)] sm:p-8">
                    <div className="text-primary flex items-center gap-2 text-sm font-extrabold">
                        <MessageSquareText
                            className="size-5"
                            strokeWidth={2.3}
                        />{' '}
                        Câu hỏi hiện tại
                    </div>
                    {turn.transition && (
                        <p className="mt-5 rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm font-semibold text-violet-700">
                            {turn.transition}
                        </p>
                    )}{' '}
                    <h2 className="mt-5 text-xl leading-8 font-extrabold text-slate-950 sm:text-2xl sm:leading-10">
                        {turn.questionText}
                    </h2>
                    <label
                        htmlFor="interview-answer"
                        className="mt-8 block text-sm font-extrabold text-slate-900"
                    >
                        Câu trả lời của bạn
                    </label>
                    <textarea
                        id="interview-answer"
                        value={answer}
                        maxLength={MAX_ANSWER_LENGTH}
                        disabled={submit.isPending}
                        onChange={(event) => setAnswer(event.target.value)}
                        placeholder="Trình bày rõ bối cảnh, cách bạn xử lý và kết quả đạt được..."
                        className="focus-visible:border-primary focus-visible:ring-primary/15 mt-2 min-h-56 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-base leading-7 text-slate-900 transition outline-none focus-visible:ring-4 disabled:opacity-70"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs font-medium text-slate-400">
                        <span aria-live="polite">
                            Câu trả lời chỉ được gửi khi bạn bấm nút bên dưới.
                        </span>
                        <span className="tabular-nums">
                            {answer.length.toLocaleString('vi-VN')} /{' '}
                            {MAX_ANSWER_LENGTH.toLocaleString('vi-VN')}
                        </span>
                    </div>
                    <div className="mt-5 flex justify-end">
                        <Button
                            className="rounded-lg px-6 py-5 font-bold"
                            disabled={!answer.trim() || submit.isPending}
                            onClick={() => void sendAnswer()}
                        >
                            {submit.isPending ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            {turn.questionType === 'CANDIDATE' &&
                            turn.ordinal === state.progress.totalQuestions
                                ? 'Hoàn thành'
                                : 'Gửi và sang câu tiếp theo'}
                        </Button>
                    </div>
                </section>

                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
                    <Clock3 className="text-primary size-6" strokeWidth={2.3} />
                    <h2 className="mt-3 font-extrabold text-slate-950">
                        Làm theo nhịp của bạn
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Không có đồng hồ đếm ngược. Hãy trả lời có cấu trúc và
                        kiểm tra lại trước khi gửi.
                    </p>
                    <div className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
                        Câu trả lời đã gửi không thể sửa trong Phase 6.
                    </div>
                </aside>
            </div>
        </main>
    );
}

function SessionSkeleton() {
    return (
        <main className="mx-auto w-full max-w-6xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
            <div className="h-5 w-48 rounded bg-slate-200" />
            <div className="mt-8 h-24 rounded-2xl bg-slate-100" />
            <div className="mt-6 h-[480px] rounded-3xl bg-slate-100" />
        </main>
    );
}
