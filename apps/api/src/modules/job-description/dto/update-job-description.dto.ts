import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
    JD_COMPANY_MAX_LENGTH,
    JD_CONTENT_MAX_LENGTH,
    JD_CONTENT_MIN_LENGTH,
    JD_TITLE_MAX_LENGTH,
} from '../constants/job-description.constant';

const trim = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class UpdateJobDescriptionDto {
    @Transform(trim)
    @IsOptional()
    @IsString({ message: 'Tiêu đề công việc phải là chuỗi ký tự.' })
    @MinLength(2, { message: 'Tiêu đề công việc phải có ít nhất 2 ký tự.' })
    @MaxLength(JD_TITLE_MAX_LENGTH)
    title?: string;

    @Transform(trim)
    @IsOptional()
    @IsString({ message: 'Tên công ty phải là chuỗi ký tự.' })
    @MaxLength(JD_COMPANY_MAX_LENGTH)
    company?: string | null;

    @Transform(trim)
    @IsOptional()
    @IsString({ message: 'Nội dung JD phải là chuỗi ký tự.' })
    @MinLength(JD_CONTENT_MIN_LENGTH, {
        message: `Nội dung JD phải có ít nhất ${JD_CONTENT_MIN_LENGTH} ký tự.`,
    })
    @MaxLength(JD_CONTENT_MAX_LENGTH)
    content?: string;
}
