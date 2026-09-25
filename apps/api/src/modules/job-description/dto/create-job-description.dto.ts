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

export class CreateJobDescriptionDto {
    @Transform(trim)
    @IsString({ message: 'Tiêu đề công việc phải là chuỗi ký tự.' })
    @MinLength(2, { message: 'Tiêu đề công việc phải có ít nhất 2 ký tự.' })
    @MaxLength(JD_TITLE_MAX_LENGTH, {
        message: `Tiêu đề công việc không được vượt quá ${JD_TITLE_MAX_LENGTH} ký tự.`,
    })
    title!: string;

    @Transform(trim)
    @IsOptional()
    @IsString({ message: 'Tên công ty phải là chuỗi ký tự.' })
    @MaxLength(JD_COMPANY_MAX_LENGTH, {
        message: `Tên công ty không được vượt quá ${JD_COMPANY_MAX_LENGTH} ký tự.`,
    })
    company?: string;

    @Transform(trim)
    @IsString({ message: 'Nội dung JD phải là chuỗi ký tự.' })
    @MinLength(JD_CONTENT_MIN_LENGTH, {
        message: `Nội dung JD phải có ít nhất ${JD_CONTENT_MIN_LENGTH} ký tự.`,
    })
    @MaxLength(JD_CONTENT_MAX_LENGTH, {
        message: `Nội dung JD không được vượt quá ${JD_CONTENT_MAX_LENGTH} ký tự.`,
    })
    content!: string;
}
