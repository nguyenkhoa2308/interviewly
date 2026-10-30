'use client';

import { X } from 'lucide-react';
import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
    return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(
    props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(
    props: React.ComponentProps<typeof DialogPrimitive.Portal>,
) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(
    props: React.ComponentProps<typeof DialogPrimitive.Close>,
) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
    return (
        <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className={cn(
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]',
                className,
            )}
            {...props}
        />
    );
}

function DialogContent({
    className,
    children,
    showCloseButton = true,
    closeButtonDisabled = false,
    mobileContentPosition = 'center',
    mobileVariant = 'fullscreen',
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
    closeButtonDisabled?: boolean;
    mobileContentPosition?: 'center' | 'start';
    mobileVariant?: 'fullscreen' | 'bottom-sheet' | 'compact';
}) {
    const [visualViewport, setVisualViewport] = React.useState<{
        top: number;
        height: number;
    } | null>(null);
    const [isAppleMobile, setIsAppleMobile] = React.useState(false);

    React.useEffect(() => {
        if (mobileVariant !== 'bottom-sheet') return;

        const appleMobile =
            /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' &&
                navigator.maxTouchPoints > 1);
        setIsAppleMobile(appleMobile);

        const viewport = window.visualViewport;
        const syncViewport = () => {
            setVisualViewport({
                top: viewport?.offsetTop ?? 0,
                height: viewport?.height ?? window.innerHeight,
            });
        };

        syncViewport();
        viewport?.addEventListener('resize', syncViewport);
        viewport?.addEventListener('scroll', syncViewport);
        window.addEventListener('resize', syncViewport);

        return () => {
            viewport?.removeEventListener('resize', syncViewport);
            viewport?.removeEventListener('scroll', syncViewport);
            window.removeEventListener('resize', syncViewport);
        };
    }, [mobileVariant]);

    return (
        <DialogPortal>
            <DialogOverlay />
            <div
                className={cn(
                    'contents',
                    mobileVariant === 'bottom-sheet' &&
                        'max-sm:pointer-events-none max-sm:fixed max-sm:right-0 max-sm:left-0 max-sm:z-50 max-sm:flex max-sm:items-end max-sm:overflow-hidden',
                )}
                style={
                    mobileVariant === 'bottom-sheet'
                        ? {
                              top: visualViewport?.top ?? 0,
                              height: visualViewport?.height ?? '100dvh',
                          }
                        : undefined
                }
            >
                <DialogPrimitive.Content
                    data-slot="dialog-content"
                    className={cn(
                        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-violet-100 bg-white shadow-[0_28px_90px_rgba(38,25,82,0.24)] outline-none',
                        mobileVariant === 'fullscreen'
                            ? 'max-sm:!inset-0 max-sm:!top-0 max-sm:!left-0 max-sm:!h-[100dvh] max-sm:!max-h-none max-sm:!w-full max-sm:!max-w-none max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!rounded-none max-sm:!border-0 max-sm:!shadow-none'
                            : mobileVariant === 'bottom-sheet'
                              ? 'data-[state=open]:max-sm:slide-in-from-bottom data-[state=closed]:max-sm:slide-out-to-bottom max-sm:pointer-events-auto max-sm:!relative max-sm:!inset-auto max-sm:!top-auto max-sm:!bottom-auto max-sm:!left-auto max-sm:!flex max-sm:!max-h-[calc(100%-0.75rem)] max-sm:!w-full max-sm:!max-w-none max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!flex-col max-sm:!overflow-hidden max-sm:!rounded-t-[1.75rem] max-sm:!rounded-b-none max-sm:!border-x-0 max-sm:!border-b-0'
                              : 'data-[state=open]:max-sm:slide-in-from-bottom-10 data-[state=closed]:max-sm:slide-out-to-bottom-10 data-[state=open]:max-sm:zoom-in-95 data-[state=closed]:max-sm:zoom-out-95 max-sm:!top-1/2 max-sm:!left-1/2 max-sm:!max-h-[calc(100dvh-2rem)] max-sm:!w-[calc(100%-2rem)] max-sm:!max-w-md max-sm:!-translate-x-1/2 max-sm:!-translate-y-1/2 max-sm:!rounded-2xl',
                        isAppleMobile &&
                            mobileVariant === 'bottom-sheet' &&
                            'max-sm:[--dialog-mobile-bottom-clearance:7.5rem]',
                        className,
                    )}
                    {...props}
                >
                    <div
                        className={cn(
                            'contents max-sm:flex max-sm:flex-col',
                            mobileVariant === 'fullscreen' &&
                                'max-sm:min-h-full',
                            mobileVariant === 'bottom-sheet' &&
                                'max-sm:min-h-0 max-sm:flex-1 max-sm:overflow-y-auto',
                            mobileContentPosition === 'start'
                                ? 'max-sm:justify-start'
                                : 'max-sm:justify-center',
                        )}
                    >
                        {children}
                    </div>
                    {showCloseButton && (
                        <DialogPrimitive.Close
                            disabled={closeButtonDisabled}
                            className="focus-visible:ring-primary/30 absolute top-4 right-4 flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none max-sm:top-[max(1rem,env(safe-area-inset-top))] max-sm:right-[max(1rem,env(safe-area-inset-right))]"
                        >
                            <X className="size-5" />
                            <span className="sr-only">Đóng</span>
                        </DialogPrimitive.Close>
                    )}
                </DialogPrimitive.Content>
            </div>
        </DialogPortal>
    );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-header"
            className={cn('flex flex-col gap-1 text-left', className)}
            {...props}
        />
    );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn(
                'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
                className,
            )}
            {...props}
        />
    );
}

function DialogTitle({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn('text-lg font-extrabold text-slate-950', className)}
            {...props}
        />
    );
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn('text-sm leading-6 text-slate-600', className)}
            {...props}
        />
    );
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};

