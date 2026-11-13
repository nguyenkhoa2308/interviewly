import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum DashboardRange {
    LAST_7_DAYS = '7d',
    LAST_30_DAYS = '30d',
    LAST_90_DAYS = '90d',
}

export class DashboardSummaryQueryDto {
    @ApiPropertyOptional({
        enum: DashboardRange,
        default: DashboardRange.LAST_30_DAYS,
        description: 'Khoảng thời gian tương đối áp dụng cho Dashboard.',
    })
    @IsOptional()
    @IsEnum(DashboardRange, { message: 'DASHBOARD_INVALID_RANGE' })
    range: DashboardRange = DashboardRange.LAST_30_DAYS;
}
