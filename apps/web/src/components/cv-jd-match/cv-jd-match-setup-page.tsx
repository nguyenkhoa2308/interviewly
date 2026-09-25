'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
    BriefcaseBusiness,
    CheckCircle2,
    ArrowDown,
    ChevronRight,
    Clock3,
    FileText,
    RefreshCw,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { SearchableMatchSource } from '@/components/cv-jd-match/searchable-match-source';
import {
    useCreateCvJdMatch,
    useCvJdMatches,
    useMatchOptions,
} from '@/hooks/cv-jd-match/use-cv-jd-matches';
import { cn } from '@/lib/utils';
import type {
    CvJdMatchSummary,
    MatchOptions,
} from '@/types/cv-jd-match';

export function CvJdMatchSetupPage() {
    const router = useRouter();
    const params = useSearchParams();
    const options = useMatchOptions();
    const history = useCvJdMatches({ page: 1, limit: 5 });
    const create = useCreateCvJdMatch();
    const [cvId, setCvId] = useState('');
    const [jdId, setJdId] = useState('');

    const effectiveCvId =
        cvId ||
        options.data?.cvs.find(
            (item) => item.id === params.get('cvId') && item.eligible,
        )?.id ||
        options.data?.cvs.find((item) => item.isDefault && item.eligible)?.id ||
        '';
    const effectiveJdId =
        jdId ||
        options.data?.jobDescriptions.find(
            (item) =>
                item.id === params.get('jobDescriptionId') && item.eligible,
        )?.id ||
        '';
    const selectedCv = useMemo(
        () => options.data?.cvs.find((item) => item.id === effectiveCvId),
        [effectiveCvId, options.data],
    );
    const selectedJd = useMemo(
        () =>
            options.data?.jobDescriptions.find(
                (item) => item.id === effectiveJdId,
            ),
        [effectiveJdId, options.data],
    );

    const submit = async () => {
        if (!selectedCv?.eligible || !selectedJd?.eligible) return;
        try {
            const result = await create.mutateAsync({
                cvId: selectedCv.id,
                jobDescriptionId: selectedJd.id,
            });
            router.push(`/matching/${result.id}`);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể đối chiếu CV và JD.',
            );
        }
    };

    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <MatchingHero />

            {options.isPending ? (
                <SetupSkeleton />
            ) : options.isError ? (
                <OptionsError onRetry={() => options.refetch()} />
            ) : (
                <section className="relative mt-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <SourceSelector
                            step="1"
                            kind="cv"
                            value={effectiveCvId}
                            items={options.data?.cvs ?? []}
                            selected={selectedCv}
                            onChange={setCvId}
                        />
                        <SourceSelector
                            step="2"
                            kind="jd"
                            value={effectiveJdId}
                            items={options.data?.jobDescriptions ?? []}
                            selected={selectedJd}
                            onChange={setJdId}
                        />
                    </div>

                    <div
                        aria-hidden="true"
                        className="relative mx-auto hidden h-16 w-full lg:block"
                    >
                        <svg
                            className="absolute inset-0 size-full overflow-visible text-violet-200"
                            viewBox="0 0 100 64"
                            preserveAspectRatio="none"
                        >
                            <path
                                d="M25 0 V8 C25 19 31 23 40 23 H44 C48 23 50 27 50 36"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                            />
                            <path
                                d="M75 0 V8 C75 19 69 23 60 23 H56 C52 23 50 27 50 36"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>
                        <ArrowDown className="text-primary absolute top-[30px] left-1/2 size-5 -translate-x-1/2" strokeWidth={2.75} />
                    </div>

                    <div className="relative z-10 mt-5 flex flex-col items-center text-center lg:-mt-3">
                        <Button
                            className="h-12 min-w-64 rounded-lg px-6 text-[15px] font-extrabold shadow-[0_10px_25px_rgba(109,60,220,0.18)] active:scale-[0.98]"
                            disabled={
                                !selectedCv?.eligible ||
                                !selectedJd?.eligible ||
                                create.isPending
                            }
                            onClick={submit}
                        >
                            {create.isPending ? (
                                <RefreshCw className="size-4 animate-spin" />
                            ) : (
                                <Sparkles className="size-4" />
                            )}
                            {create.isPending
                                ? 'Đang đối chiếu...'
                                : 'Đối chiếu CV với JD'}
                        </Button>
                        <p className="mt-2 text-sm font-medium text-slate-500">
                            AI sẽ đánh giá mức độ phù hợp dựa trên bằng chứng
                            trong CV và yêu cầu của JD. Điểm phù hợp không phải xác suất được tuyển.
                        </p>
                    </div>
                </section>
            )}

            <RecentMatches query={history} />
        </main>
    );
}

