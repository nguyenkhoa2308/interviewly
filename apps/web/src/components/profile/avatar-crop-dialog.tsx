'use client';

import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Crop, Minus, Plus, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { Button } from '@/components/ui/button';
import { createCroppedAvatar } from '@/lib/crop-image';

interface AvatarCropDialogProps {
    file: File | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (file: File) => Promise<void> | void;
}

export function AvatarCropDialog(props: AvatarCropDialogProps) {
    const fileKey = props.file
        ? [props.file.name, props.file.size, props.file.lastModified].join(':')
        : 'empty';

    return <AvatarCropDialogContent key={fileKey} {...props} />;
}

function AvatarCropDialogContent({
    file,
    open,
    onOpenChange,
    onConfirm,
}: AvatarCropDialogProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedArea, setCroppedArea] = useState<Area | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) return;

        const reader = new FileReader();
        const handleLoad = () => {
            if (typeof reader.result === 'string') {
                setImageUrl(reader.result);
            }
        };
        const handleError = () => setError('Không thể đọc ảnh đã chọn.');

        reader.addEventListener('load', handleLoad);
        reader.addEventListener('error', handleError);
        reader.readAsDataURL(file);

        return () => {
            reader.removeEventListener('load', handleLoad);
            reader.removeEventListener('error', handleError);
            if (reader.readyState === FileReader.LOADING) reader.abort();
        };
    }, [file]);

    const applyCrop = async () => {
        if (!imageUrl || !croppedArea || isApplying) return;

        setIsApplying(true);
        setError(null);
        try {
            const croppedFile = await createCroppedAvatar(
                imageUrl,
                croppedArea,
            );
            await onConfirm(croppedFile);
            onOpenChange(false);
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Không thể xử lý ảnh. Vui lòng thử lại.',
            );
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px]" />
                <DialogPrimitive.Content className="data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_28px_90px_rgba(38,25,82,0.28)] outline-none">
                    <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                        <div>
                            <DialogPrimitive.Title className="flex items-center gap-2 text-lg font-bold text-slate-950">
                                <Crop className="text-primary size-5" />
                                Căn chỉnh ảnh đại diện
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description className="mt-1 text-sm text-slate-500">
                                Kéo và phóng ảnh để chọn vùng bạn muốn hiển thị.
                            </DialogPrimitive.Description>
                        </div>
                        <DialogPrimitive.Close asChild>
                            <button
                                type="button"
                                aria-label="Đóng trình chỉnh ảnh"
                                className="focus-visible:ring-primary -mr-1 flex size-9 cursor-pointer items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:outline-none"
                                disabled={isApplying}
                            >
                                <X className="size-5" />
                            </button>
                        </DialogPrimitive.Close>
                    </div>

                    <div className="p-4 sm:p-6">
                        <div className="relative aspect-square max-h-[55dvh] w-full overflow-hidden rounded-xl bg-slate-950">
                            {imageUrl && (
                                <Cropper
                                    image={imageUrl}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    minZoom={1}
                                    maxZoom={3}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={(_, areaPixels) =>
                                        setCroppedArea(areaPixels)
                                    }
                                />
                            )}
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                            <Minus
                                className="size-4 shrink-0 text-slate-500"
                                aria-hidden="true"
                            />
                            <label className="sr-only" htmlFor="avatar-zoom">
                                Mức phóng ảnh
                            </label>
                            <input
                                id="avatar-zoom"
                                type="range"
                                min={1}
                                max={3}
                                step={0.01}
                                value={zoom}
                                onChange={(event) =>
                                    setZoom(Number(event.target.value))
                                }
                                className="accent-primary h-2 w-full cursor-pointer"
                            />
                            <Plus
                                className="size-4 shrink-0 text-slate-500"
                                aria-hidden="true"
                            />
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="text-destructive mt-3 text-sm"
                            >
                                {error}
                            </p>
                        )}

                        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                            <DialogPrimitive.Close asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-w-24 rounded-sm"
                                    disabled={isApplying}
                                >
                                    Hủy
                                </Button>
                            </DialogPrimitive.Close>
                            <Button
                                type="button"
                                className="min-w-28 rounded-sm"
                                disabled={!croppedArea || isApplying}
                                onClick={applyCrop}
                            >
                                {isApplying ? 'Đang lưu...' : 'Áp dụng'}
                            </Button>
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
