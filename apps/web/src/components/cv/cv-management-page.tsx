'use client';

import {
    CloudUpload,
    FilePlus2,
    RefreshCw,
    Search,
    Sparkles,
    Upload,
    X,
    GitCompareArrows,
    SlidersHorizontal,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CvCard } from '@/components/cv/cv-card';
import { CvCompareDialog } from '@/components/cv/cv-compare-dialog';
import {
    DeleteCvDialog,
    RenameCvDialog,
    UploadCvDialog,
} from '@/components/cv/cv-dialogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCvManagementCollection, useSetDefaultCv } from '@/hooks/cv';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/lib/api-error';
import type { CvListItem, CvProcessingStatus } from '@/types/cv';

type StatusFilter =
    'ALL' | Extract<CvProcessingStatus, 'READY' | 'PROCESSING' | 'FAILED'>;
export type SortOption = 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'NAME_DESC';

const filters: Array<{ value: StatusFilter; label: string }> = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'READY', label: 'Sẵn sàng' },
    { value: 'PROCESSING', label: 'Đang xử lý' },
    { value: 'FAILED', label: 'Thất bại' },
];
const emptyCvCollection: CvListItem[] = [];

export function sortCvs(cvs: CvListItem[], sort: SortOption) {
    return cvs.toSorted((a, b) => {
        if (a.isDefault !== b.isDefault) {
            return a.isDefault ? -1 : 1;
        }
        if (sort === 'OLDEST') {
            return Date.parse(a.createdAt) - Date.parse(b.createdAt);
        }
        if (sort === 'NAME_ASC') {
            return a.name.localeCompare(b.name, 'vi');
        }
        if (sort === 'NAME_DESC') {
            return b.name.localeCompare(a.name, 'vi');
        }
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
}

export function CvManagementPage() {
    const [status, setStatus] = useState<StatusFilter>('ALL');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sort, setSort] = useState<SortOption>('NEWEST');
    const [uploadOpen, setUploadOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<CvListItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CvListItem | null>(null);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedCvIds, setSelectedCvIds] = useState<string[]>([]);
    const [compareOpen, setCompareOpen] = useState(false);
    const defaultMutation = useSetDefaultCv();
    const cvQuery = useCvManagementCollection();
    const cvs = cvQuery.data?.items ?? emptyCvCollection;

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearch(search);
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [search]);

    const counts = useMemo(
        () => ({
            ALL: cvs.length,
            READY: cvs.filter((cv) => cv.processingStatus === 'READY').length,
            PROCESSING: cvs.filter((cv) => cv.processingStatus === 'PROCESSING')
                .length,
            FAILED: cvs.filter((cv) => cv.processingStatus === 'FAILED').length,
        }),
        [cvs],
    );

    const visibleCvs = useMemo(() => {
        const normalizedSearch = debouncedSearch.trim().toLocaleLowerCase('vi');
        const result = cvs.filter((cv) => {
            const matchesStatus =
                status === 'ALL' || cv.processingStatus === status;
            const matchesSearch =
                !normalizedSearch ||
                cv.name.toLocaleLowerCase('vi').includes(normalizedSearch) ||
                cv.originalFilename
                    .toLocaleLowerCase('vi')
                    .includes(normalizedSearch);
            return matchesStatus && matchesSearch;
        });

        return sortCvs(result, sort);
    }, [cvs, debouncedSearch, sort, status]);

    const selectedCvs = selectedCvIds
        .map((id) => cvs.find((cv) => cv.id === id))
        .filter((cv): cv is CvListItem => Boolean(cv));

    const toggleCompareCv = (cv: CvListItem) => {
        if (cv.processingStatus !== 'READY') {
            toast.info('Chỉ có thể so sánh CV đã xử lý xong.');
            return;
        }
        setSelectedCvIds((current) =>
            current.includes(cv.id)
                ? current.filter((id) => id !== cv.id)
                : current.length < 2
                  ? [...current, cv.id]
                  : [current[1], cv.id],
        );
    };

    const setDefault = async (cv: CvListItem) => {
        try {
            await defaultMutation.mutateAsync(cv.id);
            toast.success('Đã cập nhật CV mặc định.');
        } catch (error) {
            toast.error('Không thể đặt CV mặc định', {
                description:
                    error instanceof Error
                        ? error.message
                        : 'Vui lòng thử lại.',
            });
        }
    };

    return (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
            <section className="relative isolate min-h-44 overflow-hidden py-4 sm:min-h-48 lg:min-h-52">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-full bg-[radial-gradient(circle_at_58%_20%,rgba(139,92,246,0.09),transparent_34%),linear-gradient(180deg,rgba(248,247,255,0.78),rgba(255,255,255,0))]"
                />
                <div className="relative z-10 flex min-h-36 max-w-md flex-col items-start justify-center sm:min-h-40 md:max-w-[42%] lg:max-w-[44%] 2xl:max-w-lg">
                    <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
                        Quản lý CV
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                        CV của bạn
                    </h1>
                    <p className="mt-2 max-w-lg text-sm leading-6 font-medium text-slate-500 sm:text-[15px]">
                        Quản lý các phiên bản CV, phân tích bằng AI và chuẩn bị
                        tốt hơn cho cơ hội nghề nghiệp tiếp theo.
                    </p>
                </div>
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-6 left-[44%] -z-10 hidden md:block lg:right-10 lg:left-[46%] 2xl:right-40 2xl:left-[31%]"
                >
                    <Image
                        src="/images/cvs/cv-header-illustration.png"
                        alt=""
                        fill
                        priority
                        sizes="(min-width: 1280px) 44vw, (min-width: 1024px) 50vw, 58vw"
                        className="object-contain object-center opacity-[0.55] 2xl:opacity-70"
                    />
                </div>
                <Button
                    className="relative z-10 mt-1 rounded-lg px-5 font-bold shadow-[0_8px_22px_rgba(109,60,220,0.16)] lg:absolute lg:top-1/2 lg:right-1 lg:mt-0 lg:-translate-y-1/2"
                    onClick={() => setUploadOpen(true)}
                >
                    <Upload className="size-4" aria-hidden="true" />
                    Tải CV lên
                </Button>
            </section>

            <section aria-label="Danh sách CV" className="mt-1">
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-violet-100/80 bg-white/90 p-2.5 shadow-[0_8px_26px_rgba(70,48,150,0.045)]">
                    <div className="min-w-0 flex-1 basis-[440px]">
                        <Select
                            value={status}
                            onValueChange={(value) =>
                                setStatus(value as StatusFilter)
                            }
                        >
                            <SelectTrigger
                                className="h-11 w-full rounded-xl bg-slate-50 2xl:hidden"
                                aria-label="Lọc CV theo trạng thái"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <SlidersHorizontal
                                        className="text-primary size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                                        Trạng thái:
                                    </span>
                                    <SelectValue />
                                </span>
                            </SelectTrigger>
                            <SelectContent>
                                {filters.map((filter) => (
                                    <SelectItem
                                        key={filter.value}
                                        value={filter.value}
                                    >
                                        {filter.label} ({counts[filter.value]})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div
                            className="relative hidden w-[480px] grid-cols-4 rounded-xl bg-slate-100 p-1 text-[13px] 2xl:grid"
                            aria-label="Lọc CV theo trạng thái"
                        >
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out"
                                style={{
                                    width: 'calc((100% - 0.5rem) / 4)',
                                    transform: `translateX(${filters.findIndex((filter) => filter.value === status) * 100}%)`,
                                }}
                            />
                            {filters.map((filter) => (
                                <button
                                    key={filter.value}
                                    type="button"
                                    aria-pressed={status === filter.value}
                                    className={cn(
                                        'focus-visible:ring-primary/30 relative z-10 min-h-9 cursor-pointer rounded-lg px-2 text-sm font-bold transition-colors duration-300 focus-visible:ring-2 focus-visible:outline-none',
                                        status === filter.value
                                            ? 'text-primary'
                                            : 'text-slate-500 hover:text-slate-800',
                                    )}
                                    onClick={() => setStatus(filter.value)}
                                >
                                    {filter.label}{' '}
                                    <span className="tabular-nums opacity-70">
                                        ({counts[filter.value]})
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-1 basis-[560px] flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end 2xl:flex-none 2xl:flex-nowrap">
                        <Button
                            type="button"
                            variant={compareMode ? 'default' : 'outline'}
                            className="h-11 rounded-sm !font-bold transition-all duration-300"
                            onClick={() => {
                                setCompareMode((value) => !value);
                                setSelectedCvIds([]);
                            }}
                        >
                            <GitCompareArrows className="size-4" />
                            {compareMode ? 'Hủy so sánh' : 'So sánh CV'}
                        </Button>
                        <div className="relative min-w-0 sm:w-80 xl:w-96">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-4 z-10 size-[18px] -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Tìm kiếm CV..."
                                aria-label="Tìm kiếm CV theo tên"
                                className="h-11 rounded-xl pr-10 pl-11"
                            />
                            {search && (
                                <button
                                    type="button"
                                    aria-label="Xóa nội dung tìm kiếm"
                                    className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    onClick={() => {
                                        setSearch('');
                                        setDebouncedSearch('');
                                    }}
                                >
                                    <X
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </button>
                            )}
                        </div>
                        <Select
                            value={sort}
                            onValueChange={(value) =>
                                setSort(value as SortOption)
                            }
                        >
                            <SelectTrigger
                                className="h-11 w-full sm:w-44"
                                aria-label="Sắp xếp CV"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NEWEST">Mới nhất</SelectItem>
                                <SelectItem value="OLDEST">Cũ nhất</SelectItem>
                                <SelectItem value="NAME_ASC">
                                    Tên A–Z
                                </SelectItem>
                                <SelectItem value="NAME_DESC">
                                    Tên Z–A
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="relative min-h-80 py-5">
                    {compareMode && (
                        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-violet-100 bg-violet-50/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-bold text-slate-700">
                                Chọn đúng 2 CV để so sánh · Đã chọn{' '}
                                {selectedCvIds.length}/2
                            </p>
                            <Button
                                disabled={selectedCvIds.length !== 2}
                                onClick={() => setCompareOpen(true)}
                                className="h-11 rounded-sm px-6"
                            >
                                So sánh đã chọn
                            </Button>
                        </div>
                    )}
                    {cvQuery.isFetching && !cvQuery.isPending && (
                        <div className="absolute top-1 right-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                            <RefreshCw
                                className="size-3 animate-spin"
                                aria-hidden="true"
                            />
                            Đang cập nhật
                        </div>
                    )}

                    {cvQuery.isPending ? (
                        <CvListSkeleton />
                    ) : cvQuery.isError ? (
                        <CvListError
                            error={cvQuery.error as ApiError}
                            onRetry={() => void cvQuery.refetch()}
                        />
                    ) : cvs.length === 0 ? (
                        <CvEmptyState onUpload={() => setUploadOpen(true)} />
                    ) : visibleCvs.length === 0 ? (
                        <CvNoResults
                            onReset={() => {
                                setStatus('ALL');
                                setSearch('');
                                setDebouncedSearch('');
                            }}
                        />
                    ) : (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {visibleCvs.map((cv) => (
                                <CvCard
                                    key={cv.id}
                                    cv={cv}
                                    actionPending={defaultMutation.isPending}
                                    onRename={setRenameTarget}
                                    onSetDefault={(target) =>
                                        void setDefault(target)
                                    }
                                    onDelete={setDeleteTarget}
                                    selectionMode={compareMode}
                                    selected={selectedCvIds.includes(cv.id)}
                                    onToggleSelection={toggleCompareCv}
                                />
                            ))}
                            <CvUploadCard
                                onUpload={() => setUploadOpen(true)}
                            />
                        </div>
                    )}
                </div>
            </section>

            <UploadCvDialog open={uploadOpen} onOpenChange={setUploadOpen} />
            <RenameCvDialog
                cv={renameTarget}
                open={Boolean(renameTarget)}
                onOpenChange={(open) => !open && setRenameTarget(null)}
            />
            <DeleteCvDialog
                cv={deleteTarget}
                open={Boolean(deleteTarget)}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            />
            <CvCompareDialog
                selected={
                    selectedCvs.length === 2
                        ? [selectedCvs[0], selectedCvs[1]]
                        : null
                }
                open={compareOpen}
                onOpenChange={setCompareOpen}
            />
        </main>
    );
}

function CvUploadCard({ onUpload }: { onUpload: () => void }) {
    return (
        <button
            type="button"
            className="group !border-primary/50 relative flex min-h-72 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-[radial-gradient(circle_at_50%_38%,rgba(139,92,246,0.10),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,245,255,0.88))] p-6 text-center transition-all duration-300 hover:border-violet-500 hover:shadow-[0_12px_32px_rgba(109,60,220,0.09)] focus-visible:ring-3 focus-visible:ring-violet-200 focus-visible:outline-none"
            onClick={onUpload}
        >
            <span className="text-primary relative flex h-12 items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5">
                <CloudUpload
                    className="size-10"
                    strokeWidth={1.9}
                    aria-hidden="true"
                />
                <Sparkles
                    className="absolute -top-1 -right-5 size-4 text-violet-300"
                    aria-hidden="true"
                />
            </span>
            <span className="mt-3 text-base font-extrabold text-slate-950">
                Tải lên CV mới
            </span>
            <span className="mt-2 max-w-64 text-sm leading-5 font-semibold text-slate-500">
                Nhấn để chọn tệp PDF từ thiết bị
            </span>
            <span className="mt-1 text-xs font-semibold text-slate-400">
                Chỉ hỗ trợ PDF, dung lượng tối đa 5 MB
            </span>
            <span className="bg-primary text-primary-foreground mt-5 inline-flex h-10 min-w-40 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold shadow-[0_8px_20px_rgba(109,60,220,0.2)] transition group-hover:bg-violet-700">
                <Upload className="size-4" aria-hidden="true" />
                Chọn tệp
            </span>
        </button>
    );
}

function CvListSkeleton() {
    return (
        <div
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Đang tải danh sách CV"
            aria-busy="true"
        >
            {Array.from({ length: 3 }).map((_, index) => (
                <div
                    key={index}
                    className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-white shadow-sm"
                />
            ))}
        </div>
    );
}

function CvEmptyState({ onUpload }: { onUpload: () => void }) {
    return (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/25 px-4 text-center">
            <span className="bg-primary/8 text-primary flex size-16 items-center justify-center rounded-2xl">
                <FilePlus2 className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-slate-950">
                Bạn chưa có CV nào
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 font-medium text-slate-500">
                Tải CV đầu tiên để nhận phân tích từ AI và chuẩn bị tốt hơn cho
                các buổi phỏng vấn.
            </p>
            <Button className="mt-5" onClick={onUpload}>
                <Upload className="size-4" aria-hidden="true" />
                Tải CV đầu tiên
            </Button>
        </div>
    );
}

function CvNoResults({ onReset }: { onReset: () => void }) {
    return (
        <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
            <Search className="size-8 text-slate-300" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-extrabold text-slate-950">
                Không tìm thấy CV phù hợp
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
                Hãy thử từ khóa hoặc trạng thái khác.
            </p>
            <Button className="mt-5" variant="outline" onClick={onReset}>
                Xóa bộ lọc
            </Button>
        </div>
    );
}

function CvListError({ onRetry }: { error: ApiError; onRetry: () => void }) {
    return (
        <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <RefreshCw className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-extrabold text-slate-950">
                Không thể tải danh sách CV
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 font-medium text-slate-500">
                Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.
            </p>
            <Button className="mt-5" variant="outline" onClick={onRetry}>
                <RefreshCw className="size-4" aria-hidden="true" />
                Thử lại
            </Button>
        </div>
    );
}
