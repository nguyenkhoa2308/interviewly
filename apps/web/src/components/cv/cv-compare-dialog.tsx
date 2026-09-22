'use client';

import { ArrowRight, GitCompareArrows } from 'lucide-react';

import { CvComparisonResult } from '@/components/cv/cv-version-comparison';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useCvComparison } from '@/hooks/cv';
import type { CvListItem, CvVersionComparison } from '@/types/cv';

export function CvCompareDialog({
    selected,
    open,
    onOpenChange,
}: {
    selected: [CvListItem, CvListItem] | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const query = useCvComparison(
        open ? selected?.[0].id : undefined,
        open ? selected?.[1].id : undefined,
    );
    const normalized: CvVersionComparison | null = query.data
        ? {
              from: {
                  id: query.data.left.id,
                  versionNumber: 0,
                  originalFilename: query.data.left.name,
                  createdAt: '',
                  analysis: query.data.left.analysis,
              },
              to: {
                  id: query.data.right.id,
                  versionNumber: 0,
                  originalFilename: query.data.right.name,
                  createdAt: '',
                  analysis: query.data.right.analysis,
              },
              comparison: query.data.comparison,
          }
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitCompareArrows className="text-primary size-5" />
                        So sánh hai CV
                    </DialogTitle>
                    <DialogDescription>
                        So sánh kết quả AI của phiên bản hiện hành trên mỗi CV.
                    </DialogDescription>
                </DialogHeader>
                {selected && (
                    <div className="mt-5 grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                        <CvName name={selected[0].name} />
                        <ArrowRight className="text-primary mx-auto hidden size-4 sm:block" />
                        <CvName name={selected[1].name} />
                    </div>
                )}
                {query.isPending ? (
                    <div className="mt-4 h-48 animate-pulse rounded-2xl bg-slate-100" />
                ) : query.isError ? (
                    <Button
                        variant="outline"
                        className="mt-4 w-full"
                        onClick={() => void query.refetch()}
                    >
                        Không thể tải so sánh · Thử lại
                    </Button>
                ) : normalized?.comparison ? (
                    <CvComparisonResult data={normalized} />
                ) : normalized ? (
                    <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                        Một trong hai CV chưa có kết quả phân tích. Hãy phân
                        tích cả hai CV trước khi so sánh.
                    </p>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function CvName({ name }: { name: string }) {
    return (
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-center text-sm font-extrabold text-slate-900">
            {name}
        </div>
    );
}
