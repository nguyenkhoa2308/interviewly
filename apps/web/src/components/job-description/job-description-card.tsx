'use client';

import Link from 'next/link';
import {
    ArrowRight,
    Building2,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    Clock3,
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
import type { JobDescriptionListItem } from '@/types/job-description';

interface JobDescriptionCardProps {
    item: JobDescriptionListItem;
    onDelete: (item: JobDescriptionListItem) => void;
}

function formatRelativeDate(value: string) {
    const days = Math.max(
        0,
        Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000),
    );
    if (days === 0) return 'Cập nhật hôm nay';
    if (days === 1) return 'Cập nhật hôm qua';
    if (days < 7) return `Cập nhật ${days} ngày trước`;
    return `Cập nhật ${new Intl.DateTimeFormat('vi-VN').format(new Date(value))}`;
}

function formatContentPreview(content: string) {
    return content
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]*[•●▪◦][ \t]*/g, '\n• ')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4)
        .join('\n');
}

export function JobDescriptionCard({
    item,
    onDelete,
}: JobDescriptionCardProps) {
    const status = item.analyses[0]?.status;
    const statusView =
        status === 'COMPLETED'
            ? {
                  label: 'Đã phân tích',
                  icon: CheckCircle2,
                  className: 'bg-emerald-50 text-emerald-700',
              }
            : status === 'FAILED'
              ? {
                    label: 'Phân tích thất bại',
                    icon: CircleAlert,
                    className: 'bg-rose-50 text-rose-700',
                }
              : status === 'PROCESSING'
                ? {
                      label: 'Đang phân tích',
                      icon: Clock3,
                      className: 'bg-amber-50 text-amber-700',
                  }
                : {
                      label: 'Chưa phân tích',
                      icon: Clock3,
                      className: 'bg-slate-100 text-slate-600',
                  };
    const StatusIcon = statusView.icon;

    return (
        <article className="group relative flex min-h-52 flex-col rounded-xl border border-slate-200 bg-white p-5 transition-colors duration-200 hover:border-violet-300">
            <Link
                href={`/job-descriptions/${item.id}`}
                className="focus-visible:ring-primary/35 absolute inset-0 z-10 rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`Mở ${item.title}`}
            />

            <div className="flex items-start gap-4">
                <div className="text-primary flex size-12 shrink-0 items-center justify-center rounded-lg border border-violet-100 bg-violet-50">
                    <Building2 className="size-6" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="group-hover:text-primary truncate text-lg font-extrabold text-slate-950 transition-colors">
                                {item.title}
                            </h2>
                            <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">
                                {item.company || 'Chưa có tên công ty'}
                            </p>
                        </div>
                        <div className="relative z-20 flex shrink-0 items-center gap-2">
                            <span
                                className={`${statusView.className} hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold sm:flex`}
                            >
                                <StatusIcon className="size-3.5" />
                                {statusView.label}
                            </span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-9 text-slate-500"
                                        aria-label={`Mở thao tác cho ${item.title}`}
                                    >
                                        <MoreVertical className="size-4" />
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
                    </div>
                    <span
                        className={`${statusView.className} mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold sm:hidden`}
                    >
                        <StatusIcon className="size-3.5" />
                        {statusView.label}
                    </span>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 whitespace-pre-line text-slate-600">
                        {formatContentPreview(item.content)}
                    </p>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <CalendarDays className="size-4 text-slate-500" />
                    {formatRelativeDate(item.updatedAt)}
                </span>
                <span className="text-primary flex items-center gap-2 px-1 py-2 text-sm font-bold">
                    Xem chi tiết
                    <ArrowRight className="size-4" />
                </span>
            </div>
        </article>
    );
}
