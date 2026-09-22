import {
    ArgumentsHost,
    BadRequestException,
    Catch,
    ExceptionFilter,
    HttpStatus,
    PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';

const NAME_ERRORS: Record<string, string> = {
    CV_NAME_REQUIRED: 'Vui lòng nhập tên CV.',
    CV_NAME_TOO_LONG: 'Tên CV không được vượt quá 150 ký tự.',
};

@Catch(PayloadTooLargeException, BadRequestException)
export class CvUploadExceptionFilter implements ExceptionFilter {
    catch(
        exception: PayloadTooLargeException | BadRequestException,
        host: ArgumentsHost,
    ) {
        const response = host.switchToHttp().getResponse<Response>();
        if (response.headersSent) return;

        const exceptionResponse = exception.getResponse();
        let code = 'CV_INVALID_REQUEST';
        let message = 'Dữ liệu tải CV không hợp lệ.';

        if (exception instanceof PayloadTooLargeException) {
            code = 'CV_FILE_TOO_LARGE';
            message = 'Tệp CV không được vượt quá 5 MB.';
        } else if (
            typeof exceptionResponse === 'object' &&
            exceptionResponse !== null
        ) {
            if (
                'code' in exceptionResponse &&
                typeof exceptionResponse.code === 'string'
            ) {
                code = exceptionResponse.code;
            }

            const rawMessage =
                'message' in exceptionResponse
                    ? exceptionResponse.message
                    : undefined;
            const messages = Array.isArray(rawMessage)
                ? rawMessage
                : typeof rawMessage === 'string'
                  ? [rawMessage]
                  : [];
            const nameCode = ['CV_NAME_REQUIRED', 'CV_NAME_TOO_LONG'].find(
                (candidate) => messages.includes(candidate),
            );

            if (nameCode) {
                code = nameCode;
                message = NAME_ERRORS[nameCode];
            } else if (messages.length > 0) {
                message = messages[0];
            }
        }

        response.status(HttpStatus.BAD_REQUEST).json({
            success: false,
            error: {
                statusCode: HttpStatus.BAD_REQUEST,
                code,
                message,
            },
        });
    }
}