function MatchingHero() {
    return (
        <header className="relative isolate min-h-44 overflow-hidden py-4 sm:min-h-48 lg:min-h-52">
            <div className="relative z-10 flex min-h-36 max-w-md flex-col items-start justify-center sm:min-h-40 md:max-w-[42%] lg:max-w-[44%] 2xl:max-w-lg">
                <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
                    Định hướng ứng tuyển
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                    Đối chiếu CV với JD
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-6 font-medium text-slate-500 sm:text-[15px]">
                    So sánh hồ sơ với vị trí mục tiêu để biết mức độ phù hợp và
                    chuẩn bị đúng trọng tâm hơn.
                </p>
            </div>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-4 left-[52%] -z-10 hidden md:block lg:right-6 lg:left-[56%] 2xl:right-10 2xl:left-[58%]"
            >
                <Image
                    src="/images/matching/matching-illustration.png"
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1280px) 44vw, (min-width: 1024px) 50vw, 58vw"
                    className="object-contain object-right opacity-[0.6] 2xl:opacity-70"
                />
            </div>
        </header>
    );
}

type CvOption = MatchOptions['cvs'][number];
type JdOption = MatchOptions['jobDescriptions'][number];
type SourceSelectorProps =
    | {
          step: string;
          kind: 'cv';
          value: string;
          items: CvOption[];
          selected?: CvOption;
          onChange: (value: string) => void;
      }
    | {
          step: string;
          kind: 'jd';
          value: string;
          items: JdOption[];
          selected?: JdOption;
          onChange: (value: string) => void;
      };

function SourceSelector(props: SourceSelectorProps) {
    const isCv = props.kind === 'cv';
    const title = isCv ? 'Chọn CV của bạn' : 'Chọn mô tả công việc';
    const description = isCv
        ? 'Chọn CV để đối chiếu với vị trí mục tiêu.'
        : 'Chọn JD bạn muốn đánh giá mức độ phù hợp.';
    const manageHref = isCv ? '/cv' : '/job-descriptions';
    const analysisHref = props.selected
        ? isCv
            ? `/cv/${props.selected.id}/analysis`
            : `/job-descriptions/${props.selected.id}/analysis`
        : manageHref;

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(43,35,76,0.05)] shadow-[0_8px_24px_rgba(44,37,75,0.04)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-black">
                        {props.step}
                    </span>
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-950">
                            {title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {description}
                        </p>
                    </div>
                </div>
                <Link
                    href={manageHref}
                    className="text-primary hidden shrink-0 items-center gap-1 text-sm font-bold sm:flex"
                >
                    Quản lý {isCv ? 'CV' : 'JD'}
                    <ChevronRight className="size-4" />
                </Link>
            </div>

            <SearchableMatchSource
                kind={props.kind}
                title={title}
                value={props.value}
                items={props.items}
                selected={props.selected}
                onChange={props.onChange}
            />

            <div
                className={cn(
                    'mt-3 flex min-h-[64px] items-center justify-between gap-3 rounded-xl px-4 py-3',
                    props.selected?.eligible
                        ? 'bg-violet-50/70'
                        : 'bg-amber-50/80',
                )}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-full',
                            props.selected?.eligible
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-amber-100 text-amber-700',
                        )}
                    >
                        {props.selected?.eligible ? (
                            <CheckCircle2 className="size-5" />
                        ) : (
                            <Clock3 className="size-5" />
                        )}
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">
                            {props.selected?.eligible
                                ? `${isCv ? 'CV' : 'JD'} đã được phân tích`
                                : props.selected?.reason ||
                                  `Chưa chọn ${isCv ? 'CV' : 'JD'}`}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                            {props.selected?.eligible
                                ? isCv
                                    ? 'AI đã nhận diện kỹ năng, kinh nghiệm và thông tin chính.'
                                    : 'AI đã nhận diện vai trò, yêu cầu và trọng tâm phỏng vấn.'
                                : 'Cần hoàn tất phân tích trước khi đối chiếu.'}
                        </p>
                    </div>
                </div>
                {props.selected && (
                    <Link
                        href={analysisHref}
                        className="text-primary hidden shrink-0 items-center gap-1 text-xs font-bold sm:flex"
                    >
                        {props.selected.eligible ? 'Xem phân tích' : 'Phân tích ngay'}
                        <ChevronRight className="size-4" />
                    </Link>
                )}
            </div>
        </article>
    );
}

