'use client';

import {
    CloudUpload,
    RefreshCw,
    Search,
    Sparkles,
    Upload,
    X,
    GitCompareArrows,
    SlidersHorizontal,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CvCard } from '@/components/cv/cv-card';
import { CvCompareDialog } from '@/components/cv/cv-compare-dialog';
import { DataState, EmptyDataState } from '@/components/common/data-state';
import { AppPageHeader } from '@/components/layout/app-page-header';
import {
    DeleteCvDialog,
    RenameCvDialog,
    UploadCvDialog,
    CvVersionsDialog,
} from '@/components/cv/cv-dialogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListPagination } from '@/components/ui/list-pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCvManagementCollection, useSetDefaultCv } from '@/hooks/cv';
import { cn } from '@/lib/utils';
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
const CVS_PER_PAGE = 9;

export function CvManagementPage() {
    const [status, setStatus] = useState<StatusFilter>('ALL');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sort, setSort] = useState<SortOption>('NEWEST');
    const [page, setPage] = useState(1);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<CvListItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CvListItem | null>(null);
    const [retryTarget, setRetryTarget] = useState<CvListItem | null>(null);
    const [compareMode, setCompareMode] = useState(false);
    const [selectedCvs, setSelectedCvs] = useState<CvListItem[]>([]);
    const [compareOpen, setCompareOpen] = useState(false);
    const defaultMutation = useSetDefaultCv();
    const cvQuery = useCvManagementCollection({
        page,
        limit: CVS_PER_PAGE,
        ...(status !== 'ALL' ? { status } : {}),
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        sort,
    });
    const cvs = cvQuery.data?.items ?? emptyCvCollection;

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedSearch(search);
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [search]);

    const counts =
        cvQuery.data?.counts ??
        ({
            ALL: cvs.length,
            READY: cvs.filter((cv) => cv.processingStatus === 'READY').length,
            PROCESSING: cvs.filter((cv) => cv.processingStatus === 'PROCESSING')
                .length,
            FAILED: cvs.filter((cv) => cv.processingStatus === 'FAILED').length,
        } satisfies Record<StatusFilter, number>);
    const pagination = cvQuery.data?.pagination;
    const totalPages = Math.max(1, pagination?.totalPages ?? 1);
    const currentPage = Math.min(page, totalPages);
    const totalCvs = pagination?.total ?? cvs.length;
    const isEmptyState =
        !cvQuery.isPending && !cvQuery.isError && counts.ALL === 0;
    const isViewportState = isEmptyState || cvQuery.isError;

    useEffect(() => {
        if (!pagination || page <= totalPages) return;
        const timeoutId = window.setTimeout(() => setPage(totalPages), 0);
        return () => window.clearTimeout(timeoutId);
    }, [page, pagination, totalPages]);

    const toggleCompareCv = (cv: CvListItem) => {
        if (cv.processingStatus !== 'READY') {
            toast.info('Chỉ có thể so sánh CV đã xử lý xong.');
            return;
        }
        setSelectedCvs((current) =>
            current.some((selected) => selected.id === cv.id)
                ? current.filter((selected) => selected.id !== cv.id)
                : current.length < 2
                  ? [...current, cv]
                  : [current[1], cv],
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
        <main
            className={cn(
                'relative isolate mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1600px] px-4 pt-7 pb-5 sm:px-6 sm:pt-8 lg:px-8 xl:pt-7 xl:pb-4',
                isViewportState &&
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
                className="mx-auto min-h-36 w-full shrink-0 overflow-hidden py-3 sm:min-h-40 lg:items-center xl:min-h-32 xl:py-1"
                contentClassName="flex min-h-32 max-w-md flex-col items-start justify-center sm:min-h-36 md:max-w-[42%] lg:max-w-[44%] xl:min-h-28 2xl:max-w-lg"
                eyebrow="Quản lý CV"
                title="CV của bạn"
                description="Quản lý các phiên bản CV, phân tích bằng AI và chuẩn bị tốt hơn cho cơ hội nghề nghiệp tiếp theo."
                decoration={
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
                            className="scale-125 object-contain object-center opacity-80 2xl:scale-[1.35] 2xl:opacity-90"
                        />
                    </div>
                }
                actions={
                    <Button
                        className="h-12 !rounded-lg px-5 text-sm font-bold shadow-[0_8px_22px_rgba(109,60,220,0.16)]"
                        onClick={() => setUploadOpen(true)}
                    >
                        <Upload className="size-4" aria-hidden="true" />
                        Tải CV lên
                    </Button>
                }
            />

            <section
                aria-label="Danh sách CV"
                className={cn(
                    'mx-auto mt-5 w-full',
                    isViewportState &&
                        'xl:flex xl:min-h-0 xl:flex-1 xl:flex-col',
                )}
            >
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-violet-100/80 bg-white/90 p-2.5 shadow-[0_8px_26px_rgba(70,48,150,0.045)]">
                    <div className="min-w-0 flex-1 basis-[440px]">
                        <Select
                            value={status}
                            onValueChange={(value) => {
                                setStatus(value as StatusFilter);
                                setPage(1);
                            }}
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
                                    onClick={() => {
                                        setStatus(filter.value);
                                        setPage(1);
                                    }}
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
                            className="h-11 !rounded-lg !font-bold transition-all duration-300"
                            onClick={() => {
                                setCompareMode((value) => !value);
                                setSelectedCvs([]);
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
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
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
                                        setPage(1);
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
                            onValueChange={(value) => {
                                setSort(value as SortOption);
                                setPage(1);
                            }}
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

                <div
                    className={cn(
                        'relative z-10 min-h-80 pt-6 pb-4',
                        isViewportState &&
                            'xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:pb-0',
                    )}
                >
                    <div
                        aria-hidden={!compareMode}
                        className={cn(
                            'grid transition-[grid-template-rows,opacity,margin-bottom] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                            compareMode
                                ? 'mb-4 grid-rows-[1fr] opacity-100'
                                : 'pointer-events-none mb-0 grid-rows-[0fr] opacity-0',
                        )}
                    >
                        <div className="min-h-0 overflow-hidden">
                            <div className="flex flex-col gap-3 rounded-xl border border-violet-100 bg-violet-50/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-bold text-slate-700">
                                    Chọn đúng 2 CV để so sánh · Đã chọn{' '}
                                    {selectedCvs.length}/2
                                </p>
                                <Button
                                    disabled={
                                        !compareMode || selectedCvs.length !== 2
                                    }
                                    onClick={() => setCompareOpen(true)}
                                    className="h-11 rounded-sm px-6"
                                >
                                    So sánh đã chọn
                                </Button>
                            </div>
                        </div>
                    </div>
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
                        <CvListError onRetry={() => void cvQuery.refetch()} />
                    ) : counts.ALL === 0 ? (
                        <CvEmptyState onUpload={() => setUploadOpen(true)} />
                    ) : cvs.length === 0 ? (
                        <CvNoResults
                            onReset={() => {
                                setStatus('ALL');
                                setSearch('');
                                setDebouncedSearch('');
                                setPage(1);
                            }}
                        />
                    ) : (
                        <div className="grid auto-rows-fr gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {cvs.map((cv) => (
                                <CvCard
                                    key={cv.id}
                                    cv={cv}
                                    actionPending={defaultMutation.isPending}
                                    onRename={setRenameTarget}
                                    onSetDefault={(target) =>
                                        void setDefault(target)
                                    }
                                    onDelete={setDeleteTarget}
                                    onRetryUpload={setRetryTarget}
                                    selectionMode={compareMode}
                                    selected={selectedCvs.some(
                                        (selected) => selected.id === cv.id,
                                    )}
                                    onToggleSelection={toggleCompareCv}
                                />
                            ))}
                        </div>
                    )}

                    {!cvQuery.isError && totalCvs > 0 && (
                        <ListPagination
                            page={currentPage}
                            pageSize={CVS_PER_PAGE}
                            total={totalCvs}
                            totalPages={totalPages}
                            itemLabel="CV"
                            ariaLabel="Phân trang danh sách CV"
                            pending={cvQuery.isFetching}
                            onPageChange={setPage}
                            className="mt-7 border-0 pt-3 xl:pb-1"
                        />
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
            <CvVersionsDialog
                cv={retryTarget}
                open={Boolean(retryTarget)}
                onOpenChange={(open) => !open && setRetryTarget(null)}
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

export function CvUploadCard({ onUpload }: { onUpload: () => void }) {
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
            {Array.from({ length: 6 }).map((_, index) => (
                <div
                    key={index}
                    className="h-72 animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                    <div className="flex gap-4">
                        <div className="size-12 rounded-xl bg-slate-100" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-2/3 rounded bg-slate-100" />
                            <div className="h-3 w-1/2 rounded bg-slate-100" />
                        </div>
                    </div>
                    <div className="mt-7 grid grid-cols-2 gap-5">
                        <div className="h-11 rounded-lg bg-slate-100" />
                        <div className="h-11 rounded-lg bg-slate-100" />
                    </div>
                    <div className="mt-16 h-10 rounded-lg bg-slate-100" />
                </div>
            ))}
        </div>
    );
}

function CvEmptyState({ onUpload }: { onUpload: () => void }) {
    return (
        <EmptyDataState
            title="Bạn chưa có CV nào"
            description="Tải lên CV đầu tiên để quản lý, phân tích và tối ưu cho cơ hội phù hợp."
            illustrationSrc="/images/cvs/cv-empty-state.png"
            illustrationAlt="Minh họa tải CV lên Interviewly"
            action={
                <Button
                    className="h-12 !rounded-lg px-7 text-base font-extrabold shadow-[0_10px_24px_rgba(109,60,220,0.24)]"
                    onClick={onUpload}
                >
                    <Upload className="size-5" aria-hidden="true" />
                    Tải CV lên
                </Button>
            }
            benefits={[
                {
                    icon: Sparkles,
                    title: 'Phân tích bằng AI',
                    description: 'Đánh giá và gợi ý cải thiện CV',
                },
                {
                    icon: GitCompareArrows,
                    title: 'So sánh phiên bản',
                    description: 'Tìm ra CV phù hợp nhất',
                },
                {
                    icon: SlidersHorizontal,
                    title: 'Theo dõi hiệu quả',
                    description: 'Xem lịch sử và kết quả phân tích',
                },
            ]}
        />
    );
}

function CvNoResults({ onReset }: { onReset: () => void }) {
    return (
        <DataState
            variant="no-results"
            size="compact"
            title="Không tìm thấy CV phù hợp"
            description="Hãy thử từ khóa hoặc trạng thái khác."
            illustrationTestId="cv-no-results-illustration"
            className="xl:min-h-0 xl:flex-1"
            action={
                <Button variant="outline" onClick={onReset}>
                    Xóa bộ lọc
                </Button>
            }
        />
    );
}

function CvListError({ onRetry }: { onRetry: () => void }) {
    return (
        <DataState
            variant="error"
            size="compact"
            title="Không thể tải danh sách CV"
            description="Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại."
            action={
                <Button variant="outline" onClick={onRetry}>
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Thử lại
                </Button>
            }
        />
    );
}
