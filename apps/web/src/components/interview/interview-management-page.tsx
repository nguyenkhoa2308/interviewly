'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    BarChart3,
    BriefcaseBusiness,
    CalendarDays,
    Check,
    CheckCircle2,
    CircleDashed,
    CirclePlay,
    ClipboardList,
    Clock3,
    FilePenLine,
    Filter,
    History,
    Info,
    Layers3,
    MoreHorizontal,
    Plus,
    Search,
    Star,
    SlidersHorizontal,
    Trash2,
    X,
    XCircle,
} from 'lucide-react';

import {
    DataState,
    EmptyDataState,
    type DataStateBenefit,
    type DataStateVariant,
} from '@/components/common/data-state';
import { AppPageHeader } from '@/components/layout/app-page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ListPagination } from '@/components/ui/list-pagination';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useDeleteInterview,
    useInterviewHistory,
} from '@/hooks/interview/use-interviews';
import type {
    InterviewHistoryItem,
    InterviewHistorySort,
    InterviewStatus,
    InterviewType,
} from '@/types/interview';

const statusLabels: Record<InterviewStatus, string> = {
    DRAFT: 'Bản nháp',
    PLANNING: 'Đang lập kế hoạch',
    READY: 'Sẵn sàng',
    IN_PROGRESS: 'Đang phỏng vấn',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã hủy',
};
const statusClasses: Record<InterviewStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    PLANNING: 'bg-amber-50 text-amber-700',
    READY: 'bg-sky-50 text-sky-700',
    IN_PROGRESS: 'bg-primary/10 text-primary',
    COMPLETED:
        'bg-green-50 text-green-600 shadow-[inset_0_0_0_1px_rgba(34,197,94,.08)]',
    CANCELLED: 'bg-rose-50 text-rose-700',
};
const levelLabels: Record<string, string> = {
    INTERN: 'Thực tập sinh',
    FRESHER: 'Mới tốt nghiệp',
    JUNIOR: 'Junior',
    MIDDLE: 'Middle',
    SENIOR: 'Senior',
    LEAD: 'Trưởng nhóm',
};
const levels = Object.keys(levelLabels);
const types: InterviewType[] = [
    'HR',
    'BEHAVIORAL',
    'TECHNICAL',
    'CODING',
    'SYSTEM_DESIGN',
    'FULL',
];
const statusOptions: string[][] = [
    ['ALL', 'Tất cả trạng thái'],
    ...Object.entries(statusLabels),
];
const levelOptions: string[][] = [
    ['ALL', 'Tất cả cấp độ'],
    ...levels.map((value) => [value, levelLabels[value] ?? value]),
];
const typeOptions: string[][] = [
    ['ALL', 'Tất cả loại'],
    ...types.map((value) => [value, interviewTypeLabel(value)]),
];
const sortOptions: string[][] = [
    ['RECENT', 'Gần đây nhất'],
    ['OLDEST', 'Cũ nhất'],
    ['HIGHEST_SCORE', 'Điểm cao nhất'],
    ['LOWEST_SCORE', 'Điểm thấp nhất'],
];

const PAGE_SIZE = 6;

