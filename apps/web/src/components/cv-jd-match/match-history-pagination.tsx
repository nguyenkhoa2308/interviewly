'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

type MatchHistoryPaginationProps = {
    page: number;
    total: number;
    totalPages: number;
    pending: boolean;
    onPageChange: (page: number) => void;
};

export function MatchHistoryPagination({
    page,
    total,
    totalPages,
    pending,
    onPageChange,
}: MatchHistoryPaginationProps) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-violet-100 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-slate-500">
                {total} lần đối chiếu
            </p>
            <div className="flex items-center gap-2">
                <span className="mr-1 text-sm font-semibold text-slate-500">
                    Trang {page} / {totalPages}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Trang lịch sử trước"
                    disabled={pending || page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="size-4" />
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Trang lịch sử tiếp theo"
                    disabled={pending || page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
