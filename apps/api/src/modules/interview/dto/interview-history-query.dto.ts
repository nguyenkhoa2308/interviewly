import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import {
    ExperienceLevel,
    InterviewStatus,
    InterviewType,
} from '../../../generated/prisma/client';

export enum InterviewHistorySort {
    RECENT = 'RECENT',
    OLDEST = 'OLDEST',
    HIGHEST_SCORE = 'HIGHEST_SCORE',
    LOWEST_SCORE = 'LOWEST_SCORE',
}

export class InterviewHistoryQueryDto {
    @ApiPropertyOptional({ maxLength: 100 })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @MaxLength(100)
    search?: string;

    @ApiPropertyOptional({ enum: InterviewStatus })
    @IsOptional()
    @IsEnum(InterviewStatus)
    status?: InterviewStatus;

    @ApiPropertyOptional({ maxLength: 150 })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @MaxLength(150)
    role?: string;

    @ApiPropertyOptional({ enum: ExperienceLevel })
    @IsOptional()
    @IsEnum(ExperienceLevel)
    level?: ExperienceLevel;

    @ApiPropertyOptional({ enum: InterviewType })
    @IsOptional()
    @IsEnum(InterviewType)
    interviewType?: InterviewType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    to?: string;

    @ApiPropertyOptional({ enum: InterviewHistorySort, default: InterviewHistorySort.RECENT })
    @IsOptional()
    @IsEnum(InterviewHistorySort)
    sort: InterviewHistorySort = InterviewHistorySort.RECENT;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 9;
}