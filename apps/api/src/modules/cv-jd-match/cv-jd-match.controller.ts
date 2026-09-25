import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CvJdMatchService } from './cv-jd-match.service';
import { CreateCvJdMatchDto } from './dto/create-cv-jd-match.dto';
import { ListCvJdMatchesQueryDto } from './dto/list-cv-jd-matches-query.dto';

@ApiTags('CV–JD Matching')
@Controller('cv-jd-matches')
@UseGuards(JwtAuthGuard)
export class CvJdMatchController {
    constructor(private readonly service: CvJdMatchService) {}

    @Post()
    @ApiOperation({ summary: 'Đối chiếu CV với mô tả công việc' })
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateCvJdMatchDto) {
        return this.service.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Lịch sử đối chiếu CV–JD' })
    list(@CurrentUser() user: AuthUser, @Query() query: ListCvJdMatchesQueryDto) {
        return this.service.list(user.id, query);
    }

    @Get('options')
    @ApiOperation({ summary: 'Danh sách CV và JD có thể chọn để đối chiếu' })
    options(@CurrentUser() user: AuthUser) {
        return this.service.options(user.id);
    }
    @Get(':id')
    @ApiOperation({ summary: 'Chi tiết kết quả đối chiếu CV–JD' })
    get(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.service.get(user.id, id);
    }
}