import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Logger,
    ParseFilePipeBuilder,
    Patch,
    Post,
    UploadedFile,
    UseFilters,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { StorageService } from '../storage/storage.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import {
    ALLOWED_AVATAR_TYPES,
    getAvatarObjectKey,
    getDiceBearAvatarUrl,
    isAvatarPreset,
    MAX_AVATAR_SIZE,
    withAvatarCacheVersion,
} from './constants/avatar.constant';
import { UpdateAvatarPresetDto } from './dto/update-avatar-preset.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AvatarUploadExceptionFilter } from './filters/avatar-upload-exception.filter';
import { AvatarImageService } from './services/avatar-image.service';
import { UsersService } from './users.service';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
    private readonly logger = new Logger(ProfileController.name);

    constructor(
        private readonly userServices: UsersService,
        private readonly avatarImageService: AvatarImageService,
        private readonly storageService: StorageService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Lấy thông tin cá nhân',
        description:
            'Yêu cầu đăng nhập bằng HttpOnly cookie. Hãy gọi POST /auth/login trước khi thử API này trên Swagger.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin cá nhân thành công.',
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập.',
    })
    getProfile(@CurrentUser() user: AuthUser) {
        return this.userServices.getProfile(user.id);
    }

    @Patch()
    @ApiOperation({
        summary: 'Cập nhật thông tin cá nhân',
        description:
            'Yêu cầu đăng nhập bằng HttpOnly cookie. Nếu interviewGoals có OTHER thì customInterviewGoal là bắt buộc; nếu không có OTHER thì trường này được lưu thành null.',
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật thông tin cá nhân thành công.',
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu cập nhật không hợp lệ.',
    })
    @ApiResponse({
        status: 401,
        description: 'Không có quyền truy cập.',
    })
    updateProfile(
        @CurrentUser() user: AuthUser,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.userServices.updateProfile(user.id, dto);
    }

    @Post('avatar')
    @UseFilters(AvatarUploadExceptionFilter)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Tải ảnh đại diện lên',
        description:
            'Nhận JPEG, PNG hoặc WebP tối đa 2 MB; chuẩn hóa thành WebP 256x256 rồi lưu trên R2.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                avatar: {
                    type: 'string',
                    format: 'binary',
                },
            },
            required: ['avatar'],
        },
    })
    @ApiResponse({ status: 201, description: 'Cập nhật avatar thành công.' })
    @ApiResponse({ status: 400, description: 'File avatar không hợp lệ.' })
    @UseInterceptors(
        FileInterceptor('avatar', {
            limits: {
                // Multer marks a file as limited once it reaches the configured
                // value, so +1 keeps an exact 2 MB file valid.
                fileSize: MAX_AVATAR_SIZE + 1,
            },
        }),
    )
    async uploadAvatar(
        @CurrentUser() user: AuthUser,
        @UploadedFile(
            new ParseFilePipeBuilder()
                .addFileTypeValidator({
                    fileType: ALLOWED_AVATAR_TYPES,
                    errorMessage:
                        'Ảnh đại diện chỉ chấp nhận định dạng JPEG, PNG hoặc WebP.',
                })
                .addMaxSizeValidator({
                    // MaxFileSizeValidator uses `<`; +1 keeps exactly 2 MB valid.
                    maxSize: MAX_AVATAR_SIZE + 1,
                    errorMessage: 'Ảnh đại diện không được vượt quá 2 MB.',
                })
                .build({
                    fileIsRequired: true,
                    errorHttpStatusCode: HttpStatus.BAD_REQUEST,
                    exceptionFactory: (message) =>
                        new BadRequestException({
                            code:
                                message === 'File is required'
                                    ? 'AVATAR_FILE_REQUIRED'
                                    : message.includes('định dạng')
                                      ? 'AVATAR_FILE_TYPE_INVALID'
                                      : 'AVATAR_FILE_TOO_LARGE',
                            message:
                                message === 'File is required'
                                    ? 'Vui lòng chọn ảnh đại diện.'
                                    : message,
                        }),
                }),
        )
        file: Express.Multer.File,
    ) {
        const processedBuffer = await this.avatarImageService.process(
            file.buffer,
        );
        const key = getAvatarObjectKey(user.id);

        await this.storageService.upload(key, processedBuffer, 'image/webp');

        const avatarUrl = withAvatarCacheVersion(
            this.storageService.getPublicUrl(key),
        );

        return this.userServices.updateAvatar(user.id, avatarUrl);
    }

    @Patch('avatar/preset')
    @ApiOperation({
        summary: 'Chọn avatar DiceBear',
        description:
            'Chỉ chấp nhận một trong 12 preset của Interviewly; không tải ảnh DiceBear lên R2.',
    })
    @ApiResponse({ status: 200, description: 'Cập nhật preset thành công.' })
    @ApiResponse({ status: 400, description: 'Preset không hợp lệ.' })
    async updateAvatarPreset(
        @CurrentUser() user: AuthUser,
        @Body() dto: UpdateAvatarPresetDto,
    ) {
        if (!isAvatarPreset(dto.preset)) {
            throw new BadRequestException({
                code: 'AVATAR_PRESET_INVALID',
                message: 'Avatar preset không hợp lệ.',
            });
        }

        const result = await this.userServices.updateAvatar(
            user.id,
            getDiceBearAvatarUrl(dto.preset),
        );

        await this.cleanupUploadedAvatar(user.id);

        return result;
    }

    @Delete('avatar')
    @ApiOperation({
        summary: 'Xóa ảnh đại diện',
        description:
            'Đặt avatarUrl về null và dọn object avatar đã upload trên R2 nếu tồn tại.',
    })
    @ApiResponse({ status: 200, description: 'Xóa avatar thành công.' })
    async deleteAvatar(@CurrentUser() user: AuthUser) {
        const result = await this.userServices.updateAvatar(user.id, null);

        await this.cleanupUploadedAvatar(user.id);

        return result;
    }

    private async cleanupUploadedAvatar(userId: string): Promise<void> {
        const key = getAvatarObjectKey(userId);

        try {
            if (await this.storageService.exists(key)) {
                await this.storageService.delete(key);
            }
        } catch (error) {
            this.logger.warn(
                `Không thể dọn avatar R2 cho user ${userId}: ${
                    error instanceof Error
                        ? error.message
                        : 'Lỗi không xác định'
                }`,
            );
        }
    }
}
