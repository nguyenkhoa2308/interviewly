'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
    BrainCircuit,
    BriefcaseBusiness,
    LayoutGrid,
    List,
    Plus,
    Search,
    Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataState, EmptyDataState } from '@/components/common/data-state';
import { cn } from '@/lib/utils';
import { AppPageHeader } from '@/components/layout/app-page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { ListPagination } from '@/components/ui/list-pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useDeleteJobDescription,
    useJobDescriptions,
} from '@/hooks/job-description';
import type {
    JobDescriptionListItem,
    JobDescriptionListSort,
    JobDescriptionListStatus,
} from '@/types/job-description';
import { CreateJobDescriptionDialog } from './create-job-description-dialog';
import { JobDescriptionCard } from './job-description-card';
import { JobDescriptionListView } from './job-description-list-view';
import { JobDescriptionQuickViewDialog } from './job-description-quick-view-dialog';

const PAGE_SIZE = 6;
type ViewMode = 'GRID' | 'LIST';

export function JobDescriptionManagementPage() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<JobDescriptionListStatus>('ALL');
    const [sort, setSort] =
        useState<JobDescriptionListSort>('RECENTLY_UPDATED');
    const [viewMode, setViewMode] = useState<ViewMode>('GRID');
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] =
        useState<JobDescriptionListItem | null>(null);
    const [quickViewTarget, setQuickViewTarget] =
        useState<JobDescriptionListItem | null>(null);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
        }, 250);
        return () => window.clearTimeout(timeout);
    }, [search]);

    const query = useJobDescriptions({
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
        status,
        sort,
    });
    const remove = useDeleteJobDescription();
    const items = useMemo(() => query.data?.items ?? [], [query.data]);
    const pagination = query.data?.pagination;
    const activeStatusIndex = STATUS_FILTERS.findIndex(
        (filter) => filter.value === status,
    );
    const hasActiveFilters = Boolean(debouncedSearch) || status !== 'ALL';
    const isTrueEmpty =
        !query.isPending &&
        !query.isError &&
        !hasActiveFilters &&
        items.length === 0;

    const resetFilters = () => {
        setSearch('');
        setDebouncedSearch('');
        setStatus('ALL');
        setPage(1);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await remove.mutateAsync(deleteTarget.id);
            if (items.length === 1 && page > 1) setPage(page - 1);
            toast.success('Đã xóa mô tả công việc.');
        } catch (error) {
            toast.error('Không thể xóa JD', {
                description:
                    error instanceof Error
                        ? error.message
                        : 'Vui lòng thử lại.',
            });
        }
    };

    return (
        <main
            className={cn(
                'relative isolate mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1600px] flex-col px-4 pt-7 pb-5 sm:px-6 sm:pt-8 lg:px-8 xl:pt-7 xl:pb-4',
                isTrueEmpty &&
                    'xl:flex xl:h-[calc(100dvh-4rem)] xl:min-h-0 xl:flex-col xl:overflow-hidden',
            )}
        >
            <svg
                aria-hidden="true"
                viewBox="0 0 1000 150"
                preserveAspectRatio="none"
                className="pointer-events-none absolute right-0 bottom-0 -z-10 hidden h-28 w-[58%] lg:block"
            >
                <path
                    d="M0 150V112C92 110 148 62 242 65C337 68 366 112 475 107C580 102 624 29 734 25C824 22 845 77 923 79C955 80 979 72 1000 66V150Z"
                    className="fill-violet-100/60"
                />
            </svg>
            <AppPageHeader
                className="min-h-36 overflow-hidden py-3 sm:min-h-40 lg:items-center"
                contentClassName="flex min-h-32 max-w-md flex-col items-start justify-center sm:min-h-36 md:max-w-[42%] lg:max-w-[44%] 2xl:max-w-lg"
                eyebrow="Không gian nghề nghiệp"
                title="Mô tả công việc"
                description="Lưu các vị trí bạn quan tâm, khám phá yêu cầu tuyển dụng và chuẩn bị đúng trọng tâm cho buổi phỏng vấn."
                decoration={
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 right-6 left-[44%] -z-10 hidden md:block lg:right-10 lg:left-[46%] 2xl:right-40 2xl:left-[31%]"
                    >
                        <Image
                            src="/images/jds/job-description-opportunities.png"
                            alt=""
                            fill
                            priority
                            sizes="(min-width: 1280px) 44vw, (min-width: 1024px) 50vw, 58vw"
                            className="object-contain object-center opacity-75 2xl:opacity-85"
                        />
                    </div>
                }
                actions={
                    <Button
                        type="button"
                        className="h-12 !rounded-lg px-5 text-sm font-bold shadow-[0_8px_22px_rgba(109,60,220,0.16)]"
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus className="size-4" />
                        Thêm mô tả công việc
                    </Button>
                }
            />

            <section
                className={cn(
                    'mt-1 flex min-h-0 flex-1 flex-col',
                    isTrueEmpty && 'xl:flex xl:min-h-0 xl:flex-1 xl:flex-col',
                )}
                aria-labelledby="jd-list-heading"
            >
                <h2 id="jd-list-heading" className="sr-only">
                    Danh sách JD
                </h2>
                <div className="grid gap-3 rounded-xl border border-violet-100 bg-white p-2.5 shadow-[0_8px_28px_rgba(67,45,135,0.06)] xl:grid-cols-[minmax(430px,0.9fr)_minmax(520px,1.1fr)] xl:items-center xl:gap-5">
                    <div
                        className="relative grid w-full grid-cols-4 rounded-lg bg-slate-100 p-1"
                        aria-label="Lọc theo trạng thái"
                    >
                        <span
                            aria-hidden="true"
                            className="absolute top-1 bottom-1 left-1 rounded-md bg-white shadow-sm transition-transform duration-300 ease-out"
                            style={{
                                width: 'calc((100% - 0.5rem) / 4)',
                                transform: `translateX(${activeStatusIndex * 100}%)`,
                            }}
                        />
                        {STATUS_FILTERS.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                aria-pressed={status === filter.value}
                                className={`relative z-10 min-h-9 rounded-md px-2 text-xs font-bold whitespace-nowrap transition-colors duration-300 sm:px-3 ${status === filter.value ? 'text-primary' : 'text-slate-500 hover:text-slate-800'}`}
                                onClick={() => {
                                    setStatus(filter.value);
                                    setPage(1);
                                }}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_180px_auto] sm:items-center">
                        <div className="relative w-full">
                            <Search
                                aria-hidden="true"
                                className="absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-slate-400"
                            />
                            <Input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Tìm theo vị trí hoặc công ty..."
                                aria-label="Tìm kiếm mô tả công việc"
                                className="h-11 rounded-lg border-slate-200 bg-white pr-4 pl-10 shadow-none"
                            />
                        </div>

                        <div className="w-full">
                            <Select
                                value={sort}
                                onValueChange={(value) => {
                                    setSort(value as JobDescriptionListSort);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger
                                    className="h-11 w-full rounded-lg border-slate-200 shadow-none"
                                    aria-label="Sắp xếp danh sách JD"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RECENTLY_UPDATED">
                                        Cập nhật gần đây
                                    </SelectItem>
                                    <SelectItem value="NEWEST">
                                        Mới tạo nhất
                                    </SelectItem>
                                    <SelectItem value="OLDEST">
                                        Cũ nhất
                                    </SelectItem>
                                    <SelectItem value="TITLE">
                                        Tên A–Z
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div
                            className="grid h-11 grid-cols-2 rounded-lg bg-slate-100 p-1"
                            aria-label="Kiểu hiển thị danh sách"
                        >
                            <button
                                type="button"
                                aria-label="Hiển thị dạng lưới"
                                aria-pressed={viewMode === 'GRID'}
                                className={cn(
                                    'flex size-9 cursor-pointer items-center justify-center rounded-md transition-[color,background-color,box-shadow] duration-200',
                                    viewMode === 'GRID'
                                        ? 'text-primary bg-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800',
                                )}
                                onClick={() => setViewMode('GRID')}
                            >
                                <LayoutGrid className="size-4.5" />
                            </button>
                            <button
                                type="button"
                                aria-label="Hiển thị dạng danh sách"
                                aria-pressed={viewMode === 'LIST'}
                                className={cn(
                                    'flex size-9 cursor-pointer items-center justify-center rounded-md transition-[color,background-color,box-shadow] duration-200',
                                    viewMode === 'LIST'
                                        ? 'text-primary bg-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800',
                                )}
                                onClick={() => setViewMode('LIST')}
                            >
                                <List className="size-4.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={cn(
                        'relative z-10 min-h-80 pt-6 pb-4',
                        isTrueEmpty &&
                            'xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:pb-0',
                    )}
                >
                    {query.isPending ? (
                        <LoadingGrid />
                    ) : query.isError ? (
                        <ErrorState onRetry={() => query.refetch()} />
                    ) : items.length === 0 ? (
                        <EmptyState
                            filtered={hasActiveFilters}
                            onCreate={() => setCreateOpen(true)}
                            onReset={resetFilters}
                        />
                    ) : viewMode === 'GRID' ? (
                        <div
                            className={cn(
                                'grid gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3',
                                query.isFetching ? 'opacity-65' : 'opacity-100',
                            )}
                            aria-busy={query.isFetching}
                        >
                            {items.map((item) => (
                                <JobDescriptionCard
                                    key={item.id}
                                    item={item}
                                    onDelete={setDeleteTarget}
                                    onQuickView={setQuickViewTarget}
                                />
                            ))}
                        </div>
                    ) : (
                        <JobDescriptionListView
                            items={items}
                            pending={query.isFetching}
                            onDelete={setDeleteTarget}
                            onQuickView={setQuickViewTarget}
                        />
                    )}
                </div>

                {pagination && pagination.total > 0 && (
                    <ListPagination
                        page={page}
                        pageSize={pagination.limit}
                        total={pagination.total}
                        totalPages={pagination.totalPages}
                        itemLabel="mô tả công việc"
                        pending={query.isFetching}
                        onPageChange={setPage}
                        className="relative z-10 mt-auto border-0 pt-6 xl:pb-1"
                    />
                )}
            </section>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Xóa mô tả công việc?"
                description={`“${deleteTarget?.title ?? ''}” sẽ không còn xuất hiện trong danh sách.`}
                confirmLabel="Xóa JD"
                destructive
                onConfirm={confirmDelete}
            />
            <CreateJobDescriptionDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
            <JobDescriptionQuickViewDialog
                item={quickViewTarget}
                open={Boolean(quickViewTarget)}
                onOpenChange={(open) => !open && setQuickViewTarget(null)}
            />
        </main>
    );
}

