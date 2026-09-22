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
                className="max-w-md p-6"
                showCloseButton={false}
                onEscapeKeyDown={(event) => pending && event.preventDefault()}
                onPointerDownOutside={(event) =>
                    pending && event.preventDefault()
                }
            >
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
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onOpenChange(false)}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => void onConfirm()}
                    >
                        {pending ? pendingLabel : confirmLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
