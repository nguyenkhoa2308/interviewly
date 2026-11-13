import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary-query.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('summary')
    @ApiOperation({
        summary: 'Lấy dữ liệu tổng quan Dashboard của người dùng hiện tại',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy dữ liệu Dashboard thành công.',
    })
    @ApiResponse({
        status: 401,
        description: 'Chưa đăng nhập hoặc phiên không hợp lệ.',
    })
    getSummary(
        @CurrentUser() user: AuthUser,
        @Query() query: DashboardSummaryQueryDto,
    ) {
        return this.dashboardService.getSummary(user.id, query.range);
    }
}
