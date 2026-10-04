import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsUUID,
} from 'class-validator';

export class DeleteInterviewsDto {
    @ApiProperty({
        type: [String],
        description: 'Danh sách ID buổi phỏng vấn cần xóa',
    })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(50)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    ids!: string[];
}