function RecentMatches({
    query,
}: {
    query: ReturnType<typeof useCvJdMatches>;
}) {
    return (
        <section className="mt-8 border-t border-violet-100 pt-6">
            <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-primary flex size-9 items-center justify-center rounded-full border border-violet-200">
                        <Clock3 className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-extrabold text-slate-950">
                            Đối chiếu gần đây
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Các lần đối chiếu CV và JD gần nhất của bạn.
                        </p>
                    </div>
                </div>
            </div>

            {query.isPending ? (
                <div className="h-52 animate-pulse rounded-2xl bg-slate-100" />
            ) : query.isError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                    <p className="text-sm font-bold text-red-700">
                        Không thể tải lịch sử đối chiếu.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-3"
                        onClick={() => query.refetch()}
                    >
                        Thử lại
                    </Button>
                </div>
            ) : query.data?.items.length ? (
                <>
                    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_32px_rgba(43,35,76,0.05)] md:block">
                        <table className="w-full table-fixed text-left">
                            <thead className="border-b border-violet-100 bg-violet-50/70 text-xs font-extrabold tracking-wide text-slate-500">
                                <tr>
                                    <th className="w-[22%] px-4 py-3">CV</th>
                                    <th className="w-[25%] px-4 py-3">Mô tả công việc</th>
                                    <th className="w-[13%] px-4 py-3">Điểm</th>
                                    <th className="w-[15%] px-4 py-3">Trạng thái</th>
                                    <th className="w-[15%] px-4 py-3">Thời gian</th>
                                    <th className="w-[10%] px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {query.data.items.map((item) => (
                                    <HistoryRow key={item.id} item={item} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="space-y-3 md:hidden">
                        {query.data.items.map((item) => (
                            <HistoryCard key={item.id} item={item} />
                        ))}
                    </div>
                </>
            ) : (
                <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-8 text-center">
                    <p className="font-extrabold text-slate-900">
                        Chưa có lần đối chiếu nào
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        Chọn CV và JD phía trên để tạo kết quả đầu tiên.
                    </p>
                </div>
            )}
        </section>
    );
}