const STATUS_FILTERS: Array<{
    value: JobDescriptionListStatus;
    label: string;
}> = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'ANALYZED', label: 'Đã phân tích' },
    { value: 'NOT_ANALYZED', label: 'Chưa phân tích' },
    { value: 'FAILED', label: 'Thất bại' },
];

function LoadingGrid() {
    return (
        <div
            className="mt-5 grid gap-4 lg:grid-cols-2"
            aria-label="Đang tải danh sách JD"
        >
            {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                    key={item}
                    className="h-52 animate-pulse rounded-2xl border border-slate-100 bg-white p-5"
                >
                    <div className="flex gap-4">
                        <div className="size-12 rounded-xl bg-slate-100" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-1/2 rounded bg-slate-100" />
                            <div className="h-3 w-1/3 rounded bg-slate-100" />
                        </div>
                    </div>
                    <div className="mt-5 space-y-2">
                        <div className="h-3 rounded bg-slate-100" />
                        <div className="h-3 w-4/5 rounded bg-slate-100" />
                    </div>
                    <div className="mt-6 h-9 rounded-lg bg-slate-100" />
                </div>
            ))}
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <DataState
            variant="error"
            size="compact"
            title="Không thể tải danh sách JD"
            description="Dữ liệu của bạn vẫn an toàn. Vui lòng thử tải lại."
            className="mt-5"
            action={
                <Button variant="outline" onClick={onRetry}>
                    Thử lại
                </Button>
            }
        />
    );
}

