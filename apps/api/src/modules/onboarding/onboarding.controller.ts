import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import type { AuthUser } from '../auth/types/auth-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) {}

    @Get()
    @ApiOperation({
        summary: 'Lấy thông tin onboarding của người dùng hiện tại.',
    })
    @ApiResponse({
        status: 200,
        description:
            'Lấy thông tin onboarding của người dùng hiện tại thành công.',
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập.',
    })
    getOnboarding(@CurrentUser() user: AuthUser) {
        return this.onboardingService.getOnboarding(user.id);
    }

    @Post('complete')
    @ApiOperation({
        summary: 'Hoàn tất onboarding',
        description:
            'Lưu thông tin cá nhân và tùy chọn phỏng vấn, sau đó đánh dấu người dùng đã vượt qua onboarding.',
    })
    @ApiResponse({
        status: 201,
        description: 'Hoàn tất onboarding thành công.',
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu onboarding không hợp lệ.',
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập.',
    })
    completeOnboarding(
        @CurrentUser() user: AuthUser,
        @Body() dto: CompleteOnboardingDto,
    ) {
        return this.onboardingService.completeOnboarding(user.id, dto);
    }

    @Post('skip')
    @ApiOperation({
        summary: 'Bỏ qua onboarding',
        description:
            'Đánh dấu người dùng đã vượt qua onboarding mà không tạo hoặc thay đổi dữ liệu tùy chọn.',
    })
    @ApiResponse({
        status: 201,
        description: 'Bỏ qua onboarding thành công.',
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập.',
    })
    skipOnboarding(@CurrentUser() user: AuthUser) {
        return this.onboardingService.skipOnboarding(user.id);
    }
}
