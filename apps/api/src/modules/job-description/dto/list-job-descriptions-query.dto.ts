import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

export enum JobDescriptionListStatus {
    ALL = 'ALL',
    ANALYZED = 'ANALYZED',
    NOT_ANALYZED = 'NOT_ANALYZED',
    FAILED = 'FAILED',
}

export enum JobDescriptionListSort {
    RECENTLY_UPDATED = 'RECENTLY_UPDATED',
    NEWEST = 'NEWEST',
    OLDEST = 'OLDEST',
    TITLE = 'TITLE',
}

export class ListJobDescriptionsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 20;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;

    @ApiPropertyOptional({
        enum: JobDescriptionListStatus,
        default: JobDescriptionListStatus.ALL,
    })
    @IsOptional()
    @IsEnum(JobDescriptionListStatus)
    status: JobDescriptionListStatus = JobDescriptionListStatus.ALL;

    @ApiPropertyOptional({
        enum: JobDescriptionListSort,
        default: JobDescriptionListSort.RECENTLY_UPDATED,
    })
    @IsOptional()
    @IsEnum(JobDescriptionListSort)
    sort: JobDescriptionListSort = JobDescriptionListSort.RECENTLY_UPDATED;
}
