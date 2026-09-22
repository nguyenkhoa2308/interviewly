import {
    BadRequestException,
    Injectable,
    type PipeTransform,
} from '@nestjs/common';

import {
    MAX_CV_FILE_SIZE,
    PDF_MIME_TYPE,
    PDF_SIGNATURE,
} from '../constants/cv.constant';

@Injectable()
export class CvFileValidationPipe implements PipeTransform<
    Express.Multer.File | undefined,
    Express.Multer.File
> {
    transform(file: Express.Multer.File | undefined): Express.Multer.File {
        if (!file) {
            throw this.badRequest('CV_FILE_REQUIRED', 'Vui lòng chọn tệp CV.');
        }

        if (file.size === 0 || file.buffer.length === 0) {
            throw this.badRequest(
                'CV_FILE_EMPTY',
                'Tệp CV không được để trống.',
            );
        }

        if (
            file.size > MAX_CV_FILE_SIZE ||
            file.buffer.length > MAX_CV_FILE_SIZE
        ) {
            throw this.badRequest(
                'CV_FILE_TOO_LARGE',
                'Tệp CV không được vượt quá 5 MB.',
            );
        }

        if (file.mimetype !== PDF_MIME_TYPE) {
            throw this.badRequest(
                'CV_INVALID_FILE_TYPE',
                'Chỉ chấp nhận tệp PDF.',
            );
        }

        if (
            file.buffer.length < PDF_SIGNATURE.length ||
            file.buffer.subarray(0, PDF_SIGNATURE.length).toString('ascii') !==
                PDF_SIGNATURE
        ) {
            throw this.badRequest(
                'CV_INVALID_PDF',
                'Tệp CV không phải là PDF hợp lệ.',
            );
        }

        return file;
    }

    private badRequest(code: string, message: string): BadRequestException {
        return new BadRequestException({ code, message });
    }
}
