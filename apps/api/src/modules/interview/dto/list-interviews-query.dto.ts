import { Transform, Type } from 'class-transformer';
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
import { InterviewStatus } from '../../../generated/prisma/client';

export enum InterviewListSort {
    RECENTLY_UPDATED = 'RECENTLY_UPDATED',
    NEWEST = 'NEWEST',
    OLDEST = 'OLDEST',
}

export class ListInterviewsQueryDto {
    @ApiPropertyOptional({
        description: 'Tìm theo vai trò, CV, JD hoặc công ty',
        maxLength: 100,
    })
    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @MaxLength(100)
    search?: string;

    @ApiPropertyOptional({ enum: InterviewStatus })
    @IsOptional()
    @IsEnum(InterviewStatus)
    status?: InterviewStatus;

    @ApiPropertyOptional({
        enum: InterviewListSort,
        default: InterviewListSort.RECENTLY_UPDATED,
    })
    @IsOptional()
    @IsEnum(InterviewListSort)
    sort: InterviewListSort = InterviewListSort.RECENTLY_UPDATED;

    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @ApiPropertyOptional({ default: 9, minimum: 1, maximum: 50 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 9;
}
