import { InternalServerErrorException, Logger } from '@nestjs/common';
import { jest } from '@jest/globals';

import { CVProcessingStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CvService } from './cv.service';
import { PdfParserService } from './pdf-parser/pdf-parser.service';
import { PdfParsingException } from './pdf-parser/pdf-parser.types';
import { CvStructureService } from './cv-structure/cv-structure.service';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const VERSION_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CREATED_AT = new Date('2026-09-11T00:00:00.000Z');

function pdfFile(): Express.Multer.File {
    const buffer = Buffer.from('%PDF-1.7\ncontent');
    return {
        fieldname: 'file',
        originalname: 'Nguyen_Duc_Khoa_CV.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: buffer.length,
        destination: '',
        filename: '',
        path: '',
        buffer,
        stream: undefined as never,
    };
}

describe('CvService', () => {
    const prisma = {
        cV: { create: jest.fn(), update: jest.fn() },
        cVVersion: { create: jest.fn(), update: jest.fn() },
        $transaction: jest.fn(),
    };
    const storage = {
        uploadPrivate:
            jest.fn<
                (key: string, body: Buffer, type: string) => Promise<void>
            >(),
        deletePrivate: jest.fn<(key: string) => Promise<void>>(),
    };
    const pdfParser = {
        parse: jest.fn<(buffer: Buffer) => Promise<{ text: string }>>(),
    };
    const cvStructure = {
        normalize:
            jest.fn<
                (
                    extractedText: string,
                ) => Promise<Record<string, unknown> | null>
            >(),
    };
    let service: CvService;
    let loggerErrorSpy: jest.SpiedFunction<Logger['error']>;

    beforeAll(() => {
        loggerErrorSpy = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CvService(
            prisma as unknown as PrismaService,
            storage as unknown as StorageService,
            pdfParser as unknown as PdfParserService,
            cvStructure as unknown as CvStructureService,
        );
        prisma.cV.create.mockResolvedValue({ id: 'created' });
        prisma.cVVersion.create.mockResolvedValue({ id: 'version-created' });
        prisma.cVVersion.update.mockResolvedValue({ id: 'version-updated' });
        prisma.$transaction.mockImplementation(
            async (
                input:
                    | Array<Promise<unknown>>
                    | ((transaction: typeof prisma) => Promise<unknown>),
            ) =>
                typeof input === 'function'
                    ? input(prisma)
                    : Promise.all(input),
        );
        prisma.cV.update.mockImplementation(async ({ data }) => {
            const createData = prisma.cV.create.mock.calls[0][0].data;
            if (data.processingStatus !== CVProcessingStatus.READY) {
                return { id: createData.id };
            }
            return {
                id: createData.id,
                name: createData.name,
                originalFilename: createData.originalFilename,
                mimeType: createData.mimeType,
                fileSize: createData.fileSize,
                processingStatus: data.processingStatus,
                isDefault: createData.isDefault,
                createdAt: CREATED_AT,
            };
        });
        storage.uploadPrivate.mockResolvedValue(undefined);
        storage.deletePrivate.mockResolvedValue(undefined);
        pdfParser.parse.mockResolvedValue({ text: 'Nguyen Duc Khoa\nBackend' });
        cvStructure.normalize.mockResolvedValue(null);
    });

    afterAll(() => loggerErrorSpy.mockRestore());

    it('runs UPLOADING -> PROCESSING -> READY and persists extracted text', async () => {
        const file = pdfFile();
        const result = await service.uploadCv(USER_ID, file, {
            name: 'Backend Developer CV',
        });

        const createData = prisma.cV.create.mock.calls[0][0].data;
        const versionData = prisma.cVVersion.create.mock.calls[0][0].data;
        expect(createData.id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        expect(createData).toMatchObject({
            userId: USER_ID,
            name: 'Backend Developer CV',
            originalFilename: file.originalname,
            mimeType: 'application/pdf',
            fileSize: file.size,
            processingStatus: CVProcessingStatus.UPLOADING,
            isDefault: false,
        });
        expect(versionData.id).toMatch(VERSION_ID_PATTERN);
        expect(versionData).toMatchObject({
            cvId: createData.id,
            versionNumber: 1,
            originalFilename: file.originalname,
            storageKey: `cvs/${USER_ID}/${createData.id}/versions/${versionData.id}/original.pdf`,
            mimeType: 'application/pdf',
            fileSize: file.size,
            processingStatus: CVProcessingStatus.UPLOADING,
        });
        expect(storage.uploadPrivate).toHaveBeenCalledWith(
            versionData.storageKey,
            file.buffer,
            'application/pdf',
        );
        expect(prisma.cV.update.mock.calls[1][0].data.processingStatus).toBe(
            CVProcessingStatus.PROCESSING,
        );
        expect(
            prisma.cVVersion.update.mock.calls[0][0].data.processingStatus,
        ).toBe(CVProcessingStatus.PROCESSING);
        expect(pdfParser.parse).toHaveBeenCalledWith(file.buffer);
        expect(pdfParser.parse.mock.calls[0][0]).toBe(file.buffer);
        expect(cvStructure.normalize).toHaveBeenCalledWith(
            'Nguyen Duc Khoa\nBackend',
        );
        expect(prisma.cV.update.mock.calls[2][0].data).toEqual({
            extractedText: 'Nguyen Duc Khoa\nBackend',
            structuredContent: Prisma.JsonNull,
            processingStatus: CVProcessingStatus.READY,
            processingErrorCode: null,
            processingError: null,
        });
        expect(result.processingStatus).toBe(CVProcessingStatus.READY);
        expect(result).not.toHaveProperty('storageKey');
        expect(result).not.toHaveProperty('userId');
        expect(result).not.toHaveProperty('extractedText');
        expect(prisma.cVVersion.update.mock.calls[1][0].data).toEqual(
            prisma.cV.update.mock.calls[2][0].data,
        );
    });

    it('does not call storage or parser when database create fails', async () => {
        prisma.cV.create.mockRejectedValue(new Error('database unavailable'));
        await expect(
            service.uploadCv(USER_ID, pdfFile(), { name: 'My CV' }),
        ).rejects.toMatchObject({ response: { code: 'CV_CREATE_FAILED' } });
        expect(storage.uploadPrivate).not.toHaveBeenCalled();
        expect(pdfParser.parse).not.toHaveBeenCalled();
    });

    it('marks FAILED and never parses when storage upload fails', async () => {
        storage.uploadPrivate.mockRejectedValue(new Error('R2 unavailable'));
        await expect(
            service.uploadCv(USER_ID, pdfFile(), { name: 'My CV' }),
        ).rejects.toMatchObject({ response: { code: 'CV_UPLOAD_FAILED' } });
        expect(pdfParser.parse).not.toHaveBeenCalled();
        expect(prisma.cV.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    processingStatus: CVProcessingStatus.FAILED,
                    processingErrorCode: 'STORAGE_UPLOAD_FAILED',
                }),
            }),
        );
    });

    it('cleans R2 and never parses when PROCESSING update fails', async () => {
        prisma.cV.update
            .mockResolvedValueOnce({ id: 'linked' })
            .mockRejectedValueOnce(new Error('database update failed'))
            .mockResolvedValueOnce({ id: 'failed' });
        await expect(
            service.uploadCv(USER_ID, pdfFile(), { name: 'My CV' }),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
        const storageKey =
            prisma.cVVersion.create.mock.calls[0][0].data.storageKey;
        expect(storage.deletePrivate).toHaveBeenCalledWith(storageKey);
        expect(pdfParser.parse).not.toHaveBeenCalled();
    });

    it('marks FAILED but keeps the original R2 object when parsing fails', async () => {
        pdfParser.parse.mockRejectedValue(
            new PdfParsingException(
                'CV_PDF_PARSE_FAILED',
                'Không thể đọc nội dung tệp PDF.',
            ),
        );
        await expect(
            service.uploadCv(USER_ID, pdfFile(), { name: 'My CV' }),
        ).rejects.toMatchObject({
            status: 422,
            response: { code: 'CV_PDF_PARSE_FAILED' },
        });
        expect(storage.deletePrivate).not.toHaveBeenCalled();
        expect(prisma.cV.update).toHaveBeenLastCalledWith(
            expect.objectContaining({
                data: {
                    processingStatus: CVProcessingStatus.FAILED,
                    processingErrorCode: 'CV_PDF_PARSE_FAILED',
                    processingError: 'Không thể đọc nội dung tệp PDF.',
                },
            }),
        );
    });

    it('does not silently succeed when persisting READY fails', async () => {
        prisma.cV.update
            .mockResolvedValueOnce({ id: 'linked' })
            .mockResolvedValueOnce({ id: 'processing' })
            .mockRejectedValueOnce(new Error('READY update failed'))
            .mockResolvedValueOnce({ id: 'failed' });
        await expect(
            service.uploadCv(USER_ID, pdfFile(), { name: 'My CV' }),
        ).rejects.toMatchObject({
            response: { code: 'CV_PROCESSING_FAILED' },
        });
        expect(storage.deletePrivate).not.toHaveBeenCalled();
        expect(prisma.cV.update).toHaveBeenLastCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    processingStatus: CVProcessingStatus.FAILED,
                    processingErrorCode: 'CV_PROCESSING_FAILED',
                }),
            }),
        );
    });
});
