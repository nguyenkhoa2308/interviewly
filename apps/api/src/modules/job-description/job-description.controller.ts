import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateJobDescriptionDto } from './dto/create-job-description.dto';
import { ListJdAnalysesQueryDto } from './dto/list-jd-analyses-query.dto';
import { ListJobDescriptionsQueryDto } from './dto/list-job-descriptions-query.dto';
import { UpdateJobDescriptionDto } from './dto/update-job-description.dto';
import { JobDescriptionService } from './job-description.service';

@ApiTags('Job Descriptions')
@Controller('job-descriptions')
@UseGuards(JwtAuthGuard)
export class JobDescriptionController {
    constructor(private readonly service: JobDescriptionService) {}

    @Post()
    @ApiOperation({ summary: 'Tạo mô tả công việc' })
    create(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateJobDescriptionDto,
    ) {
        return this.service.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Danh sách mô tả công việc của người dùng' })
    list(
        @CurrentUser() user: AuthUser,
        @Query() query: ListJobDescriptionsQueryDto,
    ) {
        return this.service.list(user.id, query);
    }

    @Post(':id/analyze')
    @ApiOperation({ summary: 'Phân tích JD bằng AI' })
    analyze(
        @CurrentUser() user: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.service.analyze(user.id, id);
    }

    @Get(':id/analyses/latest')
    @ApiOperation({ summary: 'Kết quả phân tích JD thành công mới nhất' })
    latest(
        @CurrentUser() user: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.service.latest(user.id, id);
    }

    @Get(':id/analyses')
    @ApiOperation({ summary: 'Lịch sử phân tích JD' })
    history(
        @CurrentUser() user: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Query() query: ListJdAnalysesQueryDto,
    ) {
        return this.service.history(user.id, id, query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết mô tả công việc' })
    get(
        @CurrentUser() user: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.service.get(user.id, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Cập nhật mô tả công việc' })
    update(
        @CurrentUser() user: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() dto: UpdateJobDescriptionDto,
    ) {
        return this.service.update(user.id, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa mềm mô tả công việc' })
    delete(
        @CurrentUser() user: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.service.delete(user.id, id);
    }
}
