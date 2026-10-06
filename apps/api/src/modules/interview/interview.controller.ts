import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { DeleteInterviewsDto } from './dto/delete-interviews.dto';
import { ListInterviewPlansQueryDto } from './dto/list-interview-plans-query.dto';
import { ListInterviewsQueryDto } from './dto/list-interviews-query.dto';
import { SubmitInterviewAnswerDto } from './dto/submit-interview-answer.dto';
import { InterviewRuntimeService } from './interview-runtime.service';
import { InterviewService } from './interview.service';
@ApiTags('Interviews')
@Controller('interviews')
@UseGuards(JwtAuthGuard)
export class InterviewController {
    constructor(
        private readonly service: InterviewService,
        private readonly runtime: InterviewRuntimeService,
    ) {}
    @Get('options')
    @ApiOperation({ summary: 'Nguồn dữ liệu có thể dùng để tạo phỏng vấn' })
    options(@CurrentUser() u: AuthUser) {
        return this.service.options(u.id);
    }
    @Post('preview')
    @ApiOperation({
        summary: 'Tạo bản xem trước kế hoạch AI, chưa lưu buổi phỏng vấn',
    })
    preview(@CurrentUser() u: AuthUser, @Body() d: CreateInterviewDto) {
        return this.service.preview(u.id, d);
    }
    @Get()
    @ApiOperation({ summary: 'Danh sách phỏng vấn của người dùng' })
    list(@CurrentUser() u: AuthUser, @Query() query: ListInterviewsQueryDto) {
        return this.service.list(u.id, query);
    }
    @Post()
    @ApiOperation({ summary: 'Tạo buổi phỏng vấn và kế hoạch AI' })
    create(@CurrentUser() u: AuthUser, @Body() d: CreateInterviewDto) {
        return this.service.create(u.id, d);
    }
    @Delete('bulk')
    @ApiOperation({
        summary: 'Xóa nhiều buổi phỏng vấn thuộc người dùng hiện tại',
    })
    removeMany(@CurrentUser() u: AuthUser, @Body() d: DeleteInterviewsDto) {
        return this.service.removeMany(u.id, d.ids);
    }
    @Post(':id/start')
    @ApiOperation({ summary: 'Bắt đầu hoặc tiếp tục phiên phỏng vấn văn bản' })
    start(
        @CurrentUser() u: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.runtime.start(u.id, id);
    }
    @Get(':id/session')
    @ApiOperation({ summary: 'Trạng thái runtime hiện tại của buổi phỏng vấn' })
    session(
        @CurrentUser() u: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.runtime.getState(u.id, id);
    }
    @Post(':id/session/answers')
    @ApiOperation({ summary: 'Gửi câu trả lời cho câu hỏi hiện tại' })
    answer(
        @CurrentUser() u: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Body() dto: SubmitInterviewAnswerDto,
    ) {
        return this.runtime.submitAnswer(u.id, id, dto.turnId, dto.answer);
    }
    @Get(':id') @ApiOperation({ summary: 'Chi tiết buổi phỏng vấn' }) get(
        @CurrentUser() u: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.service.get(u.id, id);
    }
    @Delete(':id')
    @ApiOperation({ summary: 'Xóa buổi phỏng vấn' })
    remove(
        @CurrentUser() u: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.service.remove(u.id, id);
    }
    @Post(':id/plans')
    @ApiOperation({ summary: 'Tạo lại kế hoạch phỏng vấn' })
    regenerate(
        @CurrentUser() u: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.service.regenerate(u.id, id);
    }
    @Get(':id/plans/latest')
    @ApiOperation({ summary: 'Kế hoạch thành công mới nhất' })
    latest(
        @CurrentUser() u: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    ) {
        return this.service.latestPlan(u.id, id);
    }
    @Get(':id/plans') @ApiOperation({ summary: 'Lịch sử lập kế hoạch' }) plans(
        @CurrentUser() u: AuthUser,
        @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
        @Query() q: ListInterviewPlansQueryDto,
    ) {
        return this.service.plans(u.id, id, q);
    }
}
