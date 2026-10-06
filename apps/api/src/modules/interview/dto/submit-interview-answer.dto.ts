import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SubmitInterviewAnswerDto {
    @ApiProperty({ description: 'ID lượt hỏi hiện đang hiển thị' })
    @IsUUID('4')
    turnId!: string;

    @ApiProperty({
        description: 'Câu trả lời của ứng viên',
        minLength: 1,
        maxLength: 10_000,
    })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @MinLength(1, { message: 'Câu trả lời không được để trống.' })
    @MaxLength(10_000, {
        message: 'Câu trả lời không được vượt quá 10.000 ký tự.',
    })
    answer!: string;
}
