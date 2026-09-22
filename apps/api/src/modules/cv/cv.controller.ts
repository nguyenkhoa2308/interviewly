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
    UploadedFile,
    UseFilters,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { CvService } from './cv.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { MAX_CV_FILE_SIZE } from './constants/cv.constant';
import { UploadCvDto } from './dto/upload-cv.dto';
import { ListCvsQueryDto } from './dto/list-cvs-query.dto';
import { RenameCvDto } from './dto/rename-cv.dto';
import { CvUploadExceptionFilter } from './filters/cv-upload-exception.filter';
import { CvFileValidationPipe } from './pipes/cv-file-validation.pipe';
import { CvAnalysisService } from './cv-analysis/cv-analysis.service';
import { ListCvAnalysesQueryDto } from './cv-analysis/dto/list-cv-analyses-query.dto';
import { CompareCvVersionsQueryDto } from './cv-analysis/dto/compare-cv-versions-query.dto';
import { CompareCvsQueryDto } from './cv-analysis/dto/compare-cvs-query.dto';

@ApiTags('CV')
@Controller('cvs')
@UseGuards(JwtAuthGuard)
export class CvController {
    constructor(
        private readonly cvService: CvService,
        private readonly cvAnalysisService: CvAnalysisService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Danh sách CV',
        description:
            'Yêu cầu đăng nhập. Chỉ trả CV chưa xóa của tài khoản hiện tại, mới nhất trước.',
    })
    @ApiResponse({ status: 200, description: 'Danh sách CV có phân trang.' })
    listCvs(@CurrentUser() user: AuthUser, @Query() query: ListCvsQueryDto) {
        return this.cvService.listCvs(user.id, query);
    }

    @Get('compare')
    @ApiOperation({ summary: 'So sánh hai CV khác nhau' })
    compareCvs(
        @CurrentUser() user: AuthUser,
        @Query() query: CompareCvsQueryDto,
    ) {
        return this.cvAnalysisService.compareCvs(
            user.id,
            query.leftCvId,
            query.rightCvId,
        );
    }

    @Post(':cvId/analyze')
    @ApiOperation({
        summary: 'Phân tích CV bằng AI',
        description:
            'Phân tích đồng bộ một CV READY thuộc tài khoản hiện tại. Backend tự lấy extractedText; client không gửi nội dung CV hoặc kết quả AI.',
    })
    @ApiResponse({ status: 201, description: 'Phân tích hoàn tất.' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy CV.' })
    @ApiResponse({
        status: 409,
        description: 'CV đang có một analysis PROCESSING.',
    })
    @ApiResponse({
        status: 422,
        description: 'CV chưa READY hoặc không có văn bản.',
    })
    @ApiResponse({
        status: 502,
        description: 'AI trả về kết quả không hợp lệ.',
    })
    analyzeCv(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
    ) {
        return this.cvAnalysisService.analyze(user.id, cvId);
    }

    @Get(':cvId/analyses/latest')
    @ApiOperation({
        summary: 'Kết quả phân tích CV mới nhất',
        description:
            'Trả về analysis COMPLETED mới nhất; một lần FAILED mới hơn không thay thế kết quả thành công gần nhất.',
    })
    @ApiResponse({ status: 200, description: 'Kết quả COMPLETED mới nhất.' })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy CV hoặc chưa có kết quả.',
    })
    getLatestAnalysis(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
    ) {
        return this.cvAnalysisService.getLatest(user.id, cvId);
    }

    @Get(':cvId/analyses')
    @ApiOperation({
        summary: 'Lịch sử phân tích CV',
        description:
            'Trả lịch sử PROCESSING, COMPLETED và FAILED theo thứ tự mới nhất trước, có phân trang.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lịch sử phân tích có phân trang.',
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy CV.' })
    listAnalyses(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
        @Query() query: ListCvAnalysesQueryDto,
    ) {
        return this.cvAnalysisService.listHistory(user.id, cvId, query);
    }

    @Get(':cvId/versions')
    @ApiOperation({ summary: 'Danh sách phiên bản của CV' })
    listVersions(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
    ) {
        return this.cvService.listVersions(user.id, cvId);
    }

    @Get(':cvId/versions/compare')
    @ApiOperation({ summary: 'So sánh kết quả AI giữa hai phiên bản CV' })
    compareVersions(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
        @Query() query: CompareCvVersionsQueryDto,
    ) {
        return this.cvAnalysisService.compareVersions(
            user.id,
            cvId,
            query.fromVersionId,
            query.toVersionId,
        );
    }

    @Post(':cvId/versions')
    @UseFilters(CvUploadExceptionFilter)
    @ApiOperation({ summary: 'Tải lên phiên bản mới của CV' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
            required: ['file'],
        },
    })
    @UseInterceptors(
        FileInterceptor('file', { limits: { fileSize: MAX_CV_FILE_SIZE + 1 } }),
    )
    uploadVersion(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
        @UploadedFile(CvFileValidationPipe) file: Express.Multer.File,
    ) {
        return this.cvService.uploadVersion(user.id, cvId, file);
    }

    @Patch(':cvId/versions/:versionId/current')
    @ApiOperation({ summary: 'Chọn phiên bản hiện hành của CV' })
    setCurrentVersion(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
        @Param('versionId', new ParseUUIDPipe({ version: '4' }))
        versionId: string,
    ) {
        return this.cvService.setCurrentVersion(user.id, cvId, versionId);
    }

    @Get(':cvId')
    @ApiOperation({
        summary: 'Chi tiết CV',
        description:
            'Yêu cầu đăng nhập và quyền sở hữu CV. Bao gồm nội dung chữ đã trích xuất.',
    })
    @ApiResponse({ status: 200, description: 'Chi tiết CV.' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy CV.' })
    getCv(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
    ) {
        return this.cvService.getCv(user.id, cvId);
    }

    @Patch(':cvId/default')
    @ApiOperation({
        summary: 'Đặt CV mặc định',
        description:
            'Yêu cầu đăng nhập. Bỏ mặc định CV hiện tại và đặt CV được chọn làm mặc định trong một transaction.',
    })
    @ApiResponse({ status: 200, description: 'Đã đặt CV mặc định.' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy CV.' })
    setDefaultCv(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
    ) {
        return this.cvService.setDefaultCv(user.id, cvId);
    }

    @Patch(':cvId')
    @ApiOperation({
        summary: 'Đổi tên CV',
        description:
            'Yêu cầu đăng nhập và quyền sở hữu. Chỉ đổi tên hiển thị trong database, không đổi object R2.',
    })
    @ApiResponse({ status: 200, description: 'Đổi tên CV thành công.' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy CV.' })
    renameCv(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
        @Body() dto: RenameCvDto,
    ) {
        return this.cvService.renameCv(user.id, cvId, dto);
    }

    @Delete(':cvId')
    @ApiOperation({
        summary: 'Xóa CV',
        description:
            'Yêu cầu đăng nhập. Soft-delete CV; không xóa record, analyses hoặc object R2 trong Basic v1.',
    })
    @ApiResponse({ status: 200, description: 'Xóa CV thành công.' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy CV.' })
    deleteCv(
        @CurrentUser() user: AuthUser,
        @Param('cvId', new ParseUUIDPipe({ version: '4' })) cvId: string,
    ) {
        return this.cvService.deleteCv(user.id, cvId);
    }

    @Post()
    @UseFilters(CvUploadExceptionFilter)
    @ApiOperation({
        summary: 'Tải CV lên',
        description:
            'Yêu cầu đăng nhập. Nhận PDF tối đa 5 MB, lưu bản gốc và trích xuất nội dung chữ đồng bộ.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    example: 'Frontend Developer CV',
                },
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
            required: ['name', 'file'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'CV đã được tải lên, trích xuất nội dung và sẵn sàng.',
    })
    @ApiResponse({
        status: 400,
        description: 'Tên hoặc tệp CV không hợp lệ.',
    })
    @ApiResponse({
        status: 401,
        description: 'Chưa đăng nhập hoặc phiên đăng nhập không hợp lệ.',
    })
    @ApiResponse({
        status: 503,
        description: 'Không thể lưu tệp CV.',
    })
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: MAX_CV_FILE_SIZE + 1,
            },
        }),
    )
    uploadCv(
        @CurrentUser() user: AuthUser,
        @UploadedFile(CvFileValidationPipe) file: Express.Multer.File,
        @Body() dto: UploadCvDto,
    ) {
        return this.cvService.uploadCv(user.id, file, dto);
    }
}