function HistoryRow({ item }: { item: CvJdMatchSummary }) {
    return (
        <tr className="group text-sm text-slate-600 transition-colors hover:bg-violet-50/35">
            <td className="px-5 py-4"><CellTitle icon={FileText} title={item.cvNameSnapshot} subtitle={`Bản ${item.cvVersionNumber}`} /></td>
            <td className="px-5 py-4"><CellTitle icon={BriefcaseBusiness} title={item.jdTitleSnapshot} subtitle={item.jdCompanySnapshot || 'Chưa có công ty'} /></td>
            <td className="px-5 py-4"><Score value={item.status === 'COMPLETED' ? item.matchScore : null} /></td>
            <td className="px-5 py-4"><Status status={item.status} /></td>
            <td className="px-5 py-4 text-xs font-semibold leading-5 text-slate-500">{formatDateTime(item.createdAt)}</td>
            <td className="px-5 py-4 text-right">{item.status === 'COMPLETED' ? <Link href={`/matching/${item.id}`} className="text-primary inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg border border-violet-200 bg-white px-3 font-bold transition hover:bg-violet-50">Xem kết quả<ChevronRight className="size-4"/></Link> : <span className="text-xs text-slate-400">Không khả dụng</span>}</td>
        </tr>
    );
}

function HistoryCard({ item }: { item: CvJdMatchSummary }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-extrabold text-slate-900">{item.cvNameSnapshot}</p><p className="mt-1 truncate text-sm text-slate-500">{item.jdTitleSnapshot}</p></div><Score value={item.status === 'COMPLETED' ? item.matchScore : null}/></div>
            <div className="mt-4 flex items-center justify-between gap-3"><div><Status status={item.status}/><p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p></div>{item.status === 'COMPLETED' && <Link href={`/matching/${item.id}`} className="text-primary inline-flex items-center gap-1 text-sm font-bold">Xem kết quả<ChevronRight className="size-4"/></Link>}</div>
        </article>
    );
}

function CellTitle({ icon: Icon, title, subtitle }: { icon: typeof FileText; title: string; subtitle: string }) { return <div className="flex min-w-0 items-center gap-3"><span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg"><Icon className="size-4"/></span><div className="min-w-0"><p className="truncate font-bold text-slate-900">{title}</p><p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p></div></div>; }
function Score({ value }: { value: number | null }) {
    if (value === null) {
        return (
            <span className="inline-flex size-12 items-center justify-center text-sm font-bold text-slate-400">
                —
            </span>
        );
    }

    const score = Math.max(0, Math.min(100, Math.round(value)));
    const tone =
        score < 50
            ? { color: '#ef4444', track: '#fee2e2', text: 'text-red-600' }
            : score < 75
              ? {
                    color: '#f59e0b',
                    track: '#fef3c7',
                    text: 'text-amber-600',
                }
              : {
                    color: '#10b981',
                    track: '#d1fae5',
                    text: 'text-emerald-600',
                };

    return (
        <span
            role="img"
            aria-label={`Điểm phù hợp ${score} phần trăm`}
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full p-[4px]"
            style={{
                background: `conic-gradient(${tone.color} ${score}%, ${tone.track} ${score}% 100%)`,
            }}
        >
            <span
                className={cn(
                    'flex size-full items-center justify-center rounded-full bg-white text-xs font-black tabular-nums',
                    tone.text,
                )}
            >
                {score}%
            </span>
        </span>
    );
}
function Status({ status }: { status: CvJdMatchSummary['status'] }) { const config = status === 'COMPLETED' ? ['Hoàn tất', 'bg-emerald-50 text-emerald-700'] : status === 'PROCESSING' ? ['Đang xử lý', 'bg-violet-50 text-violet-700'] : ['Thất bại', 'bg-red-50 text-red-700']; return <span className={cn('inline-flex rounded-md px-2.5 py-1 text-xs font-bold', config[1])}>{config[0]}</span>; }
function SetupSkeleton() { return <div className="mt-6 grid gap-4 lg:grid-cols-2"><div className="h-64 animate-pulse rounded-2xl bg-slate-100"/><div className="h-64 animate-pulse rounded-2xl bg-slate-100"/></div>; }
function OptionsError({ onRetry }: { onRetry: () => void }) { return <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-6"><p className="font-bold text-red-700">Không thể tải danh sách CV và JD.</p><Button variant="outline" className="mt-3" onClick={onRetry}>Thử lại</Button></div>; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }