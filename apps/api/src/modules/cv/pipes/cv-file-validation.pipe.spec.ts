import { CvFileValidationPipe } from './cv-file-validation.pipe';
import { MAX_CV_FILE_SIZE } from '../constants/cv.constant';

function createFile(
    buffer: Buffer,
    overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
    return {
        fieldname: 'file',
        originalname: 'cv.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: buffer.length,
        destination: '',
        filename: '',
        path: '',
        buffer,
        ...overrides,
    };
}

describe('CvFileValidationPipe', () => {
    const pipe = new CvFileValidationPipe();

    it('accepts a non-empty PDF with matching MIME and magic bytes', () => {
        const file = createFile(Buffer.from('%PDF-1.7\ncontent'));
        expect(pipe.transform(file)).toBe(file);
    });

    it('distinguishes an unsupported MIME from an invalid PDF signature', () => {
        expect(() =>
            pipe.transform(
                createFile(Buffer.from('%PDF-1.7'), {
                    mimetype: 'text/plain',
                }),
            ),
        ).toThrow(
            expect.objectContaining({
                response: expect.objectContaining({
                    code: 'CV_INVALID_FILE_TYPE',
                }),
            }),
        );

        expect(() =>
            pipe.transform(createFile(Buffer.from('not a pdf'))),
        ).toThrow(
            expect.objectContaining({
                response: expect.objectContaining({ code: 'CV_INVALID_PDF' }),
            }),
        );
    });

    it('rejects tiny buffers without throwing an internal range error', () => {
        expect(() => pipe.transform(createFile(Buffer.from('%PD')))).toThrow(
            expect.objectContaining({
                response: expect.objectContaining({ code: 'CV_INVALID_PDF' }),
            }),
        );
    });

    it('uses the actual buffer length as a second size boundary', () => {
        const oversizedBuffer = Buffer.alloc(MAX_CV_FILE_SIZE + 1);
        oversizedBuffer.write('%PDF-');

        expect(() =>
            pipe.transform(createFile(oversizedBuffer, { size: 1 })),
        ).toThrow(
            expect.objectContaining({
                response: expect.objectContaining({
                    code: 'CV_FILE_TOO_LARGE',
                }),
            }),
        );
    });
});
