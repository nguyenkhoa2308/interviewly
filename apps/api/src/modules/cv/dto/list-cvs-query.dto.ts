import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { CVProcessingStatus } from '../../../generated/prisma/client';

export enum CvListSort {
    NEWEST = 'NEWEST',
    OLDEST = 'OLDEST',
    NAME_ASC = 'NAME_ASC',
    NAME_DESC = 'NAME_DESC',
}

export class ListCvsQueryDto {
    @ApiPropertyOptional({ enum: CVProcessingStatus })
    @IsOptional()
    @IsEnum(CVProcessingStatus, { message: 'CV_INVALID_STATUS' })
    status?: CVProcessingStatus;

    @ApiPropertyOptional({
        description: 'Tìm theo tên CV hoặc tên file gốc.',
        maxLength: 150,
    })
    @IsOptional()
    @IsString({ message: 'CV_INVALID_SEARCH' })
    @MaxLength(150, { message: 'CV_INVALID_SEARCH' })
    search?: string;

    @ApiPropertyOptional({ enum: CvListSort, default: CvListSort.NEWEST })
    @IsOptional()
    @IsEnum(CvListSort, { message: 'CV_INVALID_SORT' })
    sort: CvListSort = CvListSort.NEWEST;

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
