'use client';

import { AlertTriangle } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    destructive = false,
    onOpenChange,
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]" />
                <DialogPrimitive.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-violet-100 bg-white p-6 shadow-[0_28px_90px_rgba(38,25,82,0.24)] outline-none">
                    <div className="flex gap-4">
                        <div
                            className={
                                destructive
                                    ? 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600'
                                    : 'bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl'
                            }
                        >
                            <AlertTriangle className="size-5" />
                        </div>
                        <div>
                            <DialogPrimitive.Title className="text-lg font-extrabold text-slate-950">
                                {title}
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-slate-600">
                                {description}
                            </DialogPrimitive.Description>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <DialogPrimitive.Close asChild>
                            <Button type="button" variant="outline">
                                Quay lại
                            </Button>
                        </DialogPrimitive.Close>
                        <Button
                            type="button"
                            variant={destructive ? 'destructive' : 'default'}
                            onClick={() => {
                                onConfirm();
                                onOpenChange(false);
                            }}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
