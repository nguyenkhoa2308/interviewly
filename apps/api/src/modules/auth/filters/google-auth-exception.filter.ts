import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Catch()
export class GoogleAuthExceptionFilter implements ExceptionFilter {
    constructor(private readonly configService: ConfigService) {}

    catch(exception: unknown, host: ArgumentsHost) {
        const response = host.switchToHttp().getResponse<Response>();

        const frontendUrl =
            this.configService.getOrThrow<string>('FRONTEND_URL');

        let code = 'GOOGLE_AUTH_FAILED';

        if (exception instanceof HttpException) {
            const exceptionResponse = exception.getResponse();

            if (
                typeof exceptionResponse === 'object' &&
                exceptionResponse !== null &&
                'code' in exceptionResponse
            ) {
                code = String(exceptionResponse.code);
            }
        }

        const callbackUrl = new URL('/google/callback', frontendUrl);

        callbackUrl.searchParams.set('error', code);

        response.redirect(callbackUrl.toString());
    }
}
