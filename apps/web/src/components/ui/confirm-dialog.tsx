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
            <DialogContent className="max-w-md p-6" showCloseButton={false}>
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
                <div className="mt-6 flex justify-end gap-3">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Quay lại
                        </Button>
                    </DialogClose>
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
            </DialogContent>
        </Dialog>
    );
}
