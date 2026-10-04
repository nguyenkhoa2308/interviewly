import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsEnum,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
    IsBoolean,
} from 'class-validator';
import {
    Difficulty,
    ExperienceLevel,
    InterviewType,
} from '../../../generated/prisma/client';

export class CreateInterviewDto {
    @ApiPropertyOptional({ description: 'Lưu kế hoạch dưới dạng bản nháp' })
    @IsOptional()
    @IsBoolean()
    saveAsDraft?: boolean;
    @ApiPropertyOptional({ description: 'Signed plan preview token' })
    @IsOptional()
    @IsString()
    @MaxLength(100000)
    previewToken?: string;
    @ApiProperty({ format: 'uuid' }) @IsUUID('4') cvId!: string;
    @ApiProperty({ format: 'uuid' }) @IsUUID('4') jobDescriptionId!: string;
    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID('4')
    cvJdMatchId?: string;
    @ApiProperty({ enum: InterviewType })
    @IsEnum(InterviewType)
    interviewType!: InterviewType;
    @ApiProperty({ enum: Difficulty })
    @IsEnum(Difficulty)
    difficulty!: Difficulty;
    @ApiProperty({ enum: [15, 30, 45, 60] })
    @IsIn([15, 30, 45, 60])
    durationMinutes!: number;
    @ApiProperty({ minimum: 3, maximum: 30 })
    @IsInt()
    @IsIn(Array.from({ length: 28 }, (_, i) => i + 3))
    questionCount!: number;
    @ApiProperty({ type: [String] })
    @IsArray()
    @ArrayUnique()
    @ArrayMaxSize(8)
    @IsString({ each: true })
    @MinLength(2, { each: true })
    @MaxLength(100, { each: true })
    focusAreas!: string[];
    @ApiProperty()
    @IsString()
    @MinLength(2)
    @MaxLength(150)
    targetRole!: string;
    @ApiPropertyOptional({ enum: ExperienceLevel, nullable: true })
    @IsOptional()
    @IsEnum(ExperienceLevel)
    targetLevel?: ExperienceLevel | null;
}
