import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    @ApiOperation({
        summary: 'Kiểm tra API',
        description: 'Trả về phản hồi cơ bản để xác nhận API đang hoạt động.',
    })
    @ApiResponse({ status: 200, description: 'API đang hoạt động.' })
    getHello(): string {
        return this.appService.getHello();
    }
}
