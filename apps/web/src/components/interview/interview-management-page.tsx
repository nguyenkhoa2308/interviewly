'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    ArrowRight,
    BriefcaseBusiness,
    CalendarDays,
    Clock3,
    Copy,
    FileText,
    Plus,
    Search,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MutationConfirmDialog } from '@/components/ui/mutation-confirm-dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useDeleteInterview,
    useDeleteInterviews,
    useInterviews,
} from '@/hooks/interview/use-interviews';
import type {
    InterviewListItem,
    InterviewListSort,
    InterviewStatus,
} from '@/types/interview';

const statusLabel: Record<InterviewListItem['status'], string> = {
    DRAFT: 'Bản nháp',
    PLANNING: 'Đang lập kế hoạch',
    READY: 'Sẵn sàng',
    IN_PROGRESS: 'Đang phỏng vấn',
    COMPLETED: 'Đã hoàn thành',
    CANCELLED: 'Đã hủy',
};

export function InterviewManagementPage() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<'ALL' | InterviewStatus>('ALL');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<InterviewListSort>('RECENTLY_UPDATED');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<InterviewListItem | null>(
        null,
    );
    const remove = useDeleteInterview();
    const removeMany = useDeleteInterviews();
    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
            setSelectedIds([]);
        }, 300);
        return () => window.clearTimeout(timeout);
    }, [search]);
    const query = useInterviews(
        page,
        status === 'ALL' ? undefined : status,
        debouncedSearch || undefined,
        sort,
    );
    const toggleSelected = (id: string, checked: boolean) => {
        setSelectedIds((current) =>
            checked
                ? current.includes(id)
                    ? current
                    : [...current, id]
                : current.filter((item) => item !== id),
        );
    };

    const confirmBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        try {
            const result = await removeMany.mutateAsync(selectedIds);
            const remaining =
                (query.data?.items.length ?? 0) - result.deletedCount;
            if (remaining <= 0 && page > 1) setPage((current) => current - 1);
            setSelectedIds([]);
            setBulkDeleteOpen(false);
            toast.success(`Đã xóa ${result.deletedCount} buổi phỏng vấn.`);
        } catch (error) {
            toast.error('Không thể xóa các buổi phỏng vấn', {
                description:
                    error instanceof Error
                        ? error.message
                        : 'Vui lòng thử lại.',
            });
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await remove.mutateAsync(deleteTarget.id);
            if ((query.data?.items.length ?? 0) === 1 && page > 1)
                setPage((current) => current - 1);
            setDeleteTarget(null);
            toast.success('Đã xóa buổi phỏng vấn.');
        } catch (error) {
            toast.error('Không thể xóa buổi phỏng vấn', {
                description:
                    error instanceof Error
                        ? error.message
                        : 'Vui lòng thử lại.',
            });
        }
    };

    const filters: Array<{ value: 'ALL' | InterviewStatus; label: string }> = [
        { value: 'ALL', label: 'Tất cả' },
        { value: 'DRAFT', label: 'Bản nháp' },
        { value: 'PLANNING', label: 'Đang lập kế hoạch' },
        { value: 'READY', label: 'Sẵn sàng' },
        { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
        { value: 'COMPLETED', label: 'Đã hoàn thành' },
        { value: 'CANCELLED', label: 'Đã hủy' },
    ];

    return (
        <main className="mx-auto w-full max-w-[1600px] p-5 sm:p-8">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-primary text-xs font-extrabold tracking-[.18em] uppercase">
                        Luyện tập
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
                        Phỏng vấn của bạn
                    </h1>
                    <p className="mt-2 max-w-2xl text-slate-500">
                        Quản lý bản nháp, kế hoạch đã tạo và tiếp tục các buổi
                        phỏng vấn đang thực hiện.
                    </p>
                </div>
                <Button asChild className="h-11 rounded-lg px-5 font-bold">
                    <Link href="/interviews/new">
                        <Plus className="size-4" />
                        Tạo phỏng vấn
                    </Link>
                </Button>
            </header>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <div className="relative w-full sm:max-w-md">
                    <Search
                        className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                    />
                    <Input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Tìm vai trò, CV, JD hoặc công ty..."
                        aria-label="Tìm kiếm buổi phỏng vấn"
                        className="h-11 rounded-lg border-slate-200 bg-white pr-4 pl-10 shadow-sm"
                    />
                </div>
                <Select
                    value={status}
                    onValueChange={(value) => {
                        setStatus(value as 'ALL' | InterviewStatus);
                        setPage(1);
                        setSelectedIds([]);
                    }}
                >
                    <SelectTrigger
                        className="h-11 w-full rounded-lg border-slate-200 bg-white px-4 font-bold shadow-sm sm:w-60"
                        aria-label="Lọc phỏng vấn theo trạng thái"
                    >
                        <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        {filters.map((filter) => (
                            <SelectItem key={filter.value} value={filter.value}>
                                {filter.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={sort}
                    onValueChange={(value) => {
                        setSort(value as InterviewListSort);
                        setPage(1);
                        setSelectedIds([]);
                    }}
                >
                    <SelectTrigger
                        className="h-11 w-full rounded-lg border-slate-200 bg-white px-4 font-bold shadow-sm sm:w-52"
                        aria-label="Sắp xếp danh sách phỏng vấn"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="RECENTLY_UPDATED">
                            Cập nhật gần đây
                        </SelectItem>
                        <SelectItem value="NEWEST">Mới tạo nhất</SelectItem>
                        <SelectItem value="OLDEST">Cũ nhất</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {selectedIds.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3">
                    <p className="mr-auto text-sm font-bold text-violet-900">
                        Đã chọn {selectedIds.length} buổi phỏng vấn
                    </p>
                    <button
                        type="button"
                        className="text-primary cursor-pointer text-sm font-bold hover:underline"
                        onClick={() =>
                            setSelectedIds(
                                selectedIds.length ===
                                    (query.data?.items.length ?? 0)
                                    ? []
                                    : (query.data?.items.map(
                                          (item) => item.id,
                                      ) ?? []),
                            )
                        }
                    >
                        {selectedIds.length === (query.data?.items.length ?? 0)
                            ? 'Bỏ chọn tất cả'
                            : 'Chọn trang này'}
                    </button>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="!border-destructive/50 rounded-sm font-bold"
                        onClick={() => setBulkDeleteOpen(true)}
                    >
                        <Trash2 className="size-4" />
                        Xóa mục đã chọn
                    </Button>
                </div>
            )}

            {query.isPending ? (
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div
                            key={index}
                            className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
                        />
                    ))}
                </div>
            ) : query.isError ? (
                <div className="mt-8 rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center">
                    <p className="font-bold text-slate-900">
                        Không thể tải danh sách phỏng vấn.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => query.refetch()}
                    >
                        Thử lại
                    </Button>
                </div>
            ) : query.data.items.length === 0 ? (
                <div className="mt-10 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-12 text-center">
                    <CalendarDays className="text-primary mx-auto size-9" />
                    <h2 className="mt-4 text-lg font-bold">
                        {status === 'ALL'
                            ? 'Chưa có buổi phỏng vấn nào'
                            : 'Không có phỏng vấn phù hợp bộ lọc'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Chọn CV và JD đã phân tích để AI xây dựng kế hoạch phù
                        hợp.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {query.data.items.map((item) => (
                            <InterviewCard
                                key={item.id}
                                item={item}
                                selected={selectedIds.includes(item.id)}
                                onSelectedChange={(checked) =>
                                    toggleSelected(item.id, checked)
                                }
                                onDelete={setDeleteTarget}
                            />
                        ))}
                    </div>
                    <footer className="mt-7 flex items-center justify-between border-t border-slate-200 pt-5">
                        <p className="text-sm font-medium text-slate-500">
                            Hiển thị {query.data.items.length} trong{' '}
                            {query.data.pagination.total} buổi phỏng vấn
                        </p>
                        {query.data.pagination.totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => {
                                        setSelectedIds([]);
                                        setPage((value) => value - 1);
                                    }}
                                >
                                    Trước
                                </Button>
                                <span className="px-2 text-sm font-bold text-slate-700">
                                    {page}/{query.data.pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        page >= query.data.pagination.totalPages
                                    }
                                    onClick={() => {
                                        setSelectedIds([]);
                                        setPage((value) => value + 1);
                                    }}
                                >
                                    Sau
                                </Button>
                            </div>
                        )}
                    </footer>
                </>
            )}

            <MutationConfirmDialog
                open={bulkDeleteOpen}
                title="Xóa các buổi phỏng vấn đã chọn?"
                description={`Bạn sắp xóa vĩnh viễn ${selectedIds.length} buổi phỏng vấn cùng toàn bộ lịch sử kế hoạch liên quan.`}
                confirmLabel="Xóa các mục đã chọn"
                pendingLabel="Đang xóa..."
                pending={removeMany.isPending}
                onOpenChange={setBulkDeleteOpen}
                onConfirm={confirmBulkDelete}
            />

            <MutationConfirmDialog
                open={Boolean(deleteTarget)}
                title="Xóa buổi phỏng vấn?"
                description={`Buổi phỏng vấn cho vị trí “${deleteTarget?.targetRole ?? ''}” và toàn bộ lịch sử kế hoạch liên quan sẽ bị xóa vĩnh viễn.`}
                confirmLabel="Xóa phỏng vấn"
                pendingLabel="Đang xóa..."
                pending={remove.isPending}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={confirmDelete}
            />
        </main>
    );
}

