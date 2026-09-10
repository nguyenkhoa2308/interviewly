import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @ApiOperation({
        summary: 'Lấy cài đặt của người dùng hiện tại',
        description:
            'Yêu cầu đăng nhập bằng HttpOnly cookie. Hãy gọi POST /auth/login trước khi thử API này trên Swagger.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy cài đặt thành công.',
    })
    @ApiResponse({
        status: 401,
        description: 'Chưa đăng nhập hoặc phiên đăng nhập không hợp lệ.',
    })
    getSettings(@CurrentUser() user: AuthUser) {
        return this.settingsService.getSettings(user.id);
    }

    @Patch()
    @ApiOperation({
        summary: 'Cập nhật cài đặt của người dùng hiện tại',
        description:
            'Chỉ cập nhật các field được gửi lên. Yêu cầu đăng nhập bằng HttpOnly cookie.',
    })
    @ApiResponse({ status: 200, description: 'Cập nhật cài đặt thành công.' })
    @ApiResponse({ status: 400, description: 'Dữ liệu cài đặt không hợp lệ.' })
    @ApiResponse({
        status: 401,
        description: 'Chưa đăng nhập hoặc phiên đăng nhập không hợp lệ.',
    })
    updateSettings(
        @CurrentUser() user: AuthUser,
        @Body() dto: UpdateSettingsDto,
    ) {
        return this.settingsService.updateSettings(user.id, dto);
    }
}
