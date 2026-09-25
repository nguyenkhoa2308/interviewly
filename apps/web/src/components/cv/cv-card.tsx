'use client';

import { ArrowRight, CalendarDays, Check, RefreshCw, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { CvActionsMenu } from '@/components/cv/cv-actions-menu';
import { CvStatusBadge } from '@/components/cv/cv-status-badge';
import { formatCvDate, formatFileSize } from '@/lib/cv-formatters';
import type { CvListItem } from '@/types/cv';

interface CvCardProps {
    cv: CvListItem;
    actionPending: boolean;
    onRename: (cv: CvListItem) => void;
    onSetDefault: (cv: CvListItem) => void;
    onDelete: (cv: CvListItem) => void;
    onRetryUpload: (cv: CvListItem) => void;
    selectionMode?: boolean;
    selected?: boolean;
    onToggleSelection?: (cv: CvListItem) => void;
}

export function CvCard({
    cv,
    actionPending,
    onRename,
    onSetDefault,
    onDelete,
    onRetryUpload,
    selectionMode = false,
    selected = false,
    onToggleSelection,
}: CvCardProps) {
    return (
        <article
            className={
                'group relative isolate flex min-h-72 min-w-0 cursor-pointer flex-col rounded-2xl bg-white p-5 shadow-[0_8px_26px_rgba(55,44,108,0.05)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_16px_38px_rgba(70,48,150,0.085)] ' +
                (selected
                    ? 'border-2 border-violet-500 ring-4 ring-violet-100'
                    : 'border border-violet-100/90 hover:border-violet-200')
            }
        >
            {selectionMode ? (
                <button
                    type="button"
                    aria-label={`${selected ? 'Bỏ chọn' : 'Chọn'} ${cv.name} để so sánh`}
                    aria-pressed={selected}
                    className="focus-visible:ring-primary/35 absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-3"
                    onClick={() => onToggleSelection?.(cv)}
                />
            ) : (
                <Link
                    href={`/cv/${cv.id}`}
                    aria-label={`Xem chi tiết ${cv.name}`}
                    className="focus-visible:ring-primary/35 absolute inset-0 z-10 rounded-2xl outline-none focus-visible:ring-3"
                />
            )}
            {selectionMode && (
                <span
                    className={
                        'absolute top-3 left-3 z-20 flex size-6 items-center justify-center rounded-full border-2 transition-colors ' +
                        (selected
                            ? 'border-violet-600 bg-violet-600 text-white'
                            : 'border-slate-300 bg-white text-transparent')
                    }
                >
                    <Check className="size-3.5" strokeWidth={3} />
                </span>
            )}
            <div className="flex items-start justify-between gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
                    <Image
                        src="/icons/pdf-file.svg"
                        alt=""
                        width={34}
                        height={34}
                        aria-hidden="true"
                    />
                </span>
                <div className="flex min-w-0 items-center gap-2">
                    <CvStatusBadge status={cv.processingStatus} />
                    <div className="relative z-20">
                        <CvActionsMenu
                            cv={cv}
                            actionPending={actionPending}
                            showView={false}
                            onRename={onRename}
                            onSetDefault={onSetDefault}
                            onDelete={onDelete}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-5 min-w-0">
                <h2
                    className="truncate text-lg font-extrabold tracking-[-0.015em] text-slate-950"
                    title={cv.name}
                >
                    {cv.name}
                </h2>
                <p
                    className="mt-1 truncate text-sm font-medium text-slate-500"
                    title={cv.originalFilename}
                >
                    {cv.originalFilename}
                </p>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div className="min-w-0">
                    <dt className="text-xs font-semibold text-slate-400">
                        Ngày tải lên
                    </dt>
                    <dd className="mt-1.5 flex items-center gap-2 font-bold text-slate-700">
                        <CalendarDays
                            className="text-primary size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <time dateTime={cv.createdAt}>
                            {formatCvDate(cv.createdAt)}
                        </time>
                    </dd>
                </div>
                <div className="min-w-0">
                    <dt className="text-xs font-semibold text-slate-400">
                        Dung lượng
                    </dt>
                    <dd className="mt-1.5 font-bold text-slate-700">
                        {formatFileSize(cv.fileSize)}
                    </dd>
                </div>
            </dl>

            <div className="mt-auto pt-5">
                <div className="mb-3 min-h-7">
                    {cv.isDefault ? (
                        <span className="text-primary bg-primary/8 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-extrabold">
                            <Star
                                className="size-3.5 fill-current"
                                aria-hidden="true"
                            />
                            Mặc định
                        </span>
                    ) : (
                        <span />
                    )}
                </div>
                {cv.processingStatus === 'FAILED' ? (
                    <button
                        type="button"
                        className="relative z-20 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
                        onClick={() => onRetryUpload(cv)}
                    >
                        <RefreshCw className="size-4" aria-hidden="true" />
                        Tải lại tệp
                    </button>
                ) : (
                    <div className="text-primary flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 text-sm font-bold transition-colors group-hover:bg-violet-50/70">
                        Xem chi tiết
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </div>
                )}
            </div>
        </article>
    );
}