export function InterviewManagementPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [status, setStatus] = useState<'ALL' | InterviewStatus>('ALL');
    const [level, setLevel] = useState('ALL');
    const [interviewType, setInterviewType] = useState('ALL');
    const [sort, setSort] = useState<InterviewHistorySort>('RECENT');
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const filters = useMemo(
        () => ({
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch || undefined,
            status: status === 'ALL' ? undefined : status,
            level: level === 'ALL' ? undefined : level,
            interviewType:
                interviewType === 'ALL'
                    ? undefined
                    : (interviewType as InterviewType),
            sort,
        }),
        [page, debouncedSearch, status, level, interviewType, sort],
    );
    const query = useInterviewHistory(filters);
    const hasFilters =
        Boolean(search) ||
        status !== 'ALL' ||
        level !== 'ALL' ||
        interviewType !== 'ALL' ||
        sort !== 'RECENT';
    const activeFilterCount =
        Number(status !== 'ALL') +
        Number(level !== 'ALL') +
        Number(interviewType !== 'ALL') +
        Number(sort !== 'RECENT');
    const items = query.data?.items ?? [];
    const pagination = query.data?.pagination;
    function resetFilters() {
        setSearch('');
        setStatus('ALL');
        setLevel('ALL');
        setInterviewType('ALL');
        setSort('RECENT');
        setPage(1);
    }

    return (
        <main className="relative isolate mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1600px] px-5 pt-7 pb-24 sm:px-7 sm:pt-8 sm:pb-28 xl:flex xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:flex-col xl:overflow-hidden xl:px-6 xl:pt-7 xl:pb-6">
            <svg
                className="text-primary pointer-events-none absolute right-0 bottom-0 -z-10 h-40 w-[55%]"
                viewBox="0 0 1000 160"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <path
                    d="M0 160c87-19 130-66 242-69 122-4 181 42 294 36 83-5 112-70 221-78 104-8 137 52 179 68 20 8 41 11 64 13v30H0Z"
                    fill="currentColor"
                    opacity="0.055"
                />
            </svg>
            <AppPageHeader
                eyebrow="Lịch sử luyện tập"
                title="Phỏng vấn của bạn"
                description="Tiếp tục phiên còn dang dở, xem lại câu trả lời và theo dõi kết quả đã được đánh giá."
                actions={
                    <>
                        <Button
                            asChild
                            variant="outline"
                            className="h-12 !rounded-lg px-5 text-sm font-extrabold"
                        >
                            <Link href="/interviews/progress">
                                <BarChart3 className="size-5" />
                                Xem tiến bộ
                            </Link>
                        </Button>
                        <Button
                            asChild
                            className="h-12 !rounded-lg px-5 text-sm font-bold shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_18%,transparent)]"
                        >
                            <Link href="/interviews/new">
                                <Plus className="size-4" strokeWidth={3} />
                                Tạo phỏng vấn
                            </Link>
                        </Button>
                    </>
                }
            />

            <section
                aria-label="Bộ lọc lịch sử phỏng vấn"
                className="border-primary/15 mt-6 shrink-0 rounded-2xl border bg-white p-2 shadow-[0_8px_24px_rgba(73,54,128,.045)] xl:mt-5"
            >
                <div className="flex gap-2 sm:hidden">
                    <div className="relative min-w-0 flex-1">
                        <Search
                            className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                        />
                        <Input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm vai trò, CV, JD..."
                            aria-label="Tìm kiếm lịch sử phỏng vấn"
                            className="h-11 pr-10 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        {search && (
                            <SearchClearButton
                                onClear={() => {
                                    setSearch('');
                                    setPage(1);
                                }}
                            />
                        )}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="relative size-11 shrink-0 px-0"
                        aria-label={`Mở bộ lọc${activeFilterCount ? `, đang áp dụng ${activeFilterCount} bộ lọc` : ''}`}
                        onClick={() => setMobileFiltersOpen(true)}
                    >
                        <SlidersHorizontal className="size-4.5" />
                        {activeFilterCount > 0 && (
                            <span className="bg-primary absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full text-[10px] font-extrabold text-white ring-2 ring-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                </div>
                {activeFilterCount > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
                        {status !== 'ALL' && (
                            <FilterChip
                                label={statusLabels[status]}
                                onRemove={() => {
                                    setStatus('ALL');
                                    setPage(1);
                                }}
                            />
                        )}
                        {level !== 'ALL' && (
                            <FilterChip
                                label={levelLabels[level] ?? level}
                                onRemove={() => {
                                    setLevel('ALL');
                                    setPage(1);
                                }}
                            />
                        )}
                        {interviewType !== 'ALL' && (
                            <FilterChip
                                label={interviewTypeLabel(
                                    interviewType as InterviewType,
                                )}
                                onRemove={() => {
                                    setInterviewType('ALL');
                                    setPage(1);
                                }}
                            />
                        )}
                        {sort !== 'RECENT' && (
                            <FilterChip
                                label={sortLabel(sort)}
                                onRemove={() => {
                                    setSort('RECENT');
                                    setPage(1);
                                }}
                            />
                        )}
                    </div>
                )}
                <div className="hidden gap-2.5 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(320px,1fr)_190px_180px_170px_180px]">
                    <div className="relative sm:col-span-2 lg:col-span-2 xl:col-span-1">
                        <Search
                            className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-500"
                            aria-hidden="true"
                        />
                        <Input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm vai trò, CV, JD hoặc công ty..."
                            aria-label="Tìm kiếm lịch sử phỏng vấn"
                            className="border-primary/15 h-12 rounded-xl bg-white pr-11 pl-11 text-sm font-bold text-slate-900 shadow-none transition-colors placeholder:text-slate-500 hover:border-slate-300 focus-visible:bg-white [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        {search && (
                            <SearchClearButton
                                onClear={() => {
                                    setSearch('');
                                    setPage(1);
                                }}
                            />
                        )}
                    </div>
                    <FilterSelect
                        label="Trạng thái"
                        icon={Filter}
                        value={status}
                        onChange={(value) => {
                            setStatus(value as typeof status);
                            setPage(1);
                        }}
                        options={[
                            ['ALL', 'Tất cả trạng thái'],
                            ...Object.entries(statusLabels),
                        ]}
                    />
                    <FilterSelect
                        label="Cấp độ"
                        icon={BarChart3}
                        value={level}
                        onChange={(value) => {
                            setLevel(value);
                            setPage(1);
                        }}
                        options={[
                            ['ALL', 'Tất cả cấp độ'],
                            ...levels.map((value) => [
                                value,
                                levelLabels[value] ?? value,
                            ]),
                        ]}
                    />
                    <FilterSelect
                        label="Loại phỏng vấn"
                        icon={Layers3}
                        value={interviewType}
                        onChange={(value) => {
                            setInterviewType(value);
                            setPage(1);
                        }}
                        options={[
                            ['ALL', 'Tất cả loại'],
                            ...types.map((value) => [
                                value,
                                interviewTypeLabel(value),
                            ]),
                        ]}
                    />
                    <FilterSelect
                        label="Sắp xếp"
                        icon={CalendarDays}
                        value={sort}
                        onChange={(value) => {
                            setSort(value as InterviewHistorySort);
                            setPage(1);
                        }}
                        options={[
                            ['RECENT', 'Gần đây nhất'],
                            ['OLDEST', 'Cũ nhất'],
                            ['HIGHEST_SCORE', 'Điểm cao nhất'],
                            ['LOWEST_SCORE', 'Điểm thấp nhất'],
                        ]}
                    />
                </div>
            </section>

            <Dialog
                open={mobileFiltersOpen}
                onOpenChange={setMobileFiltersOpen}
            >
                <DialogContent
                    mobileVariant="bottom-sheet"
                    mobileContentPosition="start"
                    className="p-0 sm:hidden"
                >
                    <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200" />
                    <DialogHeader className="border-b border-slate-100 px-5 pt-5 pb-4">
                        <DialogTitle className="text-center text-xl">
                            Bộ lọc
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Lọc danh sách phỏng vấn theo trạng thái, cấp độ,
                            loại và thứ tự.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 overflow-y-auto bg-slate-50/80 px-4 py-5">
                        <MobileFilterField label="Trạng thái">
                            <MobileFilterOptions
                                label="Trạng thái"
                                value={status}
                                onChange={(value) => {
                                    setStatus(value as typeof status);
                                    setPage(1);
                                }}
                                options={statusOptions}
                            />
                        </MobileFilterField>
                        <MobileFilterField label="Cấp độ">
                            <MobileFilterOptions
                                label="Cấp độ"
                                value={level}
                                onChange={(value) => {
                                    setLevel(value);
                                    setPage(1);
                                }}
                                options={levelOptions}
                            />
                        </MobileFilterField>
                        <MobileFilterField label="Loại phỏng vấn">
                            <MobileFilterOptions
                                label="Loại phỏng vấn"
                                value={interviewType}
                                onChange={(value) => {
                                    setInterviewType(value);
                                    setPage(1);
                                }}
                                options={typeOptions}
                            />
                        </MobileFilterField>
                        <MobileFilterField label="Sắp xếp">
                            <MobileFilterOptions
                                label="Sắp xếp"
                                value={sort}
                                onChange={(value) => {
                                    setSort(value as InterviewHistorySort);
                                    setPage(1);
                                }}
                                options={sortOptions}
                            />
                        </MobileFilterField>
                    </div>
                    <DialogFooter className="grid grid-cols-2 border-t border-slate-100 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 font-bold"
                            disabled={activeFilterCount === 0}
                            onClick={resetFilters}
                        >
                            Xóa tất cả ({activeFilterCount})
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" className="h-11 font-bold">
                                Xem {pagination?.total ?? 0} kết quả
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {query.isPending ? (
                <HistorySkeleton />
            ) : query.isError ? (
                <StateCard
                    variant="error"
                    title="Không thể tải lịch sử phỏng vấn"
                    description="Dữ liệu của bạn vẫn an toàn. Hãy thử tải lại trang."
                    action={
                        <Button onClick={() => query.refetch()}>Thử lại</Button>
                    }
                />
            ) : query.data.items.length === 0 ? (
                <StateCard
                    variant={hasFilters ? 'no-results' : 'empty'}
                    illustrationSrc={
                        hasFilters
                            ? '/images/cvs/cv-no-results.png'
                            : '/images/interview/interview-empty-state.webp'
                    }
                    benefits={
                        hasFilters
                            ? undefined
                            : [
                                  {
                                      icon: CirclePlay,
                                      title: 'Luyện tập thực tế',
                                      description:
                                          'Phỏng vấn theo CV và vị trí mục tiêu',
                                  },
                                  {
                                      icon: BarChart3,
                                      title: 'Đánh giá bằng AI',
                                      description:
                                          'Nhận phản hồi dựa trên bằng chứng',
                                  },
                                  {
                                      icon: History,
                                      title: 'Theo dõi tiến bộ',
                                      description:
                                          'Xem lại câu trả lời và kết quả',
                                  },
                              ]
                    }
                    title={
                        hasFilters
                            ? 'Không tìm thấy buổi phỏng vấn phù hợp'
                            : 'Bạn chưa có buổi phỏng vấn nào'
                    }
                    description={
                        hasFilters
                            ? 'Thử thay đổi từ khóa hoặc đặt lại bộ lọc.'
                            : 'Tạo buổi phỏng vấn đầu tiên từ CV và mô tả công việc đã phân tích.'
                    }
                    action={
                        hasFilters ? (
                            <Button variant="outline" onClick={resetFilters}>
                                Đặt lại bộ lọc
                            </Button>
                        ) : (
                            <Button asChild>
                                <Link href="/interviews/new">
                                    Tạo phỏng vấn
                                </Link>
                            </Button>
                        )
                    }
                />
            ) : (
                <>
                    <section
                        className="mt-5 grid gap-3.5 md:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-3 xl:grid-rows-2"
                        aria-label="Danh sách lịch sử phỏng vấn"
                    >
                        {items.map((item) => (
                            <HistoryCard key={item.id} item={item} />
                        ))}
                    </section>
                    <ListPagination
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={pagination?.total ?? 0}
                        totalPages={pagination?.totalPages}
                        itemLabel="buổi phỏng vấn"
                        onPageChange={setPage}
                        className="pb-2 xl:mt-3 xl:pb-0"
                    />
                </>
            )}
        </main>
    );
}

