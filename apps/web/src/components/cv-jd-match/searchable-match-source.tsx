'use client';

import { Popover as PopoverPrimitive } from 'radix-ui';
import {
    BriefcaseBusiness,
    Check,
    ChevronDown,
    FileText,
    Search,
} from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import type { MatchOptions } from '@/types/cv-jd-match';

type CvOption = MatchOptions['cvs'][number];
type JdOption = MatchOptions['jobDescriptions'][number];

export function SearchableMatchSource({
    kind,
    title,
    value,
    items,
    selected,
    onChange,
}: {
    kind: 'cv' | 'jd';
    title: string;
    value: string;
    items: Array<CvOption | JdOption>;
    selected?: CvOption | JdOption;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const isCv = kind === 'cv';
    const query = normalize(search.trim());
    const visibleItems = [...items]
        .sort(
            (left, right) =>
                Number(right.eligible) - Number(left.eligible) ||
                new Date(right.updatedAt).getTime() -
                    new Date(left.updatedAt).getTime(),
        )
        .filter((item) => {
            if (!query) return true;
            const label = isCv
                ? (item as CvOption).name +
                  ' ' +
                  (item as CvOption).originalFilename
                : (item as JdOption).title +
                  ' ' +
                  ((item as JdOption).company ?? '');
            return normalize(label).includes(query);
        });

    return (
        <PopoverPrimitive.Root
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setSearch('');
            }}
        >
            <PopoverPrimitive.Trigger asChild>
                <button
                    type="button"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={`matching-${kind}-source-options`}
                    aria-label={title}
                    className="focus:border-primary focus:ring-primary/15 mt-5 flex min-h-[72px] w-full items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50 focus:ring-3 focus:outline-none"
                >
                    {selected ? (
                        <SourceValue item={selected} kind={kind} />
                    ) : (
                        <span className="flex min-w-0 flex-1 items-center gap-3 text-sm font-semibold text-slate-500">
                            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                                {isCv ? (
                                    <FileText className="size-5" />
                                ) : (
                                    <BriefcaseBusiness className="size-5" />
                                )}
                            </span>
                            Chọn {isCv ? 'một CV' : 'một JD'}
                        </span>
                    )}
                    <ChevronDown className="ml-3 size-4 shrink-0 text-slate-400" />
                </button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    align="start"
                    sideOffset={6}
                    className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_45px_rgba(31,24,56,0.14)] outline-none"
                >
                    <div className="focus-within:border-primary focus-within:ring-primary/10 mb-1.5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:ring-3">
                        <Search className="size-4 shrink-0 text-slate-400" />
                        <input
                            autoFocus
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={
                                isCv
                                    ? 'Tìm theo tên CV hoặc tên tệp...'
                                    : 'Tìm theo vị trí hoặc công ty...'
                            }
                            aria-label={isCv ? 'Tìm CV' : 'Tìm JD'}
                            className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                        />
                    </div>
                    <div
                        id={`matching-${kind}-source-options`}
                        role="listbox"
                        aria-label={title}
                        className="max-h-72 overflow-y-auto overscroll-contain"
                    >
                        {visibleItems.length ? (
                            visibleItems.map((item) => (
                                <SourceOption
                                    key={item.id}
                                    item={item}
                                    kind={kind}
                                    selected={item.id === value}
                                    onSelect={() => {
                                        onChange(item.id);
                                        setOpen(false);
                                    }}
                                />
                            ))
                        ) : (
                            <p className="px-3 py-7 text-center text-sm font-medium text-slate-500">
                                Không tìm thấy kết quả phù hợp.
                            </p>
                        )}
                    </div>
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}

function SourceOption({
    item,
    kind,
    selected,
    onSelect,
}: {
    item: CvOption | JdOption;
    kind: 'cv' | 'jd';
    selected: boolean;
    onSelect: () => void;
}) {
    const isCv = kind === 'cv';
    const title = isCv
        ? (item as CvOption).name
        : (item as JdOption).title;
    const subtitle = isCv
        ? (item as CvOption).originalFilename
        : (item as JdOption).company || 'Chưa có công ty';

    return (
        <button
            type="button"
            role="option"
            aria-selected={selected}
            disabled={!item.eligible}
            onClick={onSelect}
            className={cn(
                'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                selected ? 'bg-violet-50' : 'hover:bg-slate-50',
                !item.eligible && 'cursor-not-allowed opacity-55',
            )}
        >
            <span
                className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                    item.eligible
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600',
                )}
            >
                {isCv ? (
                    <FileText className="size-4" />
                ) : (
                    <BriefcaseBusiness className="size-4" />
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">
                    {title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {subtitle}
                </span>
                {!item.eligible && item.reason && (
                    <span className="mt-1 block text-xs font-semibold text-amber-700">
                        {item.reason}
                    </span>
                )}
            </span>
            {selected && (
                <Check className="text-primary mt-1 size-4 shrink-0 stroke-[3]" />
            )}
        </button>
    );
}

function SourceValue({
    item,
    kind,
}: {
    item: CvOption | JdOption;
    kind: 'cv' | 'jd';
}) {
    const isCv = kind === 'cv';
    const Icon = isCv ? FileText : BriefcaseBusiness;
    const title = isCv
        ? (item as CvOption).name
        : (item as JdOption).title;
    const subtitle = isCv
        ? 'Cập nhật ' + formatDate(item.updatedAt)
        : ((item as JdOption).company || 'Chưa có công ty') +
          ' · Cập nhật ' +
          formatDate(item.updatedAt);

    return (
        <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold text-slate-900">
                    {title}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                    {subtitle}
                </span>
            </span>
            <span
                className={cn(
                    'hidden shrink-0 rounded-md px-2.5 py-1 text-xs font-bold sm:inline-flex',
                    item.eligible
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700',
                )}
            >
                {item.eligible
                    ? isCv
                        ? 'Sẵn sàng'
                        : 'Đã phân tích'
                    : 'Cần phân tích'}
            </span>
        </span>
    );
}

function normalize(text: string) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('vi');
}

function formatDate(value?: string) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
        ? new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
          }).format(date)
        : 'Chưa cập nhật';
}
