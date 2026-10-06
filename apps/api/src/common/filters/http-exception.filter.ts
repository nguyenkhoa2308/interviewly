import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();

        if (response.headersSent) return;

        const request = context.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        if (!(exception instanceof HttpException)) {
            const detail =
                exception instanceof Error
                    ? (exception.stack ?? exception.message)
                    : String(exception);
            this.logger.error(
                `${request?.method ?? 'UNKNOWN'} ${request?.originalUrl ?? request?.url ?? 'unknown'} failed`,
                detail,
            );
        }

        const exceptionResponse =
            exception instanceof HttpException ? exception.getResponse() : null;

        let message: string | string[] = 'Internal server error';
        let code: string | undefined;
        let details: unknown;

        if (
            typeof exceptionResponse === 'object' &&
            exceptionResponse !== null
        ) {
            if ('message' in exceptionResponse) {
                message = exceptionResponse.message as string | string[];
            }

            if ('code' in exceptionResponse) {
                code = exceptionResponse.code as string;
            }

            if ('details' in exceptionResponse) {
                details = exceptionResponse.details;
            }
        }

        response.status(status).json({
            success: false,
            error: {
                statusCode: status,
                ...(code && { code }),
                ...(details !== undefined && { details }),
                message,
            },
        });
    }
}
