'use client';

import Link from 'next/link';
import {
    ArrowRight,
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Eye,
    MoreVertical,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { JobDescriptionListItem } from '@/types/job-description';

interface JobDescriptionListViewProps {
    items: JobDescriptionListItem[];
    pending: boolean;
    onDelete: (item: JobDescriptionListItem) => void;
    onQuickView: (item: JobDescriptionListItem) => void;
}

function formatUpdatedDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function getStatus(item: JobDescriptionListItem) {
    const status = item.analyses[0]?.status;

    if (status === 'COMPLETED') {
        return {
            label: 'Đã phân tích',
            icon: CheckCircle2,
            className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        };
    }
    if (status === 'FAILED') {
        return {
            label: 'Thất bại',
            icon: CircleAlert,
            className: 'border-rose-100 bg-rose-50 text-rose-700',
        };
    }
    if (status === 'PROCESSING') {
        return {
            label: 'Đang phân tích',
            icon: Clock3,
            className: 'border-sky-100 bg-sky-50 text-sky-700',
        };
    }
    return {
        label: 'Chưa phân tích',
        icon: Clock3,
        className: 'border-amber-100 bg-amber-50 text-amber-700',
    };
}

function getSkills(item: JobDescriptionListItem) {
    const analysis = item.analyses[0];
    return Array.from(
        new Set([
            ...(analysis?.requiredSkills ?? []),
            ...(analysis?.preferredSkills ?? []),
        ]),
    );
}

export function JobDescriptionListView({
    items,
    pending,
    onDelete,
    onQuickView,
}: JobDescriptionListViewProps) {
    return (
        <div
            className={cn(
                'overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_10px_32px_rgba(67,45,135,0.07)] transition-opacity',
                pending && 'opacity-65',
            )}
            aria-busy={pending}
        >
            <div className="hidden grid-cols-[minmax(250px,1.3fr)_minmax(260px,1fr)_160px_140px_132px] items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-xs font-extrabold tracking-wide text-slate-500 uppercase xl:grid">
                <span>Mô tả công việc</span>
                <span>Công nghệ / Kỹ năng</span>
                <span>Trạng thái</span>
                <span>Cập nhật</span>
                <span className="text-right">Hành động</span>
            </div>

            <div className="divide-y divide-slate-200/80">
                {items.map((item) => {
                    const status = getStatus(item);
                    const StatusIcon = status.icon;
                    const skills = getSkills(item);
                    const visibleSkills = skills.slice(0, 3);
                    const hiddenSkills = Math.max(0, skills.length - 3);

                    return (
                        <article
                            key={item.id}
                            className="grid gap-4 px-4 py-4 transition-colors hover:bg-violet-50/35 sm:px-5 xl:grid-cols-[minmax(250px,1.3fr)_minmax(260px,1fr)_160px_140px_132px] xl:items-center"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="text-primary flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 ring-1 ring-violet-100">
                                    <Building2
                                        className="size-5.5"
                                        strokeWidth={2.25}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="truncate text-base font-extrabold text-slate-950">
                                        {item.title}
                                    </h2>
                                    <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                                        {item.company || 'Chưa có tên công ty'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex min-w-0 flex-wrap gap-1.5">
                                {visibleSkills.length ? (
                                    <>
                                        {visibleSkills.map((skill) => (
                                            <span
                                                key={skill}
                                                className="text-primary max-w-32 truncate rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {hiddenSkills > 0 && (
                                            <span className="text-primary rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold">
                                                +{hiddenSkills}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-xs font-medium text-slate-400">
                                        Chưa nhận diện kỹ năng
                                    </span>
                                )}
                            </div>

                            <div>
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap',
                                        status.className,
                                    )}
                                >
                                    <StatusIcon
                                        className="size-3.5"
                                        strokeWidth={2.5}
                                    />
                                    {status.label}
                                </span>
                            </div>

                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                <CalendarDays className="size-4 text-slate-500" />
                                {formatUpdatedDate(item.updatedAt)}
                            </span>

                            <div className="flex items-center justify-end gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="hover:text-primary size-9 rounded-lg text-slate-500 hover:bg-violet-100"
                                    onClick={() => onQuickView(item)}
                                    aria-label={`Xem nhanh ${item.title}`}
                                >
                                    <Eye className="size-4.5" />
                                </Button>
                                <Button
                                    asChild
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="hover:text-primary size-9 rounded-lg text-slate-500 hover:bg-violet-100"
                                >
                                    <Link
                                        href={`/job-descriptions/${item.id}`}
                                        aria-label={`Mở chi tiết ${item.title}`}
                                    >
                                        <ArrowRight className="size-4.5" />
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-9 rounded-lg text-slate-500 hover:bg-slate-100"
                                            aria-label={`Mở thao tác cho ${item.title}`}
                                        >
                                            <MoreVertical className="size-4.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                            onSelect={() => onDelete(item)}
                                        >
                                            <Trash2 className="size-4" />
                                            Xóa JD
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
