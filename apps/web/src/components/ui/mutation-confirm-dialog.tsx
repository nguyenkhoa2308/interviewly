'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';

interface MutationConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    pendingLabel: string;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
}

export function MutationConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    pendingLabel,
    pending,
    onOpenChange,
    onConfirm,
}: MutationConfirmDialogProps) {
    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}
        >
            <DialogContent
                className="max-w-md p-6 max-sm:px-5 max-sm:pt-3 max-sm:pb-[max(var(--dialog-mobile-bottom-clearance,5.5rem),env(safe-area-inset-bottom))]"
                showCloseButton={false}
                mobileVariant="bottom-sheet"
                mobileContentPosition="start"
                onEscapeKeyDown={(event) => pending && event.preventDefault()}
                onPointerDownOutside={(event) =>
                    pending && event.preventDefault()
                }
            >
                <div className="mx-auto mb-5 hidden h-1.5 w-12 rounded-full bg-slate-200 max-sm:block" />
                <div className="flex gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                        <AlertTriangle className="size-5" />
                    </div>
                    <div>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription className="mt-2">
                            {description}
                        </DialogDescription>
                    </div>
                </div>
                <div className="mt-6 grid shrink-0 grid-cols-2 gap-2 sm:flex sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onOpenChange(false)}
                        className="h-11 rounded-lg font-bold sm:h-9 sm:rounded-sm"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => void onConfirm()}
                        className="!border-destructive h-11 rounded-lg font-bold sm:h-9 sm:rounded-sm"
                    >
                        {pending ? pendingLabel : confirmLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