function EmptyState({
    filtered,
    onCreate,
    onReset,
}: {
    filtered: boolean;
    onCreate: () => void;
    onReset: () => void;
}) {
    if (!filtered) {
        return (
            <EmptyDataState
                illustrationSrc="/images/jds/job-description-empty-state.png"
                illustrationAlt="Minh họa quản lý mô tả công việc trên Interviewly"
                title="Chưa có mô tả công việc nào"
                description="Thêm JD đầu tiên để bắt đầu phân tích yêu cầu và chuẩn bị phỏng vấn."
                benefits={[
                    {
                        icon: BrainCircuit,
                        title: 'Phân tích yêu cầu',
                        description: 'AI nhận diện kỹ năng và cấp độ',
                    },
                    {
                        icon: Target,
                        title: 'Chuẩn bị đúng trọng tâm',
                        description: 'Biết nội dung cần ưu tiên ôn tập',
                    },
                    {
                        icon: BriefcaseBusiness,
                        title: 'Quản lý cơ hội',
                        description: 'Lưu các vị trí bạn quan tâm',
                    },
                ]}
                action={
                    <Button
                        className="h-12 !rounded-lg px-7 text-base font-extrabold shadow-[0_10px_24px_rgba(109,60,220,0.24)]"
                        onClick={onCreate}
                    >
                        <Plus className="size-5" />
                        Thêm mô tả công việc
                    </Button>
                }
            />
        );
    }

    return (
        <DataState
            variant="no-results"
            size="compact"
            illustrationSrc="/images/cvs/cv-no-results.png"
            illustrationAlt=""
            title="Không tìm thấy JD phù hợp"
            description="Hãy thử từ khóa hoặc trạng thái khác."
            className="mt-5"
            action={
                <Button variant="outline" onClick={onReset}>
                    Xóa bộ lọc
                </Button>
            }
        />
    );
}
