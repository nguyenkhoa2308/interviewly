import type { Area } from 'react-easy-crop';

const AVATAR_OUTPUT_SIZE = 512;

function loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
        image.src = source;
    });
}

export async function createCroppedAvatar(
    source: string,
    crop: Area,
): Promise<File> {
    const image = await loadImage(source);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        AVATAR_OUTPUT_SIZE,
        AVATAR_OUTPUT_SIZE,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.9),
    );
    if (!blob) throw new Error('Không thể tạo ảnh đại diện.');

    return new File([blob], 'avatar.webp', {
        type: 'image/webp',
        lastModified: Date.now(),
    });
}