function HistoryCard({ item }: { item: InterviewHistoryItem }) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const remove = useDeleteInterview();
    const action = primaryAction(item);
    const ActionIcon = action.icon;
    const company = item.jobDescription.company
        ? ' tại ' + item.jobDescription.company
        : '';
    return (
        <>
            <article className="group border-primary/15 hover:border-primary/30 flex min-h-[260px] min-w-0 flex-col rounded-2xl border bg-[linear-gradient(145deg,#fff_70%,#fdfcff_100%)] p-5 shadow-[0_10px_28px_rgba(75,53,145,.07)] transition-[border-color,box-shadow] duration-200 hover:shadow-[0_14px_34px_rgba(75,53,145,.10)] xl:grid xl:h-full xl:min-h-0 xl:grid-rows-[auto_auto_auto_auto] xl:content-between xl:p-4 2xl:p-5">
                <div className="flex items-start gap-3">
                    <span className="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center rounded-xl shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_7%,transparent)]">
                        <BriefcaseBusiness
                            className="size-5.5"
                            strokeWidth={2.25}
                        />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-base leading-5 font-extrabold tracking-[-0.01em] break-words text-slate-950">
                            {item.targetRole}
                        </h2>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">
                            {levelLabels[item.targetLevel ?? ''] ??
                                item.targetLevel ??
                                'Chưa xác định'}{' '}
                            · {interviewTypeLabel(item.interviewType)}
                        </p>
                        <span
                            className={
                                'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold sm:hidden ' +
                                statusClasses[item.status]
                            }
                        >
                            <InterviewStatusIcon status={item.status} />
                            {statusLabels[item.status]}
                        </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <span
                            className={
                                'hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold sm:inline-flex ' +
                                statusClasses[item.status]
                            }
                        >
                            <InterviewStatusIcon status={item.status} />
                            {statusLabels[item.status]}
                        </span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    aria-label={`Mở thao tác cho buổi phỏng vấn ${item.targetRole}`}
                                >
                                    <MoreHorizontal className="size-4.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="min-w-44"
                            >
                                <DropdownMenuItem
                                    className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                                    disabled={remove.isPending}
                                    onSelect={() => setConfirmOpen(true)}
                                >
                                    <Trash2 className="size-4" />
                                    Xóa buổi phỏng vấn
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-[linear-gradient(135deg,#f8f8fc_0%,#f5f3fb_100%)] p-3.5 min-[360px]:grid-cols-2 min-[360px]:divide-x min-[360px]:divide-[#ded9ee]">
                    <Metric
                        label="Thời điểm"
                        value={formatDate(
                            item.session?.completedAt ??
                                item.session?.startedAt ??
                                item.createdAt,
                        )}
                        icon={CalendarDays}
                    />
                    <Metric
                        label="Kết quả"
                        value={evaluationLabel(item)}
                        iconWithLabel
                        icon={ClipboardList}
                        valueClassName={
                            item.evaluation?.status === 'COMPLETED' &&
                            item.evaluation.overallScore !== null
                                ? undefined
                                : evaluationValueClass(item)
                        }
                        score={
                            item.evaluation?.status === 'COMPLETED' &&
                            item.evaluation.overallScore !== null
                        }
                        mutedBadge={
                            !item.evaluation ||
                            (item.evaluation.status === 'COMPLETED' &&
                                item.evaluation.overallScore === null)
                        }
                    />
                </div>
                <div className="mt-4 flex min-w-0 flex-wrap items-center justify-start gap-x-5 gap-y-2 text-[13px] font-bold text-[#596987]">
                    <p className="flex max-w-[65%] min-w-0 items-center gap-1.5 font-bold">
                        <Layers3
                            className="size-4 shrink-0 text-[#66769a]"
                            aria-hidden="true"
                            strokeWidth={2.5}
                        />
                        <span className="truncate">
                            {item.jobDescription.title + company}
                        </span>
                    </p>
                    <p className="flex shrink-0 items-center gap-1.5 border-l border-[#ded9ee] pl-5 text-[13px] font-bold text-[#596987]">
                        <Clock3
                            className="size-4 text-[#66769a]"
                            aria-hidden="true"
                            strokeWidth={2.5}
                        />
                        {item.durationMinutes} phút
                    </p>
                </div>
                <div className="mt-auto flex justify-end pt-4 xl:mt-0">
                    <Button
                        asChild
                        size="sm"
                        className="from-primary via-primary hover:from-primary/95 h-10 w-full justify-center gap-2 !rounded-lg bg-gradient-to-r to-[#8258ff] px-5 text-sm font-bold shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_24%,transparent)] hover:to-[#7650ec] min-[360px]:w-[62%]"
                    >
                        <Link href={action.href}>
                            <ActionIcon className="size-4" aria-hidden="true" />
                            {action.label}
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </div>
            </article>
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Xóa buổi phỏng vấn?"
                description={
                    'Buổi phỏng vấn cho vai trò “' +
                    item.targetRole +
                    '” sẽ bị xóa khỏi lịch sử.'
                }
                confirmLabel="Xóa phỏng vấn"
                destructive
                onConfirm={() => remove.mutate(item.id)}
            />
        </>
    );
}

function primaryAction(item: InterviewHistoryItem) {
    if (item.status === 'IN_PROGRESS')
        return {
            label: 'Tiếp tục',
            href: '/interviews/' + item.id + '/session',
            icon: CirclePlay,
        };
    if (item.status === 'READY')
        return {
            label: 'Bắt đầu',
            href: '/interviews/' + item.id,
            icon: CirclePlay,
        };
    if (item.status === 'COMPLETED')
        return {
            label:
                item.evaluation?.status === 'COMPLETED'
                    ? 'Xem báo cáo'
                    : 'Xem đánh giá',
            href: '/interviews/' + item.id + '/report',
            icon: BarChart3,
        };
    return {
        label: 'Xem chi tiết',
        href: '/interviews/' + item.id,
        icon: History,
    };
}

function evaluationLabel(item: InterviewHistoryItem) {
    if (!item.evaluation) return 'Chưa đánh giá';
    if (
        item.evaluation.status === 'COMPLETED' &&
        item.evaluation.overallScore !== null
    )
        return item.evaluation.overallScore.toFixed(1) + ' / 10';
    const labels = {
        PENDING: 'Đang chờ',
        PROCESSING: 'Đang chấm',
        COMPLETED: 'Thiếu bằng chứng',
        FAILED: 'Đánh giá lỗi',
    };
    return labels[item.evaluation.status];
}

function evaluationValueClass(item: InterviewHistoryItem) {
    if (!item.evaluation) return 'text-slate-600';
    if (item.evaluation.status === 'FAILED') return 'text-rose-600';
    if (item.evaluation.status !== 'COMPLETED') return 'text-amber-700';
    const score = item.evaluation.overallScore;
    if (score === null) return 'text-slate-600';
    if (score >= 7) return 'text-emerald-700';
    if (score >= 5) return 'text-amber-700';
    return 'text-rose-600';
}

function InterviewStatusIcon({ status }: { status: InterviewStatus }) {
    const Icon =
        status === 'COMPLETED'
            ? CheckCircle2
            : status === 'IN_PROGRESS'
              ? CirclePlay
              : status === 'DRAFT'
                ? FilePenLine
                : status === 'CANCELLED'
                  ? XCircle
                  : status === 'PLANNING'
                    ? CircleDashed
                    : CheckCircle2;
    return <Icon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />;
}

function FilterChip({
    label,
    onRemove,
}: {
    label: string;
    onRemove: () => void;
}) {
    return (
        <span className="border-primary/15 bg-primary/5 text-primary inline-flex min-h-8 items-center gap-1.5 rounded-lg border py-1 pr-1.5 pl-3 text-xs font-bold">
            {label}
            <button
                type="button"
                className="hover:bg-primary/10 focus-visible:ring-primary/30 grid size-6 place-items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`Bỏ bộ lọc ${label}`}
                onClick={onRemove}
            >
                <X className="size-3.5" aria-hidden="true" />
            </button>
        </span>
    );
}

function MobileFilterField({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(69,56,120,.04)]">
            <p className="mb-2 text-sm font-extrabold text-slate-900">
                {label}
            </p>
            {children}
        </div>
    );
}

