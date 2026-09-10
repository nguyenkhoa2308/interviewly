import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SettingsRowProps {
    label: string;
    description: string;
    children: ReactNode;
    icon?: LucideIcon;
    layout?: 'default' | 'inline';
    descriptionId?: string;
}

export function SettingsRow({
    label,
    description,
    children,
    icon: Icon,
    layout = 'default',
    descriptionId,
}: SettingsRowProps) {
    return (
        <div
            className={cn(
                'min-h-20 gap-4 px-5 py-5 sm:px-6',
                layout === 'inline'
                    ? 'flex items-center justify-between'
                    : 'grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-center lg:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]',
            )}
        >
            <div className="flex min-w-0 gap-3">
                {Icon && (
                    <span className="text-primary mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                        <Icon className="size-[18px]" strokeWidth={2} />
                    </span>
                )}
                <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-slate-900">
                        {label}
                    </h3>
                    <p
                        id={descriptionId}
                        className="mt-1 max-w-2xl text-sm leading-5 font-medium text-slate-500"
                    >
                        {description}
                    </p>
                </div>
            </div>
            <div
                className={cn(
                    'min-w-0',
                    layout === 'inline'
                        ? 'shrink-0'
                        : 'w-full lg:justify-self-end',
                )}
            >
                {children}
            </div>
        </div>
    );
}
