'use client';
import {
    BrainCircuit,
    BriefcaseBusiness,
    Clock3,
    FileText,
    RefreshCw,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import {
    useInterview,
    useRegenerateInterviewPlan,
} from '@/hooks/interview/use-interviews';
export function InterviewReadyPage({ id }: { id: string }) {
    const query = useInterview(id),
        regen = useRegenerateInterviewPlan(id);
    if (query.isPending)
        return (
            <main className="mx-auto max-w-[1280px] p-8">
                <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
            </main>
        );
    if (!query.data)
        return (
            <main className="p-8 text-center">
                <h1 className="text-xl font-bold">Không thể tải kế hoạch</h1>
                <Button className="mt-4" onClick={() => query.refetch()}>
                    Thử lại
                </Button>
            </main>
        );
    const x = query.data,
        p = x.plans[0],
        d = p?.planData,
        isDraft = x.status === 'DRAFT';
    async function rerun() {
        try {
            await regen.mutateAsync();
            toast.success('Đã tạo phiên bản kế hoạch mới');
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : 'Không thể tạo lại kế hoạch',
            );
        }
    }
    return (
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-8">
            <PageBreadcrumb
                items={[
                    { label: 'Phỏng vấn', href: '/interviews' },
                    { label: x.targetRole },
                ]}
            />
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="mt-5 text-3xl font-extrabold">
                        {isDraft
                            ? 'Bản nháp kế hoạch phỏng vấn'
                            : 'Kế hoạch phỏng vấn đã sẵn sàng'}
                    </h1>
                    <p className="mt-2 text-slate-500">
                        {x.targetRole} · {x.durationMinutes} phút ·{' '}
                        {x.questionCount} câu hỏi
                    </p>
                </div>
                <Button
                    variant="outline"
                    disabled={regen.isPending}
                    onClick={rerun}
                >
                    <RefreshCw />
                    Lập kế hoạch lại
                </Button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <Meta icon={FileText} label="CV" value={x.cv.name} />
                <Meta
                    icon={BriefcaseBusiness}
                    label="Vị trí"
                    value={x.jobDescription.title}
                />
                <Meta
                    icon={BrainCircuit}
                    label="Phiên bản"
                    value={'v' + (p?.version ?? 1)}
                />
            </div>
            {d && (
                <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
                    <div className="space-y-5">
                        <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6">
                            <h2 className="flex items-center gap-3 text-xl font-extrabold">
                                <Sparkles className="text-primary size-6" />
                                Chiến lược tổng quan
                            </h2>
                            <p className="mt-4 leading-7 text-slate-600">
                                {d.summary}
                            </p>
                            <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
                                {d.openingStrategy}
                            </p>
                        </section>
                        <div className="rounded-xl border border-violet-100 bg-white px-5 py-4">
                            <p className="font-extrabold text-slate-900">
                                Câu hỏi dự kiến
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Đây là các câu hỏi chính được lên kế hoạch. Khi
                                phỏng vấn, cách diễn đạt hoặc mức độ đào sâu có
                                thể thay đổi dựa trên câu trả lời của bạn.
                            </p>
                        </div>
                        {d.sections.map((s, i) => (
                            <section
                                key={s.title}
                                className="rounded-2xl border border-slate-200 bg-white p-6"
                            >
                                <div className="flex justify-between gap-4">
                                    <div>
                                        <p className="text-primary text-xs font-extrabold tracking-wider">
                                            PHẦN {i + 1}
                                        </p>
                                        <h2 className="mt-1 text-lg font-extrabold">
                                            {s.title}
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {s.objective}
                                        </p>
                                    </div>
                                    <span className="flex h-fit items-center gap-1 text-sm font-bold whitespace-nowrap text-slate-500">
                                        <Clock3 className="size-4" />
                                        {s.durationMinutes} phút
                                    </span>
                                </div>
                                <div className="mt-5 space-y-3">
                                    {s.questions.map((q) => (
                                        <div
                                            key={q.order}
                                            className="rounded-xl bg-slate-50 p-4"
                                        >
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className="text-primary text-xs font-extrabold">
                                                    Câu {q.order}
                                                </span>
                                                <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                                                    {q.topic}
                                                </span>
                                                {q.difficulty && (
                                                    <span className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                                                        {q.difficulty === 'EASY'
                                                            ? 'Cơ bản'
                                                            : q.difficulty ===
                                                                'MEDIUM'
                                                              ? 'Trung bình'
                                                              : 'Nâng cao'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="leading-6 font-bold">
                                                {q.suggestedQuestion}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                    <aside className="space-y-5">
                        <List
                            title="Năng lực kỹ thuật"
                            items={d.technicalCompetencies}
                        />
                        <List
                            title="Điểm mạnh cần xác nhận"
                            items={d.strengthsToValidate}
                        />
                        <List
                            title="Khoảng trống cần đào sâu"
                            items={d.gapsToProbe}
                        />
                        <List
                            title="Hướng thích ứng"
                            items={d.adaptationGuidance}
                        />
                        <Button
                            disabled
                            className="h-12 w-full rounded-lg font-bold"
                        >
                            Bắt đầu ở Phase 6
                        </Button>
                    </aside>
                </div>
            )}
        </main>
    );
}
function Meta({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof FileText;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <Icon className="text-primary size-6" />
            <p className="mt-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                {label}
            </p>
            <p className="mt-1 font-extrabold">{value}</p>
        </div>
    );
}
function List({ title, items }: { title: string; items: string[] }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-extrabold">{title}</h3>
            <div className="mt-3 space-y-2">
                {items.length ? (
                    items.map((x, i) => (
                        <div
                            key={i}
                            className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600"
                        >
                            {x}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-400">
                        Không có nội dung đáng chú ý.
                    </p>
                )}
            </div>
        </section>
    );
}