function sortLabel(value: InterviewHistorySort) {
    return (
        sortOptions.find(([optionValue]) => optionValue === value)?.[1] ?? value
    );
}
function MobileFilterOptions({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[][];
}) {
    return (
        <div
            className="grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label={label}
        >
            {options.map(([optionValue, optionLabel]) => {
                const selected = optionValue === value;
                return (
                    <button
                        key={optionValue}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={
                            'focus-visible:ring-primary/30 flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none ' +
                            (selected
                                ? 'border-primary/30 bg-primary/7 text-primary'
                                : 'border-slate-200 bg-white text-slate-600 active:bg-slate-50')
                        }
                        onClick={() => onChange(optionValue)}
                    >
                        <span>{optionLabel}</span>
                        <span
                            className={
                                'grid size-5 shrink-0 place-items-center rounded-full border ' +
                                (selected
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-slate-300 text-transparent')
                            }
                            aria-hidden="true"
                        >
                            <Check className="size-3" strokeWidth={3} />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
function FilterSelect({
    label,
    icon: Icon,
    value,
    onChange,
    options,
}: {
    label: string;
    icon: typeof CalendarDays;
    value: string;
    onChange: (value: string) => void;
    options: string[][];
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger
                className="border-primary/15 h-12 min-w-0 rounded-xl bg-white px-4 text-sm font-bold text-slate-900 shadow-none transition-colors hover:border-slate-300 hover:bg-white [&>svg:last-child]:size-4 [&>svg:last-child]:text-slate-700"
                aria-label={label}
            >
                <span className="flex shrink-0 items-center gap-2 leading-none whitespace-nowrap">
                    <Icon
                        className="size-4.5 shrink-0 text-slate-500"
                        aria-hidden="true"
                    />
                    <SelectValue />
                </span>
            </SelectTrigger>
            <SelectContent>
                {options.map(([optionValue, optionLabel]) => (
                    <SelectItem key={optionValue} value={optionValue}>
                        {optionLabel}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function SearchClearButton({ onClear }: { onClear: () => void }) {
    return (
        <button
            type="button"
            className="hover:text-destructive focus-visible:ring-destructive/20 absolute top-1/2 right-2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Xóa nội dung tìm kiếm"
            onClick={onClear}
        >
            <X className="size-4" strokeWidth={3} aria-hidden="true" />
        </button>
    );
}

function Metric({
    label,
    value,
    icon: Icon,
    valueClassName,
    score = false,
    mutedBadge = false,
    iconWithLabel = false,
}: {
    label: string;
    value: string;
    icon: typeof CalendarDays;
    valueClassName?: string;
    score?: boolean;
    mutedBadge?: boolean;
    iconWithLabel?: boolean;
}) {
    return (
        <div className="min-w-0 min-[360px]:px-1 first:min-[360px]:pl-0 last:min-[360px]:pl-4">
            <div className="flex min-w-0 items-center gap-2.5">
                {!iconWithLabel && (
                    <Icon
                        className="size-4.5 shrink-0 text-[#667694]"
                        strokeWidth={2.1}
                        aria-hidden="true"
                    />
                )}
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs leading-4 font-bold text-[#667694]">
                        {iconWithLabel && (
                            <Icon
                                className="size-4 shrink-0 text-[#667694]"
                                strokeWidth={2.1}
                                aria-hidden="true"
                            />
                        )}
                        {label}
                    </p>
                    <p
                        className={
                            'mt-0.5 flex min-h-6 w-fit max-w-full items-center gap-1.5 truncate text-sm font-extrabold ' +
                            (score
                                ? 'rounded-lg bg-[#fff2c9] px-2.5 text-[#9a5a00] shadow-[inset_0_0_0_1px_rgba(245,158,11,.05)]'
                                : mutedBadge
                                  ? 'rounded-lg bg-[#ececf3] px-2.5 text-slate-800 shadow-[inset_0_0_0_1px_rgba(100,116,139,.04)]'
                                  : (valueClassName ?? 'text-slate-900'))
                        }
                    >
                        {score && (
                            <Star
                                className="size-4 fill-amber-400 text-amber-400"
                                aria-hidden="true"
                            />
                        )}
                        {mutedBadge && (
                            <Info
                                className="size-4 text-[#667085]"
                                aria-hidden="true"
                            />
                        )}
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}

function HistorySkeleton() {
    return (
        <div className="mt-5 grid gap-3.5 md:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-3 xl:grid-rows-2">
            {Array.from({ length: 6 }, (_, index) => (
                <div
                    key={index}
                    className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white xl:h-full xl:min-h-0"
                />
            ))}
        </div>
    );
}

function StateCard({
    variant,
    title,
    description,
    action,
    illustrationSrc,
    benefits,
}: {
    variant: DataStateVariant;
    title: string;
    description: string;
    action: React.ReactNode;
    illustrationSrc?: string;
    benefits?: readonly DataStateBenefit[];
}) {
    if (variant === 'empty') {
        return (
            <EmptyDataState
                title={title}
                description={description}
                action={action}
                illustrationSrc={illustrationSrc}
                benefits={benefits}
            />
        );
    }

    return (
        <DataState
            variant={variant}
            size="compact"
            title={title}
            description={description}
            action={action}
            illustrationSrc={illustrationSrc}
            benefits={benefits}
            className="mt-5 xl:min-h-0 xl:flex-1"
        />
    );
}

function interviewTypeLabel(value: InterviewType) {
    return (
        {
            HR: 'Nhân sự',
            BEHAVIORAL: 'Hành vi',
            TECHNICAL: 'Kỹ thuật',
            CODING: 'Lập trình',
            SYSTEM_DESIGN: 'Thiết kế hệ thống',
            FULL: 'Phỏng vấn đầy đủ',
        }[value] ?? value
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}
