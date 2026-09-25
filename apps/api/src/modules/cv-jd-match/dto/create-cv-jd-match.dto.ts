import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateCvJdMatchDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID('4', { message: 'CV không hợp lệ.' })
    cvId!: string;

    @ApiProperty({ format: 'uuid' })
    @IsUUID('4', { message: 'Mô tả công việc không hợp lệ.' })
    jobDescriptionId!: string;
}