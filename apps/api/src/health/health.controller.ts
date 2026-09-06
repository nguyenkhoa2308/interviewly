import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @ApiOperation({
        summary: 'Kiểm tra trạng thái hệ thống',
        description:
            'Kiểm tra backend đang hoạt động và có thể kết nối tới database.',
    })
    @ApiResponse({
        status: 200,
        description: 'Backend và database đang hoạt động.',
    })
    @ApiResponse({
        status: 503,
        description: 'Hệ thống hoặc kết nối database chưa sẵn sàng.',
    })
    check() {
        return this.healthService.check();
    }
}
