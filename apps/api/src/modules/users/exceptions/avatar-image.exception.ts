import { BadRequestException } from '@nestjs/common';

export class AvatarImageException extends BadRequestException {
    constructor() {
        super({
            code: 'INVALID_AVATAR_IMAGE',
            message: 'Ảnh không hợp lệ hoặc không thể xử lý.',
        });
    }
}
