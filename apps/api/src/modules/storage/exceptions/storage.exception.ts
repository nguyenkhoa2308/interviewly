import { HttpException, HttpStatus } from '@nestjs/common';

export type StorageErrorCode =
    | 'STORAGE_UPLOAD_FAILED'
    | 'STORAGE_DELETE_FAILED'
    | 'STORAGE_CHECK_FAILED'
    | 'STORAGE_INVALID_EXPIRY'
    | 'STORAGE_SIGN_URL_FAILED';

export class StorageException extends HttpException {
    constructor(
        code: StorageErrorCode,
        message: string,
        statusCode = HttpStatus.SERVICE_UNAVAILABLE,
    ) {
        super(
            {
                code,
                message,
            },
            statusCode,
        );
    }
}
