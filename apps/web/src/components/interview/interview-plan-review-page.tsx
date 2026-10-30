'use client';

import Link from 'next/link';
import {
    ArrowLeft,
    ArrowRight,
    BriefcaseBusiness,
    CheckCircle2,
    Clock3,
    FileText,
    RefreshCw,
    Settings2,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { InterviewWizardStepper } from '@/components/interview/interview-wizard-stepper';
import { Button } from '@/components/ui/button';
import { getInterviewTypeLabel } from '@/constants/interview-options';
import {
    useInterview,
    useRegenerateInterviewPlan,
} from '@/hooks/interview/use-interviews';
import type { InterviewPlanData } from '@/types/interview';

const levelLabels: Record<string, string> = {
    INTERN: 'Thực tập sinh',
    FRESHER: 'Fresher',
    JUNIOR: 'Junior',
    MIDDLE: 'Middle',
    SENIOR: 'Senior',
    LEAD: 'Lead',
};

export function InterviewPlanReviewPage({ id }: { id: string }) {
    const query = useInterview(id);
    const regenerate = useRegenerateInterviewPlan(id);
    if (query.isPending) return <ReviewSkeleton />;
    if (!query.data) return <ReviewError onRetry={() => query.refetch()} />;
    const interview = query.data;
    const plan = interview.plans[0];
    const data = plan?.planData;

    async function rerun() {
        try {
            await regenerate.mutateAsync();
            toast.success('Đã tạo phiên bản kế hoạch mới');
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể tạo lại kế hoạch.',
            );
        }
    }

    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <PageBreadcrumb
                items={[
                    { label: 'Phỏng vấn', href: '/interviews' },
                    {
                        label:
                            interview.targetRole || 'Chi tiết buổi phỏng vấn',
                    },
                ]}
            />
            <header className="mt-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                    Tạo buổi phỏng vấn mới
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
                    Xem lại cấu hình và kế hoạch do AI tạo trước khi bắt đầu.
                </p>
            </header>
            <InterviewWizardStepper current={3} />

            {data ? (
                <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                                <span className="text-primary grid size-10 place-items-center rounded-lg bg-violet-50">
                                    <Settings2 className="size-5" />
                                </span>
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-950">
                                        Bản xem trước kế hoạch
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Kế hoạch được cá nhân hóa từ CV, JD và
                                        cấu hình đã chọn.
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="rounded-sm font-bold"
                                disabled={regenerate.isPending}
                                onClick={() => void rerun()}
                            >
                                <RefreshCw
                                    className={
                                        regenerate.isPending
                                            ? 'size-4 animate-spin'
                                            : 'size-4'
                                    }
                                />
                                Tạo lại kế hoạch
                            </Button>
                        </div>
                        <div className="divide-y divide-slate-100 px-3 sm:px-5">
                            {data.sections.map((section, index) => (
                                <PlanSection
                                    key={`${section.title}-${index}`}
                                    section={section}
                                    index={index}
                                />
                            ))}
                        </div>
                    </section>
                    <aside className="space-y-4">
                        <SummaryCard title="Tóm tắt phỏng vấn">
                            <SummaryRow
                                label="Loại phỏng vấn"
                                value={getInterviewTypeLabel(
                                    interview.interviewType,
                                )}
                            />
                            <SummaryRow
                                label="Vai trò mục tiêu"
                                value={interview.targetRole}
                            />
                            <SummaryRow
                                label="Cấp độ"
                                value={
                                    interview.targetLevel
                                        ? (levelLabels[interview.targetLevel] ??
                                          interview.targetLevel)
                                        : 'Thích ứng'
                                }
                            />
                            <SummaryRow
                                label="Thời lượng"
                                value={`${interview.durationMinutes} phút`}
                            />
                            <SummaryRow
                                label="Số câu hỏi"
                                value={`${interview.questionCount} câu`}
                            />
                        </SummaryCard>
                        <SummaryCard title="Ngữ cảnh sử dụng">
                            <ContextRow
                                icon={FileText}
                                label="CV"
                                value={interview.cv.name}
                            />
                            <ContextRow
                                icon={BriefcaseBusiness}
                                label="Mô tả công việc"
                                value={interview.jobDescription.title}
                            />
                        </SummaryCard>
                        <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
                            <h3 className="text-primary flex items-center gap-2 font-extrabold">
                                <Sparkles className="size-5" />
                                Cá nhân hóa bằng AI
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Câu hỏi được tạo dựa trên kinh nghiệm, yêu cầu
                                công việc và các khoảng trống cần làm rõ.
                            </p>
                        </section>
                    </aside>
                </div>
            ) : (
                <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
                    <p className="font-extrabold">Chưa có kế hoạch hoàn tất</p>
                    <p className="mt-1 text-sm">
                        Hãy thử tạo lại kế hoạch khi dịch vụ AI sẵn sàng.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => void rerun()}
                    >
                        Tạo lại kế hoạch
                    </Button>
                </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <Button
                    asChild
                    variant="outline"
                    className="rounded-sm px-4 py-5 font-bold"
                >
                    <Link href="/interviews/new">
                        <ArrowLeft className="size-4" />
                        Tạo cấu hình khác
                    </Link>
                </Button>
                {interview.status === 'READY' ? (
                    <Button asChild className="rounded-sm px-6 py-5 font-bold">
                        <Link href={`/interviews/${id}/setup`}>
                            <Sparkles className="size-4" />
                            Kiểm tra thiết bị
                        </Link>
                    </Button>
                ) : interview.status === 'COMPLETED' ? (
                    <div className="flex flex-wrap gap-2">
                        <Button
                            asChild
                            variant="outline"
                            className="rounded-sm px-5 py-5 font-bold"
                        >
                            <Link
                                href={`/interviews/${id}/report#question-review`}
                            >
                                Xem lại câu trả lời
                            </Link>
                        </Button>
                        <Button
                            asChild
                            className="rounded-sm px-6 py-5 font-bold"
                        >
                            <Link href={`/interviews/${id}/report`}>
                                Xem báo cáo
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                ) : interview.status === 'IN_PROGRESS' ? (
                    <Button asChild className="rounded-sm px-6 py-5 font-bold">
                        <Link href={`/interviews/${id}/session`}>
                            Tiếp tục phỏng vấn
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                ) : (
                    <Button asChild className="rounded-sm px-6 py-5 font-bold">
                        <Link href="/interviews">
                            Về danh sách
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                )}
            </div>
        </main>
    );
}

