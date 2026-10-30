import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import {
    ExperienceLevel,
    InterviewType,
} from '../../../generated/prisma/client';

export class InterviewProgressQueryDto {
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
}