'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    BookOpenCheck,
    CircleAlert,
    Target,
    TrendingUp,
} from 'lucide-react';

import { PageBreadcrumb } from '@/components/common/page-breadcrumb';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useInterviewProgress } from '@/hooks/interview/use-interviews';

export function InterviewProgressPage() {
    const query = useInterviewProgress();
    const [competencyKey, setCompetencyKey] = useState('');
    const selected = useMemo(() => {
        const series = query.data?.competencySeries ?? [];
        return series.find((item) => item.competencyKey === competencyKey) ?? series[0];
    }, [query.data, competencyKey]);

    if (query.isPending) return <ProgressSkeleton />;
    if (query.isError || !query.data)
        return (
            <StatePanel
                title="Không thể tải dữ liệu tiến bộ"
                description="Hãy kiểm tra kết nối rồi thử lại. Lỗi này không làm mất lịch sử phỏng vấn của bạn."
                onRetry={() => void query.refetch()}
            />
        );

    const data = query.data;
    return (
        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8">
            <PageBreadcrumb
                items={[
                    { label: 'Phỏng vấn', href: '/interviews' },
                    { label: 'Tiến bộ' },
                ]}
            />
            <header className="mt-6 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-primary text-xs font-extrabold tracking-[.18em] uppercase">
                        Theo dõi năng lực
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                        Tiến bộ phỏng vấn
                    </h1>
                    <p className="mt-2 max-w-2xl text-slate-500">
                        Xu hướng chỉ được tính từ những buổi có cấu hình và rubric tương thích.
                    </p>
                </div>
                <Button asChild variant="outline" className="font-bold">
                    <Link href="/interviews">
                        <ArrowLeft className="size-4" />
                        Về lịch sử
                    </Link>
                </Button>
            </header>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard icon={BookOpenCheck} label="Đã hoàn thành" value={data.summary.completedInterviewCount} />
                <MetricCard icon={BarChart3} label="Đã chấm điểm" value={data.summary.evaluatedInterviewCount} />
                <MetricCard icon={Target} label="Có thể so sánh" value={data.summary.comparableInterviewCount} />
                <MetricCard
                    icon={TrendingUp}
                    label="Điểm gần nhất"
                    value={data.summary.latestScore == null ? '—' : data.summary.latestScore.toFixed(1) + '/10'}
                />

                <MetricCard
                    icon={Target}
                    label="Coverage trung bình"
                    value={data.summary.averageCoverage == null ? '—' : Math.round(data.summary.averageCoverage * 100) + '%'}
                />            </section>

            {data.activeComparison && (
                <section className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
                    <p className="text-sm font-extrabold text-violet-950">Ngữ cảnh đang so sánh</p>
                    <p className="mt-1 text-sm leading-6 text-violet-800">
                        {data.activeComparison.role} · {data.activeComparison.level ?? 'Chưa xác định cấp độ'} · {labelType(data.activeComparison.interviewType)} · rubric {data.activeComparison.rubricVersion}
                    </p>
                </section>
            )}

            {data.limitations.map((message) => (
                <div key={message} className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                    {message}
                </div>
            ))}

            {data.overallSeries.length < 2 ? (
                <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <BarChart3 className="mx-auto size-10 text-slate-400" />
                    <h2 className="mt-4 text-xl font-extrabold">Chưa đủ dữ liệu để tạo xu hướng</h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        Cần ít nhất hai buổi đã hoàn thành và được chấm bằng cùng vai trò, cấp độ, loại phỏng vấn và rubric.
                    </p>
                    <Button asChild className="mt-5"><Link href="/interviews/new">Tạo buổi phỏng vấn</Link></Button>
                </section>
            ) : (
                <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.85fr)]">
                    <div className="space-y-5">
                        <ChartCard title="Xu hướng điểm tổng" description="Thang điểm 0–10; mỗi điểm là một buổi tương thích.">
                            <TrendChart points={data.overallSeries.map((point) => ({ id: point.interviewId, score: point.score, date: point.date }))} />
                        </ChartCard>
                        {data.competencySeries.length > 0 && (
                            <ChartCard
                                title="Tiến bộ theo năng lực"
                                description="Chọn một năng lực để xem bằng chứng qua từng buổi."
                                action={
                                    <Select value={selected?.competencyKey ?? ''} onValueChange={setCompetencyKey}>
                                        <SelectTrigger className="w-full sm:w-64" aria-label="Chọn năng lực"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {data.competencySeries.map((item) => <SelectItem key={item.competencyKey} value={item.competencyKey}>{item.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                }
                            >
                                {selected && <TrendChart points={selected.points.map((point) => ({ id: point.interviewId, score: point.score, date: point.date }))} />}
                            </ChartCard>
                        )}
                    </div>
                    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(69,56,120,.04)]">
                        <div className="flex items-start gap-3">
                            <CircleAlert className="size-6 shrink-0 text-rose-500" />
                            <div>
                                <h2 className="text-lg font-extrabold">Điểm yếu lặp lại</h2>
                                <p className="mt-1 text-sm leading-6 text-slate-500">Chỉ hiển thị khoảng trống có bằng chứng trong ít nhất hai buổi tương thích.</p>
                            </div>
                        </div>
                        {data.recurringWeaknesses.length === 0 ? (
                            <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">Chưa có điểm yếu nào lặp lại đủ điều kiện kết luận.</p>
                        ) : (
                            <div className="mt-5 space-y-4">
                                {data.recurringWeaknesses.map((weakness) => (
                                    <article key={weakness.competencyKey + weakness.subarea} className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                                        <p className="font-extrabold text-slate-950">{weakness.subarea}</p>
                                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-rose-600">Lặp lại {weakness.occurrences.length} lần</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">{weakness.occurrences.at(-1)?.observation}</p>
                                        <Button asChild variant="link" className="mt-2 h-auto p-0 font-bold"><Link href={'/interviews/' + weakness.occurrences.at(-1)?.interviewId + '/report'}>Xem bằng chứng gần nhất</Link></Button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </main>
    );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string | number }) {
    return <article className="rounded-2xl border border-slate-200 bg-white p-5"><Icon className="text-primary size-6" /><p className="mt-4 text-2xl font-extrabold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></article>;
}

function ChartCard({ title, description, action, children }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(69,56,120,.04)]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-lg font-extrabold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>{action}</div><div className="mt-5">{children}</div></section>;
}

function TrendChart({ points }: { points: Array<{ id: string; score: number; date: string | null }> }) {
    const width = 760;
    const height = 250;
    const pad = 36;
    const coords = points.map((point, index) => ({
        ...point,
        x: points.length === 1 ? width / 2 : pad + index * ((width - pad * 2) / (points.length - 1)),
        y: height - pad - (Math.max(0, Math.min(10, point.score)) / 10) * (height - pad * 2),
    }));
    const line = coords.map((point) => point.x + ',' + point.y).join(' ');
    return <div><div className="overflow-x-auto"><svg viewBox={'0 0 ' + width + ' ' + height} className="min-w-[620px]" role="img" aria-label="Biểu đồ xu hướng điểm từ 0 đến 10">
        {[0, 2.5, 5, 7.5, 10].map((tick) => { const y = height - pad - tick / 10 * (height - pad * 2); return <g key={tick}><line x1={pad} x2={width-pad} y1={y} y2={y} stroke="#e2e8f0" /><text x={4} y={y+4} fontSize="11" fill="#64748b">{tick}</text></g>; })}
        <polyline points={line} fill="none" stroke="#7047eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point) => <g key={point.id}><circle cx={point.x} cy={point.y} r="7" fill="white" stroke="#7047eb" strokeWidth="4"><title>{point.score.toFixed(1) + '/10 · ' + formatDate(point.date)}</title></circle></g>)}
    </svg></div><ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{points.map((point, index) => <li key={point.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"><span>Buổi {index + 1} · {formatDate(point.date)}</span><strong>{point.score.toFixed(1)}/10</strong></li>)}</ol></div>;
}

function ProgressSkeleton() { return <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8"><div className="h-10 w-72 animate-pulse rounded bg-slate-200" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />)}</div><div className="mt-6 h-96 animate-pulse rounded-2xl bg-slate-100" /></main>; }
function StatePanel({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) { return <main className="mx-auto max-w-xl p-8 text-center"><CircleAlert className="mx-auto size-10 text-rose-500" /><h1 className="mt-4 text-xl font-extrabold">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><Button className="mt-5" onClick={onRetry}>Thử lại</Button></main>; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value)) : '—'; }
function labelType(value: string) { return ({ HR: 'Nhân sự', BEHAVIORAL: 'Hành vi', TECHNICAL: 'Kỹ thuật', CODING: 'Lập trình', SYSTEM_DESIGN: 'Thiết kế hệ thống', FULL: 'Đầy đủ' } as Record<string,string>)[value] ?? value; }