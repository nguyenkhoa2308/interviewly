'use client';

import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Crop, Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-xl overflow-hidden"
                showCloseButton
                closeButtonDisabled={isApplying}
            >
                <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                    <div>
                        <DialogTitle className="flex items-center gap-2 pr-10 font-bold">
                            <Crop className="text-primary size-5" />
                            Căn chỉnh ảnh đại diện
                        </DialogTitle>
                        <DialogDescription className="mt-1 text-slate-500">
                            Kéo và phóng ảnh để chọn vùng bạn muốn hiển thị.
                        </DialogDescription>
                    </div>
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

                    <DialogFooter className="mt-6 border-t border-slate-100 pt-4">
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="min-w-24 rounded-sm"
                                disabled={isApplying}
                            >
                                Hủy
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            className="min-w-28 rounded-sm"
                            disabled={!croppedArea || isApplying}
                            onClick={applyCrop}
                        >
                            {isApplying ? 'Đang lưu...' : 'Áp dụng'}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
