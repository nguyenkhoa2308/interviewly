import { Check, CircleAlert, Clock3 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { CvProcessingStatus } from '@/types/cv';

const statusConfig: Record<
    CvProcessingStatus,
    { label: string; icon: typeof Check; className: string }
> = {
    UPLOADING: {
        label: 'Đang tải lên',
        icon: Clock3,
        className: 'bg-sky-50 text-sky-700 ring-sky-200',
    },
    PROCESSING: {
        label: 'Đang xử lý',
        icon: Clock3,
        className: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
    READY: {
        label: 'Sẵn sàng',
        icon: Check,
        className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    FAILED: {
        label: 'Xử lý thất bại',
        icon: CircleAlert,
        className: 'bg-red-50 text-red-700 ring-red-200',
    },
};

export function CvStatusBadge({
    status,
    className,
}: {
    status: CvProcessingStatus;
    className?: string;
}) {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <span
            role="status"
            className={cn(
                'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-2 text-[13px] font-bold',
                config.className,
                className,
            )}
        >
            <Icon className="size-3.5" aria-hidden="true" strokeWidth={3} />
            {config.label}
        </span>
    );
}