function PlanSection({
    section,
    index,
}: {
    section: InterviewPlanData['sections'][number];
    index: number;
}) {
    return (
        <article className="grid gap-4 px-2 py-5 lg:grid-cols-[250px_minmax(0,1fr)]">
            <div>
                <div className="flex items-start gap-3">
                    <span className="text-primary grid size-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-sm font-black">
                        {index + 1}
                    </span>
                    <div>
                        <h3 className="font-extrabold text-slate-950">
                            {section.title}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                            {section.objective}
                        </p>
                        <p className="text-primary mt-2 flex items-center gap-1 text-xs font-bold">
                            <Clock3 className="size-3.5" />
                            Khoảng {section.durationMinutes} phút
                        </p>
                    </div>
                </div>
            </div>
            <ol className="space-y-2 rounded-xl bg-violet-50/50 p-3">
                {section.questions.map((question) => (
                    <li
                        key={question.order}
                        className="flex gap-3 rounded-lg bg-white px-3 py-3"
                    >
                        <span className="text-primary grid size-7 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-black">
                            {question.order}
                        </span>
                        <div>
                            <p className="text-sm leading-6 font-bold text-slate-800">
                                {question.suggestedQuestion}
                            </p>
                            {question.reasonToAsk && (
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {question.reasonToAsk}
                                </p>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </article>
    );
}
function SummaryCard({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-extrabold text-slate-950">{title}</h2>
            <div className="mt-4 space-y-3">{children}</div>
        </section>
    );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="text-right font-bold text-slate-900">{value}</span>
        </div>
    );
}
function ContextRow({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof FileText;
    label: string;
    value: string;
}) {
    return (
        <div className="flex gap-3 rounded-xl bg-slate-50 p-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-0.5 truncate text-sm font-extrabold text-slate-900">
                    {value}
                </p>
            </div>
            <Icon className="text-primary ml-auto size-4 shrink-0" />
        </div>
    );
}
function ReviewSkeleton() {
    return (
        <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
            <div className="h-8 w-72 animate-pulse rounded bg-slate-100" />
            <div className="mt-8 h-[520px] animate-pulse rounded-2xl bg-slate-100" />
        </main>
    );
}
function ReviewError({ onRetry }: { onRetry: () => void }) {
    return (
        <main className="mx-auto max-w-2xl p-8 text-center">
            <h1 className="text-xl font-extrabold">
                Không thể tải kế hoạch phỏng vấn
            </h1>
            <Button className="mt-4" onClick={onRetry}>
                Thử lại
            </Button>
        </main>
    );
}
