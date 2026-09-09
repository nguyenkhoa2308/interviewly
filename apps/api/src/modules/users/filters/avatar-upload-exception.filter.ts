import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
    PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(PayloadTooLargeException)
export class AvatarUploadExceptionFilter implements ExceptionFilter {
    catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();

        response.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            error: {
                statusCode: HttpStatus.BAD_REQUEST,
                code: 'AVATAR_FILE_TOO_LARGE',
                message: 'Ảnh đại diện không được vượt quá 2 MB.',
            },
        });
    }
}
