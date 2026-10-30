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
    Clock3,
    FileText,
    History,
    MoreHorizontal,
    Plus,
    Search,
    SlidersHorizontal,
    Trash2,
    X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
    IN_PROGRESS: 'bg-violet-50 text-violet-700',
    COMPLETED: 'bg-emerald-50 text-emerald-700',
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
            limit: 9,
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

    function resetFilters() {
        setSearch('');
        setStatus('ALL');
        setLevel('ALL');
        setInterviewType('ALL');
        setSort('RECENT');
        setPage(1);
    }

    return (
        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-primary text-xs font-extrabold tracking-[.18em] uppercase">
                        Lịch sử luyện tập
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                        Phỏng vấn của bạn
                    </h1>
                    <p className="mt-2 max-w-2xl text-slate-500">
                        Tiếp tục phiên còn dang dở, xem lại câu trả lời và theo
                        dõi kết quả đã được đánh giá.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        asChild
                        variant="outline"
                        className="h-11 font-bold"
                    >
                        <Link href="/interviews/progress">
                            <BarChart3 className="size-4" />
                            Xem tiến bộ
                        </Link>
                    </Button>
                    <Button asChild className="h-11 px-5 font-bold">
                        <Link href="/interviews/new">
                            <Plus className="size-4" />
                            Tạo phỏng vấn
                        </Link>
                    </Button>
                </div>
            </header>

            <section
                aria-label="Bộ lọc lịch sử phỏng vấn"
                className="mt-7 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(69,56,120,.04)]"
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
                            className="h-11 pl-10"
                        />
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
                <div className="hidden gap-3 sm:grid xl:grid-cols-[minmax(280px,1fr)_repeat(4,minmax(150px,auto))]">
                    <div className="relative">
                        <Search
                            className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
                            aria-hidden="true"
                        />
                        <Input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm vai trò, CV, JD hoặc công ty..."
                            aria-label="Tìm kiếm lịch sử phỏng vấn"
                            className="h-11 pl-10"
                        />
                    </div>
                    <FilterSelect
                        label="Trạng thái"
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
                                Xem {query.data?.pagination.total ?? 0} kết quả
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {query.isPending ? (
                <HistorySkeleton />
            ) : query.isError ? (
                <StateCard
                    title="Không thể tải lịch sử phỏng vấn"
                    description="Dữ liệu của bạn vẫn an toàn. Hãy thử tải lại trang."
                    action={
                        <Button onClick={() => query.refetch()}>Thử lại</Button>
                    }
                />
            ) : query.data.items.length === 0 ? (
                <StateCard
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
                        className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
                        aria-label="Danh sách lịch sử phỏng vấn"
                    >
                        {query.data.items.map((item) => (
                            <HistoryCard key={item.id} item={item} />
                        ))}
                    </section>
                    <footer className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-slate-500">
                            Hiển thị {query.data.items.length} trong{' '}
                            {query.data.pagination.total} buổi phỏng vấn
                        </p>
                        {query.data.pagination.totalPages > 1 && (
                            <div
                                className="flex items-center gap-2"
                                aria-label="Phân trang"
                            >
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() =>
                                        setPage((value) => value - 1)
                                    }
                                >
                                    Trước
                                </Button>
                                <span className="px-2 text-sm font-bold tabular-nums">
                                    {page}/{query.data.pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        page >= query.data.pagination.totalPages
                                    }
                                    onClick={() =>
                                        setPage((value) => value + 1)
                                    }
                                >
                                    Sau
                                </Button>
                            </div>
                        )}
                    </footer>
                </>
            )}
        </main>
    );
}

function HistoryCard({ item }: { item: InterviewHistoryItem }) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const remove = useDeleteInterview();
    const action = primaryAction(item);
    const company = item.jobDescription.company
        ? ' tại ' + item.jobDescription.company
        : '';
    return (
        <>
            <article className="flex min-h-72 min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_36px_rgba(52,41,94,.05)] sm:p-5">
                <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
                        <BriefcaseBusiness
                            className="size-5"
                            strokeWidth={2.2}
                        />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-base leading-6 font-extrabold break-words text-slate-950 sm:text-lg">
                            {item.targetRole}
                        </h2>
                        <p className="mt-0.5 truncate text-sm text-slate-500">
                            {item.targetLevel ?? 'Chưa xác định'} ·{' '}
                            {interviewTypeLabel(item.interviewType)}
                        </p>
                        <span
                            className={
                                'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold sm:hidden ' +
                                statusClasses[item.status]
                            }
                        >
                            {statusLabels[item.status]}
                        </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <span
                            className={
                                'hidden rounded-full px-2.5 py-1 text-xs font-bold sm:inline-flex ' +
                                statusClasses[item.status]
                            }
                        >
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
                <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 min-[360px]:grid-cols-2 sm:mt-5">
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
                        icon={
                            item.evaluation?.status === 'COMPLETED'
                                ? CheckCircle2
                                : Clock3
                        }
                    />
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                    {item.jobDescription.title + company}
                </p>
                <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-4 min-[360px]:flex-row min-[360px]:flex-wrap min-[360px]:items-center">
                    {item.session && (
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center font-bold min-[360px]:w-auto"
                        >
                            <Link
                                href={
                                    '/interviews/' +
                                    item.id +
                                    '/report#question-review'
                                }
                            >
                                <FileText className="size-4" />
                                Xem lại câu trả lời
                            </Link>
                        </Button>
                    )}

                    <Button
                        asChild
                        size="sm"
                        className="w-full justify-center font-bold min-[360px]:ml-auto min-[360px]:w-auto min-[360px]:min-w-32"
                    >
                        <Link href={action.href}>
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
        };
    if (item.status === 'READY')
        return { label: 'Bắt đầu', href: '/interviews/' + item.id };
    if (item.status === 'COMPLETED')
        return {
            label:
                item.evaluation?.status === 'COMPLETED'
                    ? 'Xem báo cáo'
                    : 'Xem đánh giá',
            href: '/interviews/' + item.id + '/report',
        };
    return { label: 'Xem chi tiết', href: '/interviews/' + item.id };
}

function evaluationLabel(item: InterviewHistoryItem) {
    if (!item.evaluation) return 'Chưa đánh giá';
    if (
        item.evaluation.status === 'COMPLETED' &&
        item.evaluation.overallScore !== null
    )
        return item.evaluation.overallScore.toFixed(1) + '/10';
    const labels = {
        PENDING: 'Đang chờ',
        PROCESSING: 'Đang chấm',
        COMPLETED: 'Thiếu bằng chứng',
        FAILED: 'Đánh giá lỗi',
    };
    return labels[item.evaluation.status];
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
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-11 min-w-0 bg-white" aria-label={label}>
                <SelectValue />
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

function Metric({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: typeof CalendarDays;
}) {
    return (
        <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <Icon className="size-3.5" />
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-extrabold text-slate-800">
                {value}
            </p>
        </div>
    );
}

function HistorySkeleton() {
    return (
        <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
                <div
                    key={index}
                    className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
            ))}
        </div>
    );
}

function StateCard({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action: React.ReactNode;
}) {
    return (
        <section className="mt-8 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-10 text-center">
            <History className="text-primary mx-auto size-9" />
            <h2 className="mt-4 text-lg font-extrabold">{title}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                {description}
            </p>
            <div className="mt-5">{action}</div>
        </section>
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
