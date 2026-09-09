import { Transform } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    ContentPreference,
    Difficulty,
    ExperienceLevel,
    FeedbackDetail,
    InterviewGoal,
    LearningStyle,
} from '../../../generated/prisma/client';

export class CompleteOnboardingDto {
    @ApiPropertyOptional({
        example: 'Nguyễn Đức Khoa',
        maxLength: 150,
    })
    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Họ và tên không được để trống.' })
    @MaxLength(150, {
        message: 'Họ và tên không được vượt quá 150 ký tự.',
    })
    fullName?: string;

    @ApiPropertyOptional({
        example: 'https://example.com/avatar.jpg',
    })
    @IsOptional()
    @IsUrl({}, { message: 'URL ảnh đại diện không hợp lệ.' })
    @MaxLength(2048, {
        message: 'URL ảnh đại diện không được vượt quá 2048 ký tự.',
    })
    avatarUrl?: string;

    @ApiPropertyOptional({
        example: 'Frontend Developer',
        maxLength: 100,
    })
    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'Vị trí mục tiêu phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Vị trí mục tiêu không được để trống.' })
    @MaxLength(100, {
        message: 'Vị trí mục tiêu không được vượt quá 100 ký tự.',
    })
    targetRole?: string;

    @ApiPropertyOptional({
        enum: ExperienceLevel,
        example: ExperienceLevel.FRESHER,
    })
    @IsOptional()
    @IsEnum(ExperienceLevel, {
        message: 'Cấp độ kinh nghiệm không hợp lệ.',
    })
    experienceLevel?: ExperienceLevel;

    @ApiPropertyOptional({
        example: 2.5,
        minimum: 0,
        maximum: 99.9,
    })
    @IsOptional()
    @IsNumber(
        { maxDecimalPlaces: 1 },
        {
            message:
                'Số năm kinh nghiệm phải là số và có tối đa một chữ số thập phân.',
        },
    )
    @Min(0, { message: 'Số năm kinh nghiệm không được nhỏ hơn 0.' })
    @Max(99.9, {
        message: 'Số năm kinh nghiệm không được lớn hơn 99.9.',
    })
    yearsOfExperience?: number;

    @ApiPropertyOptional({
        enum: InterviewGoal,
        isArray: true,
        example: [InterviewGoal.GET_A_JOB, InterviewGoal.IMPROVE_SKILLS],
    })
    @IsOptional()
    @IsArray({ message: 'Mục tiêu phỏng vấn phải là một danh sách.' })
    @IsEnum(InterviewGoal, {
        each: true,
        message: 'Mục tiêu phỏng vấn không hợp lệ.',
    })
    interviewGoals?: InterviewGoal[];

    @ApiPropertyOptional({
        example: 'Prepare for interviews abroad',
        maxLength: 255,
        description:
            'Bắt buộc khi danh sách mục tiêu phỏng vấn có giá trị OTHER.',
    })
    @ValidateIf(
        (dto: CompleteOnboardingDto) =>
            dto.interviewGoals?.includes(InterviewGoal.OTHER) ?? false,
    )
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'Mục tiêu khác phải là chuỗi ký tự.' })
    @IsNotEmpty({ message: 'Vui lòng nhập mục tiêu phỏng vấn khác.' })
    @MaxLength(255, {
        message: 'Mục tiêu khác không được vượt quá 255 ký tự.',
    })
    customInterviewGoal?: string;

    @ApiPropertyOptional({
        enum: LearningStyle,
        example: LearningStyle.LEARN_BY_DOING,
    })
    @IsOptional()
    @IsEnum(LearningStyle, {
        message: 'Phong cách học tập không hợp lệ.',
    })
    learningStyle?: LearningStyle;

    @ApiPropertyOptional({
        enum: ContentPreference,
        isArray: true,
        example: [
            ContentPreference.FRONTEND_FRAMEWORKS,
            ContentPreference.CODING_CHALLENGES,
        ],
    })
    @IsOptional()
    @IsArray({ message: 'Nội dung ưu tiên phải là một danh sách.' })
    @IsEnum(ContentPreference, {
        each: true,
        message: 'Nội dung ưu tiên không hợp lệ.',
    })
    contentPreferences?: ContentPreference[];

    @ApiPropertyOptional({
        example: 30,
        minimum: 1,
        maximum: 180,
        description:
            'Thời lượng ưu tiên cho mỗi buổi luyện tập, tính bằng phút.',
    })
    @IsOptional()
    @IsInt({ message: 'Thời lượng buổi luyện tập phải là số nguyên.' })
    @Min(1, {
        message: 'Thời lượng buổi luyện tập phải ít nhất là 1 phút.',
    })
    @Max(180, {
        message: 'Thời lượng buổi luyện tập không được vượt quá 180 phút.',
    })
    sessionLength?: number;

    @ApiPropertyOptional({
        enum: Difficulty,
        example: Difficulty.MEDIUM,
    })
    @IsOptional()
    @IsEnum(Difficulty, {
        message: 'Độ khó mặc định không hợp lệ.',
    })
    defaultDifficulty?: Difficulty;

    @ApiPropertyOptional({
        enum: FeedbackDetail,
        example: FeedbackDetail.STANDARD,
    })
    @IsOptional()
    @IsEnum(FeedbackDetail, {
        message: 'Mức độ chi tiết phản hồi không hợp lệ.',
    })
    feedbackDetail?: FeedbackDetail;
}
