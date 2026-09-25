import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListCvJdMatchesQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 10;

    @IsOptional()
    @IsUUID('4')
    cvId?: string;

    @IsOptional()
    @IsUUID('4')
    jobDescriptionId?: string;
}