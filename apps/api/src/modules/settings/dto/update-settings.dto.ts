import { Transform, Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsEnum,
    IsIn,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import {
    ContentPreference,
    Difficulty,
    FeedbackDetail,
    InteractionMode,
    InterviewerStyle,
    InterviewType,
    Language,
    LearningStyle,
    Theme,
} from '../../../generated/prisma/client';

export const SETTINGS_DURATION_OPTIONS = [15, 30, 45, 60] as const;

export class GeneralSettingsDto {
    @ApiPropertyOptional({ enum: Language, example: Language.VI })
    @IsOptional()
    @IsEnum(Language, { message: 'Ngôn ngữ không hợp lệ.' })
    preferredLanguage?: Language;

    @ApiPropertyOptional({ enum: Theme, example: Theme.SYSTEM })
    @IsOptional()
    @IsEnum(Theme, { message: 'Giao diện không hợp lệ.' })
    theme?: Theme;

    @ApiPropertyOptional({
        example: 'Asia/Ho_Chi_Minh',
        nullable: true,
        description: 'Múi giờ IANA; gửi null để dùng múi giờ mặc định.',
    })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() || null : value,
    )
    @IsString({ message: 'Múi giờ phải là chuỗi ký tự.' })
    @MaxLength(100, { message: 'Múi giờ không được vượt quá 100 ký tự.' })
    timezone?: string | null;
}

export class InterviewPreferencesSettingsDto {
    @ApiPropertyOptional({ enum: Difficulty, nullable: true })
    @IsOptional()
    @IsEnum(Difficulty, { message: 'Độ khó mặc định không hợp lệ.' })
    defaultDifficulty?: Difficulty | null;

    @ApiPropertyOptional({ enum: InterviewType, nullable: true })
    @IsOptional()
    @IsEnum(InterviewType, { message: 'Loại phỏng vấn mặc định không hợp lệ.' })
    defaultInterviewType?: InterviewType | null;

    @ApiPropertyOptional({ enum: InterviewerStyle, nullable: true })
    @IsOptional()
    @IsEnum(InterviewerStyle, {
        message: 'Phong cách người phỏng vấn không hợp lệ.',
    })
    interviewerStyle?: InterviewerStyle | null;

    @ApiPropertyOptional({
        enum: SETTINGS_DURATION_OPTIONS,
        example: 30,
        description: 'Thời lượng mặc định của buổi luyện tập, tính bằng phút.',
    })
    @IsOptional()
    @IsIn(SETTINGS_DURATION_OPTIONS, {
        message: 'Thời lượng mặc định phải là 15, 30, 45 hoặc 60 phút.',
    })
    defaultDurationMinutes?: number;
}

export class LearningAndFeedbackSettingsDto {
    @ApiPropertyOptional({ enum: LearningStyle, nullable: true })
    @IsOptional()
    @IsEnum(LearningStyle, { message: 'Phong cách học tập không hợp lệ.' })
    learningStyle?: LearningStyle | null;

    @ApiPropertyOptional({ enum: ContentPreference, isArray: true })
    @IsOptional()
    @IsArray({ message: 'Nội dung ưu tiên phải là một danh sách.' })
    @ArrayUnique({ message: 'Nội dung ưu tiên không được trùng lặp.' })
    @IsEnum(ContentPreference, {
        each: true,
        message: 'Nội dung ưu tiên không hợp lệ.',
    })
    contentPreferences?: ContentPreference[];

    @ApiPropertyOptional({ enum: FeedbackDetail, nullable: true })
    @IsOptional()
    @IsEnum(FeedbackDetail, { message: 'Mức độ phản hồi không hợp lệ.' })
    feedbackDetail?: FeedbackDetail | null;
}

export class VoiceAndAudioSettingsDto {
    @ApiPropertyOptional({ enum: InteractionMode })
    @IsOptional()
    @IsEnum(InteractionMode, { message: 'Chế độ tương tác không hợp lệ.' })
    defaultInteractionMode?: InteractionMode;

    @ApiPropertyOptional({ example: 'vi-VN-Neural2-A', nullable: true })
    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() || null : value,
    )
    @IsString({ message: 'Tên giọng đọc phải là chuỗi ký tự.' })
    @MaxLength(100, { message: 'Tên giọng đọc không được vượt quá 100 ký tự.' })
    voiceName?: string | null;

    @ApiPropertyOptional({ example: 1, minimum: 0.5, maximum: 2 })
    @IsOptional()
    @IsNumber(
        { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
        { message: 'Tốc độ giọng đọc phải là một số hợp lệ.' },
    )
    @Min(0.5, { message: 'Tốc độ giọng đọc phải từ 0.5 đến 2.' })
    @Max(2, { message: 'Tốc độ giọng đọc phải từ 0.5 đến 2.' })
    speechSpeed?: number;

    @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 1 })
    @IsOptional()
    @IsNumber(
        { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false },
        { message: 'Âm lượng phải là một số hợp lệ.' },
    )
    @Min(0, { message: 'Âm lượng phải từ 0 đến 1.' })
    @Max(1, { message: 'Âm lượng phải từ 0 đến 1.' })
    volume?: number;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean({ message: 'Tùy chọn lưu âm thanh phải là boolean.' })
    saveInterviewAudio?: boolean;
}

export class UpdateSettingsDto {
    @ApiPropertyOptional({ type: GeneralSettingsDto })
    @ValidateIf(
        (_dto: UpdateSettingsDto, value: unknown) => value !== undefined,
    )
    @IsObject({ message: 'Cài đặt chung phải là một object.' })
    @ValidateNested()
    @Type(() => GeneralSettingsDto)
    general?: GeneralSettingsDto;

    @ApiPropertyOptional({ type: InterviewPreferencesSettingsDto })
    @ValidateIf(
        (_dto: UpdateSettingsDto, value: unknown) => value !== undefined,
    )
    @IsObject({ message: 'Tùy chọn phỏng vấn phải là một object.' })
    @ValidateNested()
    @Type(() => InterviewPreferencesSettingsDto)
    interviewPreferences?: InterviewPreferencesSettingsDto;

    @ApiPropertyOptional({ type: LearningAndFeedbackSettingsDto })
    @ValidateIf(
        (_dto: UpdateSettingsDto, value: unknown) => value !== undefined,
    )
    @IsObject({ message: 'Tùy chọn học tập và phản hồi phải là một object.' })
    @ValidateNested()
    @Type(() => LearningAndFeedbackSettingsDto)
    learningAndFeedback?: LearningAndFeedbackSettingsDto;

    @ApiPropertyOptional({ type: VoiceAndAudioSettingsDto })
    @ValidateIf(
        (_dto: UpdateSettingsDto, value: unknown) => value !== undefined,
    )
    @IsObject({ message: 'Cài đặt giọng nói và âm thanh phải là một object.' })
    @ValidateNested()
    @Type(() => VoiceAndAudioSettingsDto)
    voiceAndAudio?: VoiceAndAudioSettingsDto;
}
