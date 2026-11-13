'use client';

import Image from 'next/image';
import type { ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type DataStateVariant = 'empty' | 'no-results' | 'error';

export interface DataStateBenefit {
    icon: ElementType;
    title: string;
    description: string;
}

const defaultIllustrations: Record<DataStateVariant, string> = {
    empty: '/images/cvs/cv-empty-state.png',
    'no-results': '/images/cvs/cv-no-results.png',
    error: '/images/data-states/error.svg',
};

export interface DataStateProps {
    variant: DataStateVariant;
    title: string;
    description: string;
    action?: ReactNode;
    benefits?: readonly DataStateBenefit[];
    children?: ReactNode;
    illustrationSrc?: string;
    illustrationAlt?: string;
    illustrationTestId?: string;
    size?: 'compact' | 'default';
    className?: string;
    illustrationClassName?: string;
}

export type EmptyDataStateProps = Omit<DataStateProps, 'variant' | 'size'>;

/**
 * Canonical empty state used by every management page.
 *
 * Keep the true-empty composition in one place so feature pages can only
 * customize their copy, illustration, action and benefits—not its geometry.
 */
export function EmptyDataState(props: EmptyDataStateProps) {
    return <DataState {...props} variant="empty" size="default" />;
}

export function DataState({
    variant,
    title,
    description,
    action,
    benefits,
    children,
    illustrationSrc,
    illustrationAlt = '',
    illustrationTestId,
    size = 'default',
    className,
    illustrationClassName,
}: DataStateProps) {
    // True empty states deliberately share one canonical layout. Compact mode
    // is only for transient errors and filtered/no-results states.
    const compact = size === 'compact' && variant !== 'empty';

    return (
        <section
            className={cn(
                'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 relative z-10 flex flex-col items-center justify-center px-4 text-center motion-safe:duration-300',
                compact
                    ? 'min-h-72 py-7'
                    : 'min-h-[520px] py-4 sm:min-h-[560px] lg:min-h-[580px] xl:min-h-0 xl:flex-1',
                className,
            )}
            role={variant === 'error' ? 'alert' : 'status'}
            aria-live={variant === 'error' ? 'assertive' : 'polite'}
        >
            <div
                className={cn(
                    'relative shrink-0',
                    compact
                        ? 'h-36 w-48 sm:h-40 sm:w-56'
                        : 'h-44 w-64 sm:h-52 sm:w-80 lg:h-56 lg:w-[22rem]',
                    illustrationClassName,
                )}
            >
                <Image
                    src={illustrationSrc ?? defaultIllustrations[variant]}
                    alt={illustrationAlt}
                    data-testid={illustrationTestId}
                    fill
                    sizes={
                        compact
                            ? '(min-width: 640px) 224px, 192px'
                            : '(min-width: 640px) 320px, 256px'
                    }
                    className="object-contain"
                />
            </div>
            <h2
                className={cn(
                    'font-extrabold tracking-[-0.025em] text-slate-950',
                    compact ? 'mt-1 text-xl' : 'mt-2 text-xl sm:text-2xl',
                )}
            >
                {title}
            </h2>
            <p
                className={cn(
                    'max-w-xl font-medium text-slate-600',
                    compact
                        ? 'mt-2 text-sm leading-6'
                        : 'mt-3 text-sm leading-6 sm:text-base sm:leading-7',
                )}
            >
                {description}
            </p>
            {action && (
                <div className={compact ? 'mt-5' : 'mt-6'}>{action}</div>
            )}
            {benefits && benefits.length > 0 && (
                <div
                    className={cn(
                        'grid w-full max-w-4xl gap-5 text-left sm:grid-cols-2 sm:gap-0',
                        compact ? 'mt-7' : 'mt-10',
                        benefits.length >= 3 && 'lg:grid-cols-3',
                    )}
                    aria-label="Lợi ích"
                >
                    {benefits.map((benefit, index) => {
                        const Icon = benefit.icon;

                        return (
                            <div
                                key={`${benefit.title}-${index}`}
                                className={cn(
                                    'flex items-center gap-4 px-3 sm:justify-center sm:px-5',
                                    index > 0 &&
                                        'sm:border-l sm:border-violet-200',
                                    index === 2 &&
                                        'sm:col-span-2 sm:mt-5 sm:border-l-0 lg:col-span-1 lg:mt-0 lg:border-l',
                                )}
                            >
                                <span className="bg-primary/8 text-primary flex size-12 shrink-0 items-center justify-center rounded-full">
                                    <Icon
                                        className="size-6"
                                        strokeWidth={2.25}
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="min-w-0">
                                    <strong className="block text-sm font-extrabold text-slate-950 sm:text-base">
                                        {benefit.title}
                                    </strong>
                                    <span className="mt-0.5 block text-sm leading-5 font-medium text-slate-500">
                                        {benefit.description}
                                    </span>
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
            {children}
        </section>
    );
}
