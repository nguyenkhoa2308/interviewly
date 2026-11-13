import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type AppPageHeaderProps = {
    eyebrow: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    decoration?: ReactNode;
    className?: string;
    contentClassName?: string;
    actionsClassName?: string;
};

export function AppPageHeader({
    eyebrow,
    title,
    description,
    actions,
    decoration,
    className,
    contentClassName,
    actionsClassName,
}: AppPageHeaderProps) {
    return (
        <header
            className={cn(
                'relative isolate flex shrink-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between',
                className,
            )}
        >
            <div className={cn('relative z-10 max-w-2xl', contentClassName)}>
                <p className="text-primary text-[13px] leading-4 font-black tracking-widest uppercase">
                    {eyebrow}
                </p>
                <h1 className="mt-2 text-3xl leading-tight font-black tracking-tight text-slate-950 sm:text-4xl">
                    {title}
                </h1>
                {description ? (
                    <p className="mt-2 max-w-2xl text-base leading-5 font-semibold text-slate-500">
                        {description}
                    </p>
                ) : null}
            </div>

            {decoration}

            {actions ? (
                <div
                    className={cn(
                        'relative z-10 flex flex-wrap gap-2.5',
                        actionsClassName,
                    )}
                >
                    {actions}
                </div>
            ) : null}
        </header>
    );
}
