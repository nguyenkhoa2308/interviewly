import { IsUUID } from 'class-validator';

export class CompareCvsQueryDto {
    @IsUUID('4', { message: 'CV thứ nhất không hợp lệ.' })
    leftCvId!: string;

    @IsUUID('4', { message: 'CV thứ hai không hợp lệ.' })
    rightCvId!: string;
}
