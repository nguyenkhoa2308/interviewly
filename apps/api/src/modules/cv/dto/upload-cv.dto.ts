import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadCvDto {
    @ApiProperty({
        example: 'Frontend Developer CV',
        maxLength: 150,
    })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'CV_NAME_REQUIRED' })
    @IsNotEmpty({ message: 'CV_NAME_REQUIRED' })
    @MaxLength(150, { message: 'CV_NAME_TOO_LONG' })
    name!: string;
}
