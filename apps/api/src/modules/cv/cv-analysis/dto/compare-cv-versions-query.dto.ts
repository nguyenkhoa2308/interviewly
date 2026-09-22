import { IsUUID } from 'class-validator';

export class CompareCvVersionsQueryDto {
    @IsUUID('4', { message: 'Phiên bản gốc không hợp lệ.' })
    fromVersionId!: string;

    @IsUUID('4', { message: 'Phiên bản so sánh không hợp lệ.' })
    toVersionId!: string;
}
