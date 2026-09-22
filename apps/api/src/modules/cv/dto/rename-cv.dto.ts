import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenameCvDto {
    @ApiProperty({ example: 'Frontend CV 2026', maxLength: 150 })
    @Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString({ message: 'CV_NAME_REQUIRED' })
    @IsNotEmpty({ message: 'CV_NAME_REQUIRED' })
    @MaxLength(150, { message: 'CV_NAME_TOO_LONG' })
    name!: string;
}