function InterviewCard({
    item,
    selected,
    onSelectedChange,
    onDelete,
}: {
    item: InterviewListItem;
    selected: boolean;
    onSelectedChange: (checked: boolean) => void;
    onDelete: (item: InterviewListItem) => void;
}) {
    const isDraft = item.status === 'DRAFT';
    return (
        <article
            className={`group relative min-h-64 rounded-2xl border bg-white shadow-[0_12px_35px_rgba(47,38,80,.04)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_18px_45px_rgba(87,60,150,.09)] ${selected ? 'border-primary ring-primary/10 ring-2' : 'border-slate-200'}`}
        >
            <label className="absolute top-4 left-4 z-10 grid size-9 cursor-pointer place-items-center rounded-lg bg-white/90 shadow-sm ring-1 ring-slate-200 transition hover:ring-violet-300">
                <span className="sr-only">
                    Chọn buổi phỏng vấn {item.targetRole}
                </span>
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => onSelectedChange(event.target.checked)}
                    className="accent-primary size-4 cursor-pointer"
                />
            </label>
            <Link
                href={`/interviews/new?from=${item.id}`}
                aria-label={`Nhân bản buổi phỏng vấn ${item.targetRole}`}
                title="Nhân bản và chỉnh sửa"
                className="focus-visible:ring-primary/30 absolute top-4 right-14 z-10 grid size-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-2 focus-visible:outline-none"
            >
                <Copy className="size-4" aria-hidden="true" />
            </Link>{' '}
            <button
                type="button"
                aria-label={`Xóa buổi phỏng vấn ${item.targetRole}`}
                title="Xóa buổi phỏng vấn"
                className="focus-visible:ring-primary/30 absolute top-4 right-4 z-10 grid size-9 cursor-pointer place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => onDelete(item)}
            >
                <Trash2 className="size-4" aria-hidden="true" />
            </button>
            <Link
                href={`/interviews/${item.id}`}
                className="flex min-h-64 flex-col p-5 focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:outline-none"
            >
                <div className="flex items-start gap-3 pr-20 pl-10">
                    <span className="text-primary grid size-11 place-items-center rounded-xl bg-violet-50">
                        <Sparkles className="size-5" strokeWidth={2.3} />
                    </span>
                    <span
                        className={
                            'ml-auto rounded-full px-3 py-1 text-xs font-bold ' +
                            (isDraft
                                ? 'bg-amber-50 text-amber-700'
                                : item.status === 'READY'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600')
                        }
                    >
                        {statusLabel[item.status]}
                    </span>
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-slate-950">
                    {item.targetRole}
                </h2>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <BriefcaseBusiness className="size-4" />
                    {item.jobDescription.title}
                    {item.jobDescription.company
                        ? ` · ${item.jobDescription.company}`
                        : ''}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                    {item.plans[0]?.summary ??
                        `Kế hoạch ${item.interviewType.toLowerCase()} từ ${item.cv.name}.`}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <Clock3 className="size-4" />
                        {item.durationMinutes} phút
                    </span>
                    <span className="flex items-center gap-1.5">
                        <FileText className="size-4" />
                        {item.questionCount} câu
                    </span>
                    <span className="text-primary ml-auto flex items-center gap-1">
                        Xem chi tiết
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>
            </Link>
        </article>
    );
}
