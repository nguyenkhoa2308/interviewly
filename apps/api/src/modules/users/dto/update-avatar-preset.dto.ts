import { Allow } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { AVATAR_PRESETS } from '../constants/avatar.constant';

export class UpdateAvatarPresetDto {
    @ApiProperty({
        description: 'Mã preset DiceBear trong allowlist của Interviewly.',
        enum: AVATAR_PRESETS,
        example: 'interviewly-amber',
    })
    @Allow()
    preset: string;
}
