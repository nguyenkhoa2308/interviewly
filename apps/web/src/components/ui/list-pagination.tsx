'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

type ListPaginationProps = {
    page: number;
    pageSize: number;
    total: number;
    itemLabel: string;
    onPageChange: (page: number) => void;
    totalPages?: number;
    pending?: boolean;
    compact?: boolean;
    ariaLabel?: string;
    className?: string;
    pageSizeOptions?: number[];
    onPageSizeChange?: (pageSize: number) => void;
};

function buildPaginationItems(
    totalPages: number,
    currentPage: number,
): PaginationItem[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
        return [1, 2, 3, 4, 'end-ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 2) {
        return [
            1,
            'start-ellipsis',
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [
        1,
        'start-ellipsis',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        'end-ellipsis',
        totalPages,
    ];
}

export function ListPagination({
    page,
    pageSize,
    total,
    itemLabel,
    onPageChange,
    totalPages = Math.ceil(total / pageSize),
    pending = false,
    compact = false,
    ariaLabel,
    className,
    pageSizeOptions,
    onPageSizeChange,
}: ListPaginationProps) {
    const safeTotalPages = Math.max(totalPages, total > 0 ? 1 : 0);
    const safePage = Math.min(Math.max(page, 1), safeTotalPages || 1);
    const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const rangeEnd = Math.min(safePage * pageSize, total);
    const items = buildPaginationItems(safeTotalPages, safePage);
    const paginationLabel = ariaLabel ?? `Phân trang ${itemLabel}`;

    return (
        <footer
            className={cn(
                'mt-auto flex shrink-0 flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between',
                compact && 'border-t border-slate-100 px-3 py-3',
                className,
            )}
            aria-label={paginationLabel}
        >
            <p
                className={cn(
                    'text-sm font-medium text-slate-500',
                    compact && 'text-xs',
                )}
                aria-live="polite"
            >
                Hiển thị{' '}
                <span className="font-bold text-slate-700 tabular-nums">
                    {rangeStart} - {rangeEnd}
                </span>{' '}
                trong {total} {itemLabel}
            </p>

            {(Boolean(pageSizeOptions?.length) || safeTotalPages > 1) && (
                <nav
                    className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto"
                    aria-label={paginationLabel}
                >
                    {pageSizeOptions?.length ? (
                        <div className="mr-2 flex items-center gap-2">
                            <span className="hidden text-sm font-semibold text-slate-600 lg:inline">
                                Số dòng mỗi trang:
                            </span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(value) =>
                                    onPageSizeChange?.(Number(value))
                                }
                            >
                                <SelectTrigger
                                    className="h-9 w-20 rounded-lg bg-white"
                                    aria-label="Số dòng mỗi trang"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizeOptions.map((option) => (
                                        <SelectItem
                                            key={option}
                                            value={String(option)}
                                        >
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}
                    {safeTotalPages > 1 ? (
                        <>
                            <span className="sr-only">
                                {safePage}/{safeTotalPages}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className={cn(
                                    'size-9 rounded-lg',
                                    compact && 'size-8',
                                )}
                                disabled={pending || safePage <= 1}
                                onClick={() => onPageChange(safePage - 1)}
                                aria-label="Trước"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>

                            {items.map((item) =>
                                typeof item === 'number' ? (
                                    <Button
                                        key={item}
                                        type="button"
                                        variant={
                                            item === safePage
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="icon"
                                        className={cn(
                                            'size-9 rounded-lg font-bold tabular-nums transition-none',
                                            compact && 'size-8 text-xs',
                                        )}
                                        disabled={pending}
                                        onClick={() => onPageChange(item)}
                                        aria-label={`Trang ${item}`}
                                        aria-current={
                                            item === safePage
                                                ? 'page'
                                                : undefined
                                        }
                                    >
                                        {item}
                                    </Button>
                                ) : (
                                    <span
                                        key={item}
                                        className="grid size-7 place-items-center text-sm font-bold text-slate-400"
                                        aria-hidden="true"
                                    >
                                        …
                                    </span>
                                ),
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className={cn(
                                    'size-9 rounded-lg',
                                    compact && 'size-8',
                                )}
                                disabled={pending || safePage >= safeTotalPages}
                                onClick={() => onPageChange(safePage + 1)}
                                aria-label="Sau"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </>
                    ) : null}
                </nav>
            )}
        </footer>
    );
}
