import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const response = context.getResponse();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException ? exception.getResponse() : null;

        let message: string | string[] = 'Internal server error';
        let code: string | undefined;

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
        }

        response.status(status).json({
            success: false,
            error: {
                statusCode: status,
                ...(code && { code }),
                message,
            },
        });
    }
}
