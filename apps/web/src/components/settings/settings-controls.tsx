'use client';

import { Check, LoaderCircle } from 'lucide-react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SelectOption<T extends string> {
    value: T;
    label: string;
}

export function SettingsSelect<T extends string>({
    value,
    options,
    placeholder = 'Chưa thiết lập',
    label,
    disabled = true,
    loading = false,
    onValueChange,
}: {
    value: T | null;
    options: readonly SelectOption<T>[];
    placeholder?: string;
    label: string;
    disabled?: boolean;
    loading?: boolean;
    onValueChange?: (value: T) => void;
}) {
    return (
        <Select
            value={value ?? undefined}
            disabled={disabled || loading}
            onValueChange={onValueChange}
        >
            <SelectTrigger
                aria-label={label}
                aria-busy={loading}
                className="w-full bg-white disabled:opacity-100"
            >
                <SelectValue placeholder={placeholder} />
                {loading && (
                    <LoaderCircle
                        aria-hidden="true"
                        className="text-primary ml-auto size-4 animate-spin"
                    />
                )}
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function SettingsSegmentedControl<T extends string | number>({
    value,
    options,
    label,
    disabled = false,
    loading = false,
    onValueChange,
}: {
    value: T | null;
    options: readonly { value: T; label: string }[];
    label: string;
    disabled?: boolean;
    loading?: boolean;
    onValueChange: (value: T) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            aria-busy={loading}
            className="flex min-h-11 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1"
        >
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled || loading}
                        title={option.label}
                        onClick={() => onValueChange(option.value)}
                        className={cn(
                            'focus-visible:ring-primary/30 min-w-0 flex-1 cursor-pointer rounded-lg px-1.5 py-2 text-xs font-bold whitespace-nowrap transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none sm:px-2 sm:text-sm',
                            selected
                                ? 'text-primary bg-white shadow-[0_1px_5px_rgba(75,45,160,0.14)] ring-1 ring-violet-200'
                                : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
                            (disabled || loading) && 'cursor-not-allowed',
                        )}
                    >
                        <span className="block">{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export function SettingsCheckbox({
    checked,
    label,
    disabled = false,
    onCheckedChange,
}: {
    checked: boolean;
    label: string;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <label
            className={cn(
                'group flex min-w-0 cursor-pointer items-center gap-2.5 py-1.5 text-sm font-semibold text-slate-700',
                disabled && 'cursor-not-allowed',
            )}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onCheckedChange(event.target.checked)}
                className="peer sr-only"
            />
            <span
                aria-hidden="true"
                className="peer-focus-visible:ring-primary/30 peer-checked:border-primary peer-checked:bg-primary flex size-5 shrink-0 items-center justify-center rounded-[5px] border-2 border-slate-300 bg-white text-white transition-colors peer-focus-visible:ring-2 peer-disabled:opacity-60"
            >
                {checked && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span className="min-w-0 leading-5">{label}</span>
        </label>
    );
}

export function SettingsToggle({
    checked,
    label,
    descriptionId,
    disabled = true,
    loading = false,
    onCheckedChange,
}: {
    checked: boolean;
    label: string;
    descriptionId?: string;
    disabled?: boolean;
    loading?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            aria-describedby={descriptionId}
            aria-busy={loading}
            disabled={disabled || loading}
            onClick={() => onCheckedChange?.(!checked)}
            className={cn(
                'relative flex h-7 w-12 rounded-full border p-0.5 transition-colors',
                checked
                    ? 'bg-primary border-primary'
                    : 'border-slate-300 bg-slate-200',
                (disabled || loading) && 'cursor-not-allowed opacity-80',
            )}
        >
            <span
                className={cn(
                    'size-5 rounded-full bg-white shadow-sm transition-transform',
                    checked && 'translate-x-5',
                )}
            />
        </button>
    );
}

export function SettingsSlider({
    value,
    min,
    max,
    step,
    label,
    output,
    disabled = false,
    onValueChange,
    onValueCommit,
}: {
    value: number;
    min: number;
    max: number;
    step: number;
    label: string;
    output: string;
    disabled?: boolean;
    onValueChange: (value: number) => void;
    onValueCommit: () => void;
}) {
    const progress = ((value - min) / (max - min)) * 100;

    return (
        <div className="flex items-center gap-4">
            <input
                type="range"
                aria-label={label}
                aria-valuetext={output}
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(event) => onValueChange(Number(event.target.value))}
                onPointerUp={onValueCommit}
                onKeyUp={onValueCommit}
                className="focus-visible:ring-primary/25 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:bg-primary h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 outline-none focus-visible:ring-4 disabled:cursor-wait disabled:opacity-60 [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                style={{
                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${progress}%, rgb(226 232 240) ${progress}%, rgb(226 232 240) 100%)`,
                }}
            />
            <output className="text-primary flex h-9 min-w-14 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 px-2 text-sm font-extrabold">
                {output}
            </output>
        </div>
    );
}

export function ComingSoon() {
    return (
        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
            Sắp ra mắt
        </span>
    );
}

export function SelectedChip({
    selected,
    children,
}: {
    selected: boolean;
    children: React.ReactNode;
}) {
    return (
        <span
            className={cn(
                'inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold',
                selected
                    ? 'border-primary/25 bg-primary/6 text-primary'
                    : 'border-slate-200 bg-slate-50 text-slate-400',
            )}
        >
            <span
                className={cn(
                    'flex size-4 items-center justify-center rounded-[5px] border',
                    selected
                        ? 'bg-primary border-primary text-white'
                        : 'border-slate-300 bg-white',
                )}
            >
                {selected && <Check className="size-3" strokeWidth={3} />}
            </span>
            {children}
        </span>
    );
}
