import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListCvAnalysesQueryDto {
    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @Type(() => Number)
    @IsInt({ message: 'CV_ANALYSIS_INVALID_PAGE' })
    @Min(1, { message: 'CV_ANALYSIS_INVALID_PAGE' })
    page = 1;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
    @Type(() => Number)
    @IsInt({ message: 'CV_ANALYSIS_INVALID_LIMIT' })
    @Min(1, { message: 'CV_ANALYSIS_INVALID_LIMIT' })
    @Max(100, { message: 'CV_ANALYSIS_INVALID_LIMIT' })
    limit = 20;
}
