'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';

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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-md p-6 max-sm:px-5 max-sm:pt-3 max-sm:pb-[max(var(--dialog-mobile-bottom-clearance,5.5rem),env(safe-area-inset-bottom))]"
                showCloseButton={false}
                mobileVariant="bottom-sheet"
                mobileContentPosition="start"
            >
                <div className="mx-auto mb-5 hidden h-1.5 w-12 rounded-full bg-slate-200 max-sm:block" />
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
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription className="mt-2">
                            {description}
                        </DialogDescription>
                    </div>
                </div>
                <div className="mt-6 grid shrink-0 grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-lg font-bold sm:h-9 sm:rounded-sm"
                        >
                            Quay lại
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant={destructive ? 'destructive' : 'default'}
                        className={
                            destructive
                                ? '!bg-destructive !border-destructive hover:bg-destructive/80 h-11 rounded-lg font-bold text-white hover:text-white sm:h-9 sm:rounded-sm'
                                : 'h-11 rounded-lg font-bold sm:h-9 sm:rounded-sm'
                        }
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

