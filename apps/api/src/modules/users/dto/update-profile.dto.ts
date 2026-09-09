import { Transform } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
    ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import {
    ExperienceLevel,
    InterviewGoal,
} from '../../../generated/prisma/client';

export class UpdateProfileDto {
    @ApiPropertyOptional({
        description: 'Tên hiển thị của người dùng.',
        example: 'Nguyễn Đức Khoa',
        minLength: 2,
        maxLength: 150,
    })
    @ValidateIf((_dto: UpdateProfileDto, value: unknown) => value !== undefined)
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
    @MinLength(2, { message: 'Họ và tên phải có ít nhất 2 ký tự.' })
    @MaxLength(150, { message: 'Họ và tên không được vượt quá 150 ký tự.' })
    fullName?: string;

    @ApiPropertyOptional({
        description:
            'Vị trí công việc người dùng đang hướng tới; gửi null để xóa.',
        example: 'Backend Developer',
        minLength: 2,
        maxLength: 100,
        nullable: true,
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'Vị trí mục tiêu phải là chuỗi ký tự.' })
    @MinLength(2, { message: 'Vị trí mục tiêu phải có ít nhất 2 ký tự.' })
    @MaxLength(100, {
        message: 'Vị trí mục tiêu không được vượt quá 100 ký tự.',
    })
    targetRole?: string | null;

    @ApiPropertyOptional({
        enum: ExperienceLevel,
        example: ExperienceLevel.JUNIOR,
    })
    @IsOptional()
    @IsEnum(ExperienceLevel, { message: 'Cấp độ kinh nghiệm không hợp lệ.' })
    experienceLevel?: ExperienceLevel | null;

    @ApiPropertyOptional({
        description:
            'Số năm kinh nghiệm; gửi null hoặc chuỗi rỗng để xóa giá trị.',
        example: 1.5,
        minimum: 0,
        maximum: 99.9,
        nullable: true,
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => {
        if (
            value === null ||
            (typeof value === 'string' && value.trim() === '')
        ) {
            return null;
        }
        return typeof value === 'number' ? value : Number(value);
    })
    @IsNumber(
        { maxDecimalPlaces: 1, allowNaN: false, allowInfinity: false },
        { message: 'Số năm kinh nghiệm không hợp lệ.' },
    )
    @Min(0, { message: 'Số năm kinh nghiệm không được nhỏ hơn 0.' })
    @Max(99.9, { message: 'Số năm kinh nghiệm không được lớn hơn 99.9.' })
    yearsOfExperience?: number | null;

    @ApiPropertyOptional({
        enum: InterviewGoal,
        isArray: true,
        example: [InterviewGoal.GET_A_JOB, InterviewGoal.OTHER],
    })
    @ValidateIf((_dto: UpdateProfileDto, value: unknown) => value !== undefined)
    @IsArray({ message: 'Mục tiêu phỏng vấn phải là một danh sách.' })
    @ArrayUnique({ message: 'Mục tiêu phỏng vấn không được trùng lặp.' })
    @IsEnum(InterviewGoal, {
        each: true,
        message: 'Mục tiêu phỏng vấn không hợp lệ.',
    })
    interviewGoals?: InterviewGoal[];

    @ApiPropertyOptional({
        description:
            'Bắt buộc khi trạng thái interviewGoals cuối cùng có OTHER; tự động lưu null nếu không có OTHER.',
        example: 'Luyện phỏng vấn bằng tiếng Anh',
        maxLength: 255,
        nullable: true,
    })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @ValidateIf(
        (_dto: UpdateProfileDto, value: unknown) =>
            value !== undefined && value !== null,
    )
    @IsString({ message: 'Mục tiêu khác phải là chuỗi ký tự.' })
    @MaxLength(255, {
        message: 'Mục tiêu khác không được vượt quá 255 ký tự.',
    })
    customInterviewGoal?: string | null;
}
