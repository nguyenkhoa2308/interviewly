'use client';

import {
    Check,
    ChevronDown,
    Clock3,
    Globe2,
    Languages,
    LoaderCircle,
    Monitor,
    Moon,
    Palette,
    Search,
    Sun,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { toast } from 'sonner';
import { getCountryForTimezone } from 'countries-and-timezones';

import { SettingsSelect } from '@/components/settings/settings-controls';
import { SettingsRow } from '@/components/settings/settings-row';
import { SettingsSection } from '@/components/settings/settings-section';
import { useUpdateSettings } from '@/hooks/settings';
import { cn } from '@/lib/utils';
import type {
    GeneralSettings as GeneralSettingsData,
    Language,
    Theme,
} from '@/types/settings';

const languageOptions = [
    { value: 'VI', label: '🇻🇳  Tiếng Việt' },
    { value: 'EN', label: '🇬🇧  English' },
] as const;

const timezoneDefinitions = [
    { value: 'Asia/Ho_Chi_Minh', flag: '🇻🇳', city: 'Hồ Chí Minh' },
    { value: 'Asia/Bangkok', flag: '🇹🇭', city: 'Bangkok' },
    { value: 'Asia/Singapore', flag: '🇸🇬', city: 'Singapore' },
    { value: 'Asia/Tokyo', flag: '🇯🇵', city: 'Tokyo' },
    { value: 'Asia/Seoul', flag: '🇰🇷', city: 'Seoul' },
    { value: 'Asia/Shanghai', flag: '🇨🇳', city: 'Thượng Hải' },
    { value: 'Asia/Kolkata', flag: '🇮🇳', city: 'Kolkata' },
    { value: 'Asia/Dubai', flag: '🇦🇪', city: 'Dubai' },
    { value: 'Europe/London', flag: '🇬🇧', city: 'London' },
    { value: 'Europe/Paris', flag: '🇫🇷', city: 'Paris' },
    { value: 'America/New_York', flag: '🇺🇸', city: 'New York' },
    { value: 'America/Los_Angeles', flag: '🇺🇸', city: 'Los Angeles' },
    { value: 'Australia/Sydney', flag: '🇦🇺', city: 'Sydney' },
] as const;

function getUtcOffset(timezone: string) {
    try {
        const offset = new Intl.DateTimeFormat('vi-VN', {
            timeZone: timezone,
            timeZoneName: 'shortOffset',
        })
            .formatToParts(new Date())
            .find((part) => part.type === 'timeZoneName')?.value;

        return offset?.replace('GMT', 'UTC') ?? 'UTC';
    } catch {
        return 'UTC';
    }
}

interface TimezoneOption {
    value: string;
    city: string;
    countryCode: string;
    offset: string;
}

const timezoneMetadata = new Map<string, { city: string; flag: string }>(
    timezoneDefinitions.map(({ value, city, flag }) => [value, { city, flag }]),
);
const featuredTimezoneValues = new Set<string>(
    timezoneDefinitions.map(({ value }) => value),
);

function getSupportedTimezoneOptions(): TimezoneOption[] {
    const intl = Intl as typeof Intl & {
        supportedValuesOf?: (key: 'timeZone') => string[];
    };
    const runtimeValues = intl.supportedValuesOf?.('timeZone') ?? [];
    const values = Array.from(
        new Set([
            ...timezoneDefinitions.map(({ value }) => value),
            ...runtimeValues,
        ]),
    );

    return values
        .map((value) => {
            const metadata = timezoneMetadata.get(value);
            return {
                value,
                city:
                    metadata?.city ??
                    value.split('/').at(-1)?.replaceAll('_', ' ') ??
                    value,
                countryCode:
                    getCountryForTimezone(value)?.id ??
                    flagToCountryCode(metadata?.flag) ??
                    'TZ',
                offset: getUtcOffset(value),
            };
        })
        .sort((left, right) => {
            const leftFeatured = timezoneMetadata.has(left.value);
            const rightFeatured = timezoneMetadata.has(right.value);
            if (leftFeatured !== rightFeatured) return leftFeatured ? -1 : 1;
            return left.city.localeCompare(right.city, 'vi');
        });
}

const supportedTimezoneOptions = getSupportedTimezoneOptions();

export function GeneralSettings({ data }: { data: GeneralSettingsData }) {
    const updateSettings = useUpdateSettings();
    const [pendingValues, setPendingValues] = useState<
        Partial<GeneralSettingsData>
    >({});
    const updateQueueRef = useRef(Promise.resolve());

    const isPending = (field: keyof GeneralSettingsData) =>
        Object.prototype.hasOwnProperty.call(pendingValues, field);

    const updateGeneral = async <K extends keyof GeneralSettingsData>(
        field: K,
        value: GeneralSettingsData[K],
    ) => {
        if (isPending(field)) return;

        setPendingValues((current) => ({ ...current, [field]: value }));

        try {
            updateQueueRef.current = updateQueueRef.current
                .catch(() => undefined)
                .then(async () => {
                    await updateSettings.mutateAsync({
                        general: { [field]: value },
                    });
                });
            await updateQueueRef.current;
        } catch {
            toast.error('Không thể lưu cài đặt chung', {
                description:
                    'Thay đổi chưa được lưu. Vui lòng kiểm tra kết nối và thử lại.',
            });
        } finally {
            setPendingValues((current) => {
                const next = { ...current };
                delete next[field];
                return next;
            });
        }
    };

    const language = pendingValues.preferredLanguage ?? data.preferredLanguage;
    const theme = pendingValues.theme ?? data.theme;
    const timezone =
        pendingValues.timezone !== undefined
            ? pendingValues.timezone
            : data.timezone;
    const timezoneOptions = useMemo(() => {
        if (
            !timezone ||
            supportedTimezoneOptions.some((item) => item.value === timezone)
        ) {
            return supportedTimezoneOptions;
        }

        return [
            {
                value: timezone,
                city:
                    timezone.split('/').at(-1)?.replaceAll('_', ' ') ??
                    timezone,
                countryCode: getCountryForTimezone(timezone)?.id ?? 'TZ',
                offset: getUtcOffset(timezone),
            },
            ...supportedTimezoneOptions,
        ];
    }, [timezone]);

    return (
        <SettingsSection
            title="Cài đặt chung"
            description="Điều chỉnh ngôn ngữ, giao diện và múi giờ của bạn."
            icon={Globe2}
        >
            <SettingsRow
                label="Ngôn ngữ"
                description="Ngôn ngữ hiển thị trên toàn bộ Interviewly."
                icon={Languages}
            >
                <SettingsSelect
                    label="Ngôn ngữ"
                    value={language}
                    options={languageOptions}
                    disabled={isPending('preferredLanguage')}
                    loading={isPending('preferredLanguage')}
                    onValueChange={(value) =>
                        void updateGeneral(
                            'preferredLanguage',
                            value as Language,
                        )
                    }
                />
            </SettingsRow>

            <SettingsRow
                label="Giao diện"
                description="Chọn sắc thái phù hợp với không gian làm việc của bạn."
                icon={Palette}
            >
                <ThemePicker
                    value={theme}
                    disabled={isPending('theme')}
                    loading={isPending('theme')}
                    onValueChange={(value) =>
                        void updateGeneral('theme', value as Theme)
                    }
                />
            </SettingsRow>

            <SettingsRow
                label="Múi giờ"
                description="Giúp lịch phỏng vấn và lời nhắc hiển thị đúng giờ địa phương."
                icon={Clock3}
            >
                <TimezoneCombobox
                    value={timezone}
                    options={timezoneOptions}
                    disabled={isPending('timezone')}
                    loading={isPending('timezone')}
                    onValueChange={(value) =>
                        void updateGeneral('timezone', value)
                    }
                />
            </SettingsRow>
        </SettingsSection>
    );
}

function flagToCountryCode(flag?: string) {
    if (!flag) return undefined;
    return Array.from(flag)
        .map((character) =>
            String.fromCharCode(character.codePointAt(0)! - 127397),
        )
        .join('');
}

function ThemePicker({
    value,
    disabled,
    loading,
    onValueChange,
}: {
    value: Theme;
    disabled: boolean;
    loading: boolean;
    onValueChange: (value: Theme) => void;
}) {
    const options = [
        { value: 'LIGHT' as const, label: 'Sáng', icon: Sun },
        { value: 'DARK' as const, label: 'Tối', icon: Moon },
        { value: 'SYSTEM' as const, label: 'Hệ thống', icon: Monitor },
    ];

    return (
        <div
            className="grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Giao diện"
            aria-busy={loading}
        >
            {options.map((option) => {
                const selected = value === option.value;
                const Icon = option.icon;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled || loading}
                        onClick={() => onValueChange(option.value)}
                        className={cn(
                            'group min-w-0 rounded-xl border p-1.5 text-left transition-[border-color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:outline-none active:scale-[0.98]',
                            selected
                                ? 'border-primary ring-primary/15 shadow-[0_5px_16px_rgba(91,55,205,0.16)] ring-1'
                                : 'border-slate-200 hover:border-violet-200',
                        )}
                    >
                        <span
                            className={cn(
                                'block h-14 overflow-hidden rounded-lg border p-2',
                                option.value === 'DARK'
                                    ? 'border-slate-700 bg-slate-900'
                                    : option.value === 'SYSTEM'
                                      ? 'border-slate-300 bg-[linear-gradient(110deg,#fff_0_50%,#172033_50%_100%)]'
                                      : 'border-slate-200 bg-white',
                            )}
                            aria-hidden="true"
                        >
                            <span className="flex h-full gap-1.5">
                                <span
                                    className={cn(
                                        'w-1/4 rounded-sm',
                                        option.value === 'DARK'
                                            ? 'bg-slate-700'
                                            : option.value === 'SYSTEM'
                                              ? 'bg-violet-100/90'
                                              : 'bg-violet-100',
                                    )}
                                />
                                <span className="flex flex-1 flex-col gap-1.5 pt-1">
                                    <span
                                        className={cn(
                                            'h-1.5 w-3/4 rounded-full',
                                            option.value === 'DARK'
                                                ? 'bg-slate-500'
                                                : 'bg-slate-300',
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            'h-4 rounded-sm',
                                            option.value === 'DARK'
                                                ? 'bg-slate-800 ring-1 ring-slate-700'
                                                : 'bg-slate-50 ring-1 ring-slate-200',
                                        )}
                                    />
                                </span>
                            </span>
                        </span>
                        <span className="mt-1.5 flex items-center justify-center gap-1.5 truncate px-1 text-xs font-bold text-slate-700 sm:text-sm">
                            <Icon
                                className={cn(
                                    'size-3.5 shrink-0',
                                    selected && 'text-primary',
                                )}
                            />
                            {option.label}
                            {selected && (
                                <Check
                                    className="text-primary size-3.5 shrink-0"
                                    strokeWidth={3}
                                />
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function TimezoneCombobox({
    value,
    options,
    disabled,
    loading,
    onValueChange,
}: {
    value: string | null;
    options: readonly TimezoneOption[];
    disabled: boolean;
    loading: boolean;
    onValueChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const normalize = (text: string) =>
        text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('vi');
    const query = normalize(search.trim());
    const filteredOptions = query
        ? options.filter((option) =>
              normalize(
                  `${option.city} ${option.value} ${option.offset}`,
              ).includes(query),
          )
        : options.filter(
              (option) =>
                  featuredTimezoneValues.has(option.value) ||
                  option.value === value,
          );
    const selected = options.find((option) => option.value === value);

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
                    aria-controls="timezone-options"
                    aria-label="Múi giờ"
                    disabled={disabled || loading}
                    className="focus:border-primary focus:ring-primary/15 flex h-11 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm font-medium text-slate-800 shadow-xs transition-[border-color,box-shadow,background-color] hover:bg-slate-50 focus:ring-3 focus:outline-none disabled:cursor-not-allowed"
                >
                    <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                        {selected ? (
                            <>
                                <span className="text-primary shrink-0 text-[11px] font-extrabold tracking-wide">
                                    {selected.countryCode}
                                </span>
                                <span className="truncate">
                                    {selected.city} · {selected.offset}
                                </span>
                            </>
                        ) : (
                            'Chọn múi giờ'
                        )}
                    </span>
                    {loading ? (
                        <LoaderCircle className="text-primary size-4 shrink-0 animate-spin" />
                    ) : (
                        <ChevronDown className="size-4 shrink-0 text-slate-500" />
                    )}
                </button>
            </PopoverPrimitive.Trigger>

            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    align="end"
                    sideOffset={6}
                    className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-slate-950 shadow-[0_16px_45px_rgba(31,24,56,0.14)] outline-none"
                >
                    <div className="focus-within:border-primary focus-within:ring-primary/10 mb-1.5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:ring-3">
                        <Search className="size-4 shrink-0 text-slate-400" />
                        <input
                            autoFocus
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm thành phố, quốc gia hoặc UTC..."
                            aria-label="Tìm múi giờ"
                            className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                        />
                    </div>

                    <div
                        id="timezone-options"
                        role="listbox"
                        aria-label="Danh sách múi giờ"
                        className="max-h-64 overflow-y-auto overscroll-contain"
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = option.value === value;

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => {
                                            onValueChange(option.value);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                                            isSelected
                                                ? 'text-primary bg-violet-50'
                                                : 'text-slate-700 hover:bg-slate-50',
                                        )}
                                    >
                                        <span
                                            className="text-primary flex w-7 shrink-0 items-center justify-center text-xs font-extrabold tracking-wide"
                                            aria-hidden="true"
                                        >
                                            {option.countryCode}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-bold text-slate-900">
                                                {option.city}
                                                <span className="ml-2 font-semibold text-slate-400">
                                                    {option.offset}
                                                </span>
                                            </span>
                                            <span className="block truncate text-xs font-medium text-slate-500">
                                                {option.value}
                                            </span>
                                        </span>
                                        {isSelected && (
                                            <Check className="text-primary size-4 shrink-0 stroke-[3]" />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <p className="px-3 py-6 text-center text-sm font-medium text-slate-500">
                                Không tìm thấy múi giờ phù hợp.
                            </p>
                        )}
                    </div>
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}
