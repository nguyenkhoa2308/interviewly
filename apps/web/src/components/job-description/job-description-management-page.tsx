'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Plus,
    Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
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

const PAGE_SIZE = 20;

export function JobDescriptionManagementPage() {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<JobDescriptionListStatus>('ALL');
    const [sort, setSort] =
        useState<JobDescriptionListSort>('RECENTLY_UPDATED');
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] =
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
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            <header className="relative isolate flex min-h-44 flex-col items-start justify-center overflow-hidden py-4 sm:min-h-48 lg:min-h-52 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative z-10 flex min-h-36 max-w-md flex-col items-start justify-center sm:min-h-40 md:max-w-[42%] lg:max-w-[44%] 2xl:max-w-lg">
                    <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
                        Không gian nghề nghiệp
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                        Mô tả công việc
                    </h1>
                    <p className="mt-2 max-w-lg text-sm leading-6 font-semibold text-slate-600 sm:text-base">
                        Lưu các vị trí bạn quan tâm, khám phá yêu cầu tuyển dụng
                        và chuẩn bị đúng trọng tâm cho buổi phỏng vấn.
                    </p>
                </div>
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
                        className="object-contain object-center opacity-[0.55] 2xl:opacity-70"
                    />
                </div>
                <Button
                    type="button"
                    className="relative z-10 mt-4 h-12 rounded-lg px-5 font-bold shadow-[0_8px_22px_rgba(109,60,220,0.16)] lg:mt-0"
                    onClick={() => setCreateOpen(true)}
                >
                    <Plus className="size-4" />
                    Thêm mô tả công việc
                </Button>
            </header>

            <section className="mt-1" aria-labelledby="jd-list-heading">
                <h2 id="jd-list-heading" className="sr-only">
                    Danh sách JD
                </h2>
                <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-3 sm:gap-5 sm:p-4 xl:grid-cols-[minmax(360px,480px)_minmax(0,1fr)] xl:items-center xl:gap-12">
                    <div
                        className="relative grid w-full grid-cols-4 rounded-lg bg-slate-100 p-1"
                        aria-label="Lọc theo trạng thái"
                    >
                        <span
                            aria-hidden="true"
                            className="absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-md bg-white shadow-sm transition-transform duration-300 ease-out"
                            style={{
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

                    <div className="grid gap-2 sm:grid-cols-[minmax(260px,480px)_200px] sm:justify-end">
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
                                className="h-11 rounded-lg border-slate-300 bg-white pr-4 pl-10 shadow-none"
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
                                    className="w-full rounded-lg border-slate-300 shadow-none"
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
                    </div>
                </div>

                {query.isPending ? (
                    <LoadingGrid />
                ) : query.isError ? (
                    <ErrorState onRetry={() => query.refetch()} />
                ) : items.length === 0 ? (
                    <EmptyState
                        searching={Boolean(debouncedSearch)}
                        onCreate={() => setCreateOpen(true)}
                    />
                ) : (
                    <div
                        className={`mt-3 grid grid-cols-[repeat(auto-fill,minmax(min(100%,430px),1fr))] gap-3 transition-opacity ${query.isFetching ? 'opacity-65' : 'opacity-100'}`}
                        aria-busy={query.isFetching}
                    >
                        {items.map((item) => (
                            <JobDescriptionCard
                                key={item.id}
                                item={item}
                                onDelete={setDeleteTarget}
                            />
                        ))}
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <nav
                        className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5"
                        aria-label="Phân trang mô tả công việc"
                    >
                        <p
                            className="text-sm font-semibold text-slate-500"
                            aria-live="polite"
                        >
                            Hiển thị {pagination.total} mô tả công việc
                        </p>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={page <= 1 || query.isFetching}
                                onClick={() => setPage((value) => value - 1)}
                            >
                                <ChevronLeft className="size-4" />
                                Trước
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                    page >= pagination.totalPages ||
                                    query.isFetching
                                }
                                onClick={() => setPage((value) => value + 1)}
                            >
                                Sau
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </nav>
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
            {[1, 2, 3, 4].map((item) => (
                <div
                    key={item}
                    className="h-52 animate-pulse rounded-2xl border border-slate-100 bg-slate-100/80"
                />
            ))}
        </div>
    );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700"
            role="alert"
        >
            Không thể tải danh sách JD.{' '}
            <button
                type="button"
                className="font-bold underline underline-offset-2"
                onClick={onRetry}
            >
                Thử lại
            </button>
        </div>
    );
}

function EmptyState({
    searching,
    onCreate,
}: {
    searching: boolean;
    onCreate: () => void;
}) {
    return (
        <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 px-6 text-center">
            <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-2xl">
                <FileText className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-slate-900">
                {searching
                    ? 'Không tìm thấy JD phù hợp'
                    : 'Chưa có mô tả công việc nào'}
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                {searching
                    ? 'Hãy thử từ khóa khác hoặc kiểm tra lại tên công ty.'
                    : 'Thêm JD đầu tiên để bắt đầu phân tích yêu cầu và chuẩn bị phỏng vấn.'}
            </p>
            {!searching && (
                <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    onClick={onCreate}
                >
                    <Plus className="size-4" />
                    Thêm mô tả công việc
                </Button>
            )}
        </div>
    );
}
