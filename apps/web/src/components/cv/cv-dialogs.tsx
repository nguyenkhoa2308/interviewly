'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FileClock, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { CvStatusBadge } from '@/components/cv/cv-status-badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MutationConfirmDialog } from '@/components/ui/mutation-confirm-dialog';
import {
    useCvVersions,
    useDeleteCv,
    useRenameCv,
    useSetCurrentCvVersion,
    useUploadCv,
    useUploadCvVersion,
} from '@/hooks/cv';
import { formatFileSize } from '@/lib/cv-formatters';
import {
    renameCvSchema,
    uploadCvSchema,
    type RenameCvFormValues,
    type UploadCvFormValues,
} from '@/schemas/cv.schema';
import type { CvListItem } from '@/types/cv';

interface OpenDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UploadCvDialog({ open, onOpenChange }: OpenDialogProps) {
    const mutation = useUploadCv();
    const form = useForm<UploadCvFormValues>({
        resolver: zodResolver(uploadCvSchema),
        defaultValues: { name: '', file: undefined },
    });
    const selectedFile = useWatch({ control: form.control, name: 'file' });

    const closeAndReset = () => {
        form.reset();
        mutation.reset();
        onOpenChange(false);
    };

    const submit = form.handleSubmit(async (values) => {
        try {
            await mutation.mutateAsync(values);
            toast.success('Tải CV lên thành công.');
            closeAndReset();
        } catch {
            // Error remains in mutation state and is rendered inside the dialog.
        }
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(next) =>
                !mutation.isPending &&
                (next ? onOpenChange(true) : closeAndReset())
            }
        >
            <DialogContent
                className="max-w-xl p-6 sm:p-7"
                closeButtonDisabled={mutation.isPending}
            >
                <DialogHeader>
                    <DialogTitle className="text-xl">Tải CV lên</DialogTitle>
                    <DialogDescription>
                        Thêm bản CV bạn muốn sử dụng để chuẩn bị phỏng vấn.
                    </DialogDescription>
                </DialogHeader>

                <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
                    <div className="space-y-2">
                        <Label htmlFor="cv-name">Tên CV</Label>
                        <Input
                            id="cv-name"
                            placeholder="Ví dụ: CV Backend Developer"
                            aria-invalid={Boolean(form.formState.errors.name)}
                            aria-describedby={
                                form.formState.errors.name
                                    ? 'cv-name-error'
                                    : undefined
                            }
                            {...form.register('name')}
                        />
                        {form.formState.errors.name && (
                            <p
                                id="cv-name-error"
                                className="text-sm font-medium text-red-600"
                            >
                                {form.formState.errors.name.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cv-file">Tệp PDF</Label>
                        <label
                            htmlFor="cv-file"
                            className="focus-within:ring-primary/25 flex min-h-28 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-violet-200 bg-violet-50/45 p-4 transition focus-within:ring-3 hover:border-violet-300 hover:bg-violet-50"
                        >
                            <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                                <Upload className="size-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-bold text-slate-800">
                                    {selectedFile?.name ??
                                        'Chọn tệp PDF từ thiết bị'}
                                </span>
                                <span className="mt-1 block text-xs font-medium text-slate-500">
                                    {selectedFile
                                        ? formatFileSize(selectedFile.size)
                                        : 'Chỉ PDF, dung lượng tối đa 5 MB'}
                                </span>
                            </span>
                        </label>
                        <input
                            id="cv-file"
                            className="sr-only"
                            type="file"
                            accept="application/pdf,.pdf"
                            aria-invalid={Boolean(form.formState.errors.file)}
                            aria-describedby={
                                form.formState.errors.file
                                    ? 'cv-file-error'
                                    : undefined
                            }
                            onChange={(event) =>
                                form.setValue(
                                    'file',
                                    event.target.files?.[0] as File,
                                    { shouldDirty: true, shouldValidate: true },
                                )
                            }
                        />
                        {form.formState.errors.file && (
                            <p
                                id="cv-file-error"
                                className="text-sm font-medium text-red-600"
                            >
                                {form.formState.errors.file.message}
                            </p>
                        )}
                    </div>

                    {mutation.isError && (
                        <p
                            role="alert"
                            className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                        >
                            {mutation.error.message}
                        </p>
                    )}

                    <DialogFooter className="pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={mutation.isPending}
                            onClick={closeAndReset}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending
                                ? 'Đang tải lên...'
                                : 'Tải CV lên'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface RenameCvDialogProps extends OpenDialogProps {
    cv: CvListItem | null;
}

export function RenameCvDialog({
    cv,
    open,
    onOpenChange,
}: RenameCvDialogProps) {
    const mutation = useRenameCv();
    const form = useForm<RenameCvFormValues>({
        resolver: zodResolver(renameCvSchema),
        defaultValues: { name: '' },
    });

    useEffect(() => {
        if (open && cv) form.reset({ name: cv.name });
    }, [cv, form, open]);

    const close = () => {
        mutation.reset();
        onOpenChange(false);
    };

    const submit = form.handleSubmit(async (values) => {
        if (!cv) return;
        try {
            await mutation.mutateAsync({ cvId: cv.id, payload: values });
            toast.success('Đã đổi tên CV.');
            close();
        } catch {
            // Mutation error is rendered below the input.
        }
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(next) =>
                !mutation.isPending && (next ? onOpenChange(true) : close())
            }
        >
            <DialogContent
                className="max-w-md p-6"
                closeButtonDisabled={mutation.isPending}
            >
                <DialogHeader>
                    <DialogTitle>Đổi tên CV</DialogTitle>
                    <DialogDescription>
                        Đặt một tên dễ nhận biết cho tài liệu này.
                    </DialogDescription>
                </DialogHeader>
                <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
                    <div className="space-y-2">
                        <Label htmlFor="rename-cv-name">Tên CV</Label>
                        <Input
                            id="rename-cv-name"
                            autoFocus
                            aria-invalid={Boolean(form.formState.errors.name)}
                            aria-describedby={
                                form.formState.errors.name
                                    ? 'rename-cv-error'
                                    : undefined
                            }
                            {...form.register('name')}
                        />
                        {form.formState.errors.name && (
                            <p
                                id="rename-cv-error"
                                className="text-sm font-medium text-red-600"
                            >
                                {form.formState.errors.name.message}
                            </p>
                        )}
                    </div>
                    {mutation.isError && (
                        <p
                            role="alert"
                            className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                        >
                            {mutation.error.message}
                        </p>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={mutation.isPending}
                            onClick={close}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Đang lưu...' : 'Lưu tên mới'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface DeleteCvDialogProps extends OpenDialogProps {
    cv: CvListItem | null;
    onDeleted?: () => void;
}

export function DeleteCvDialog({
    cv,
    open,
    onOpenChange,
    onDeleted,
}: DeleteCvDialogProps) {
    const mutation = useDeleteCv();

    return (
        <MutationConfirmDialog
            open={open}
            onOpenChange={(next) => {
                if (!next) mutation.reset();
                onOpenChange(next);
            }}
            title="Xóa CV này?"
            description={
                '“' +
                (cv?.name ?? 'CV') +
                '” sẽ bị xóa khỏi tài khoản. Bạn không thể khôi phục từ ứng dụng.'
            }
            confirmLabel="Xóa CV"
            pendingLabel="Đang xóa..."
            pending={mutation.isPending}
            onConfirm={async () => {
                if (!cv) return;
                try {
                    await mutation.mutateAsync(cv.id);
                    toast.success('Đã xóa CV.');
                    onDeleted?.();
                    onOpenChange(false);
                } catch (error) {
                    toast.error('Không thể xóa CV', {
                        description:
                            error instanceof Error
                                ? error.message
                                : 'Vui lòng thử lại.',
                    });
                }
            }}
        />
    );
}

export function CvVersionsDialog({
    cv,
    open,
    onOpenChange,
}: { cv: CvListItem | null } & OpenDialogProps) {
    const versionsQuery = useCvVersions(open ? cv?.id : undefined);
    const uploadMutation = useUploadCvVersion();
    const currentMutation = useSetCurrentCvVersion();
    const [file, setFile] = useState<File>();
    const pending = uploadMutation.isPending || currentMutation.isPending;

    const close = () => {
        if (pending) return;
        setFile(undefined);
        uploadMutation.reset();
        currentMutation.reset();
        onOpenChange(false);
    };

    const upload = async () => {
        if (!cv || !file) return;
        try {
            await uploadMutation.mutateAsync({ cvId: cv.id, file });
            setFile(undefined);
            toast.success('Đã cập nhật CV bằng phiên bản mới.');
        } catch {
            // The normalized API message is rendered below.
        }
    };

    const selectVersion = async (versionId: string) => {
        if (!cv) return;
        try {
            await currentMutation.mutateAsync({ cvId: cv.id, versionId });
            toast.success('Đã chuyển phiên bản CV.');
        } catch {
            // The normalized API message is rendered below.
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => (next ? onOpenChange(true) : close())}
        >
            <DialogContent
                className="max-w-2xl p-6 sm:p-7"
                closeButtonDisabled={pending}
            >
                <DialogHeader>
                    <DialogTitle>Lịch sử phiên bản</DialogTitle>
                    <DialogDescription>
                        Tải bản PDF mới hoặc quay lại một phiên bản đã xử lý
                        trước đó.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-5 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4">
                    <label
                        htmlFor="cv-version-file"
                        className="flex cursor-pointer items-center gap-3"
                    >
                        <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                            <Upload className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-800">
                                {file?.name ?? 'Chọn phiên bản PDF mới'}
                            </span>
                            <span className="text-xs font-medium text-slate-500">
                                PDF tối đa 5 MB · Bản hiện tại chỉ đổi sau khi
                                xử lý thành công
                            </span>
                        </span>
                    </label>
                    <input
                        id="cv-version-file"
                        className="sr-only"
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) => setFile(event.target.files?.[0])}
                    />
                    {file && (
                        <Button
                            className="mt-3 w-full sm:w-auto"
                            disabled={pending}
                            onClick={() => void upload()}
                        >
                            {uploadMutation.isPending
                                ? 'Đang xử lý...'
                                : 'Tải lên phiên bản mới'}
                        </Button>
                    )}
                </div>

                {(uploadMutation.isError || currentMutation.isError) && (
                    <p
                        role="alert"
                        className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                    >
                        {
                            (uploadMutation.error ?? currentMutation.error)
                                ?.message
                        }
                    </p>
                )}

                <div className="mt-5 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {versionsQuery.isPending ? (
                        <p className="py-8 text-center text-sm font-semibold text-slate-500">
                            Đang tải lịch sử...
                        </p>
                    ) : versionsQuery.isError ? (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => void versionsQuery.refetch()}
                        >
                            Thử tải lại
                        </Button>
                    ) : (
                        versionsQuery.data?.map((version) => (
                            <div
                                key={version.id}
                                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3.5"
                            >
                                <span className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                                    <FileClock className="size-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-slate-900">
                                            Phiên bản {version.versionNumber}
                                        </p>
                                        {version.isCurrent && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                                <Check className="size-3" />
                                                Đang dùng
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-xs font-medium text-slate-500">
                                        {version.originalFilename} ·{' '}
                                        {formatFileSize(version.fileSize)}
                                    </p>
                                </div>
                                {!version.isCurrent &&
                                    version.processingStatus === 'READY' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={pending}
                                            onClick={() =>
                                                void selectVersion(version.id)
                                            }
                                        >
                                            Sử dụng
                                        </Button>
                                    )}
                                {version.processingStatus !== 'READY' && (
                                    <CvStatusBadge
                                        status={version.processingStatus}
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
