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
import type { JobDescriptionListItem } from '@/types/job-description';

interface JobDescriptionCardProps {
    item: JobDescriptionListItem;
    onDelete: (item: JobDescriptionListItem) => void;
    onQuickView: (item: JobDescriptionListItem) => void;
}

function formatUpdatedDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

function formatContentPreview(content: string) {
    return content
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]*[•●▪◦][ \t]*/g, '\n• ')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(' ');
}

export function JobDescriptionCard({
    item,
    onDelete,
    onQuickView,
}: JobDescriptionCardProps) {
    const analysis = item.analyses[0];
    const status = analysis?.status;
    const statusView =
        status === 'COMPLETED'
            ? {
                  label: 'Đã phân tích',
                  icon: CheckCircle2,
                  className:
                      'border-emerald-100 bg-emerald-50 text-emerald-700',
              }
            : status === 'FAILED'
              ? {
                    label: 'Thất bại',
                    icon: CircleAlert,
                    className: 'border-rose-100 bg-rose-50 text-rose-700',
                }
              : status === 'PROCESSING'
                ? {
                      label: 'Đang phân tích',
                      icon: Clock3,
                      className: 'border-sky-100 bg-sky-50 text-sky-700',
                  }
                : {
                      label: 'Chưa phân tích',
                      icon: Clock3,
                      className: 'border-amber-100 bg-amber-50 text-amber-700',
                  };
    const StatusIcon = statusView.icon;
    const skills = Array.from(
        new Set([
            ...(analysis?.requiredSkills ?? []),
            ...(analysis?.preferredSkills ?? []),
        ]),
    );
    const visibleSkills = skills.slice(0, 3);
    const hiddenSkillCount = Math.max(0, skills.length - visibleSkills.length);
    const summary =
        analysis?.summary?.trim() || formatContentPreview(item.content);

    return (
        <article className="group flex min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white p-5 shadow-[0_10px_32px_rgba(67,45,135,0.07)] transition-[border-color,box-shadow] duration-200 hover:border-violet-300 hover:shadow-[0_14px_38px_rgba(67,45,135,0.11)]">
            <header className="flex min-w-0 items-start gap-3.5">
                <div className="text-primary flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/80 ring-1 ring-violet-100">
                    <Building2
                        className="size-6"
                        strokeWidth={2.25}
                        aria-hidden="true"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[1.05rem] leading-6 font-extrabold text-slate-950">
                        {item.title}
                    </h2>
                    <p className="mt-0.5 truncate text-sm leading-5 font-medium text-slate-500">
                        {item.company || 'Chưa có tên công ty'}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    <span
                        className={`${statusView.className} inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-nowrap`}
                    >
                        <StatusIcon
                            className="size-3.5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        {statusView.label}
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="hover:text-primary size-8 rounded-lg text-slate-500 hover:bg-violet-50"
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
            </header>

            <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
                {summary}
            </p>

            <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2">
                {visibleSkills.length > 0 ? (
                    <>
                        {visibleSkills.map((skill) => (
                            <span
                                key={skill}
                                className="text-primary max-w-36 truncate rounded-full bg-violet-50 px-3 py-1 text-xs font-bold"
                            >
                                {skill}
                            </span>
                        ))}
                        {hiddenSkillCount > 0 && (
                            <span className="text-primary rounded-full bg-violet-50 px-3 py-1 text-xs font-bold">
                                +{hiddenSkillCount}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="text-xs font-medium text-slate-400">
                        Chưa nhận diện kỹ năng
                    </span>
                )}
            </div>

            <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
                <span className="mr-auto flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-500 sm:text-sm">
                    <CalendarDays
                        className="size-4 shrink-0 text-slate-500"
                        aria-hidden="true"
                    />
                    <span className="truncate">
                        Cập nhật {formatUpdatedDate(item.updatedAt)}
                    </span>
                </span>

                <Button
                    type="button"
                    variant="outline"
                    className="text-primary hover:text-primary h-10 rounded-lg border-violet-200 bg-violet-50/70 px-3.5 text-sm font-bold shadow-none hover:border-violet-300 hover:bg-violet-100"
                    onClick={() => onQuickView(item)}
                    aria-label={`Xem nhanh ${item.title}`}
                >
                    <Eye className="size-4" aria-hidden="true" />
                    Xem nhanh
                </Button>
                <Button
                    asChild
                    type="button"
                    className="h-10 rounded-lg px-4.5 text-sm font-bold shadow-[0_7px_18px_rgba(109,60,220,0.22)]"
                >
                    <Link
                        href={`/job-descriptions/${item.id}`}
                        aria-label={`Mở ${item.title}`}
                    >
                        Chi tiết
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </Button>
            </footer>
        </article>
    );
}
