import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { CVProcessingStatus } from '../../../generated/prisma/client';

export class ListCvsQueryDto {
    @ApiPropertyOptional({ enum: CVProcessingStatus })
    @IsOptional()
    @IsEnum(CVProcessingStatus, { message: 'CV_INVALID_STATUS' })
    status?: CVProcessingStatus;

    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @Type(() => Number)
    @IsInt({ message: 'CV_INVALID_PAGE' })
    @Min(1, { message: 'CV_INVALID_PAGE' })
    page = 1;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
    @Type(() => Number)
    @IsInt({ message: 'CV_INVALID_LIMIT' })
    @Min(1, { message: 'CV_INVALID_LIMIT' })
    @Max(100, { message: 'CV_INVALID_LIMIT' })
    limit = 20;
}
