import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { AvatarImageException } from '../exceptions/avatar-image.exception';

@Injectable()
export class AvatarImageService {
    async process(buffer: Buffer): Promise<Buffer> {
        try {
            return await sharp(buffer)
                .rotate()
                .resize(256, 256, {
                    fit: 'cover',
                    position: sharp.strategy.attention,
                })
                .webp({
                    quality: 80,
                })
                .toBuffer();
        } catch {
            throw new AvatarImageException();
        }
    }
}
