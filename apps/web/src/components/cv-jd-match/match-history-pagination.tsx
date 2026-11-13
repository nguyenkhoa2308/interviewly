'use client';

import { ListPagination } from '@/components/ui/list-pagination';

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
        <ListPagination
            page={page}
            pageSize={5}
            total={total}
            totalPages={totalPages}
            itemLabel="lần đối chiếu"
            pending={pending}
            compact
            onPageChange={onPageChange}
            className="mb-4 rounded-xl border border-violet-100 bg-white"
        />
    );
}
