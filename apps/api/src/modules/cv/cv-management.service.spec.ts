import {
    ConflictException,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';

import { CVProcessingStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CvService } from './cv.service';
import { CvListSort } from './dto/list-cvs-query.dto';
import { PdfParserService } from './pdf-parser/pdf-parser.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const CV_ID = '00000000-0000-4000-8000-000000000002';
const CREATED_AT = new Date('2026-09-12T00:00:00.000Z');
const UPDATED_AT = new Date('2026-09-12T01:00:00.000Z');

const safeCv = {
    id: CV_ID,
    name: 'Backend CV',
    originalFilename: 'cv.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    processingStatus: CVProcessingStatus.READY,
    isDefault: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
};

describe('CvService management', () => {
    const transactionCv = { updateMany: jest.fn() };
    const prisma = {
        cV: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            count: jest.fn(),
            groupBy: jest.fn(),
            updateMany: jest.fn(),
        },
        $transaction: jest.fn(),
    };
    const storage = {
        uploadPrivate: jest.fn(),
        deletePrivate: jest.fn(),
    };
    const parser = { parse: jest.fn() };
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
            parser as unknown as PdfParserService,
        );
        prisma.cV.findFirst.mockResolvedValue(safeCv);
        prisma.cV.findMany.mockResolvedValue([safeCv]);
        prisma.cV.count.mockResolvedValue(1);
        prisma.cV.groupBy.mockResolvedValue([
            {
                processingStatus: CVProcessingStatus.READY,
                _count: { _all: 1 },
            },
        ]);
        prisma.cV.updateMany.mockResolvedValue({ count: 1 });
        transactionCv.updateMany.mockResolvedValue({ count: 1 });
        prisma.$transaction.mockImplementation(async (input) => {
            if (typeof input === 'function')
                return input({ cV: transactionCv });
            return Promise.all(input);
        });
    });

    afterAll(() => loggerErrorSpy.mockRestore());

    it('lists only active CVs of the current user, newest first', async () => {
        const result = await service.listCvs(USER_ID, { page: 1, limit: 20 });
        expect(prisma.cV.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: USER_ID, deletedAt: null },
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
                skip: 0,
                take: 20,
            }),
        );
        expect(result.items[0]).not.toHaveProperty('storageKey');
        expect(result.items[0]).not.toHaveProperty('userId');
        expect(result.pagination).toEqual({
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
        });
        expect(result.counts).toEqual({
            ALL: 1,
            READY: 1,
            PROCESSING: 0,
            FAILED: 0,
        });
        expect(prisma.cV.groupBy).toHaveBeenCalledWith({
            by: ['processingStatus'],
            where: { userId: USER_ID, deletedAt: null },
            orderBy: { processingStatus: 'asc' },
            _count: { _all: true },
        });
    });

    it('filters list by processing status and calculates page offset', async () => {
        await service.listCvs(USER_ID, {
            status: CVProcessingStatus.READY,
            page: 3,
            limit: 20,
        });
        expect(prisma.cV.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    userId: USER_ID,
                    deletedAt: null,
                    processingStatus: CVProcessingStatus.READY,
                },
                skip: 40,
                take: 20,
            }),
        );
    });

    it('searches and sorts on the database before pagination', async () => {
        await service.listCvs(USER_ID, {
            search: 'frontend',
            sort: CvListSort.NAME_ASC,
            page: 1,
            limit: 8,
        });
        expect(prisma.cV.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    userId: USER_ID,
                    deletedAt: null,
                    OR: [
                        {
                            name: {
                                contains: 'frontend',
                                mode: 'insensitive',
                            },
                        },
                        {
                            originalFilename: {
                                contains: 'frontend',
                                mode: 'insensitive',
                            },
                        },
                    ],
                }),
                orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
                skip: 0,
                take: 8,
            }),
        );
    });

    it('maps list database failure safely', async () => {
        prisma.$transaction.mockRejectedValue(new Error('SELECT secret'));
        await expect(
            service.listCvs(USER_ID, { page: 1, limit: 20 }),
        ).rejects.toMatchObject({ response: { code: 'CV_LIST_FAILED' } });
    });

    it('gets detail using owner and active scopes and allows extractedText', async () => {
        prisma.cV.findFirst.mockResolvedValue({
            ...safeCv,
            extractedText: 'Backend Developer',
        });
        const result = await service.getCv(USER_ID, CV_ID);
        expect(prisma.cV.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: CV_ID, userId: USER_ID, deletedAt: null },
            }),
        );
        expect(result.extractedText).toBe('Backend Developer');
        expect(result).not.toHaveProperty('storageKey');
    });

    it.each(['missing', 'other-user', 'deleted'])(
        'returns the same not found response for %s CV',
        async () => {
            prisma.cV.findFirst.mockResolvedValue(null);
            await expect(service.getCv(USER_ID, CV_ID)).rejects.toMatchObject({
                status: 404,
                response: { code: 'CV_NOT_FOUND' },
            });
        },
    );

    it('renames only the active owned CV without touching storage', async () => {
        const result = await service.renameCv(USER_ID, CV_ID, {
            name: 'Frontend CV 2026',
        });
        expect(prisma.cV.updateMany).toHaveBeenCalledWith({
            where: { id: CV_ID, userId: USER_ID, deletedAt: null },
            data: { name: 'Frontend CV 2026' },
        });
        expect(storage.uploadPrivate).not.toHaveBeenCalled();
        expect(storage.deletePrivate).not.toHaveBeenCalled();
        expect(result).not.toHaveProperty('storageKey');
    });

    it('rejects rename when the CV disappears after ownership check', async () => {
        prisma.cV.updateMany.mockResolvedValue({ count: 0 });
        await expect(
            service.renameCv(USER_ID, CV_ID, { name: 'New name' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sets default in one transaction with both operations owner-scoped', async () => {
        await service.setDefaultCv(USER_ID, CV_ID);
        expect(transactionCv.updateMany.mock.calls[0][0]).toEqual({
            where: { userId: USER_ID, deletedAt: null, isDefault: true },
            data: { isDefault: false },
        });
        expect(transactionCv.updateMany.mock.calls[1][0]).toEqual({
            where: { id: CV_ID, userId: USER_ID, deletedAt: null },
            data: { isDefault: true },
        });
    });

    it('allows setting an already-default CV idempotently', async () => {
        prisma.cV.findFirst.mockResolvedValue({ ...safeCv, isDefault: true });
        await expect(
            service.setDefaultCv(USER_ID, CV_ID),
        ).resolves.toBeDefined();
    });

    it('maps a default unique-index race to a safe conflict', async () => {
        prisma.$transaction.mockRejectedValue({
            code: 'P2002',
            meta: 'secret',
        });
        await expect(
            service.setDefaultCv(USER_ID, CV_ID),
        ).rejects.toBeInstanceOf(ConflictException);
        await expect(
            service.setDefaultCv(USER_ID, CV_ID),
        ).rejects.toMatchObject({
            response: { code: 'CV_DEFAULT_CONFLICT' },
        });
    });

    it('does not silently succeed on an unexpected default transaction error', async () => {
        prisma.$transaction.mockRejectedValue(new Error('database down'));
        await expect(
            service.setDefaultCv(USER_ID, CV_ID),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('soft-deletes and clears default without calling storage', async () => {
        const result = await service.deleteCv(USER_ID, CV_ID);
        expect(prisma.cV.updateMany).toHaveBeenCalledWith({
            where: { id: CV_ID, userId: USER_ID, deletedAt: null },
            data: { deletedAt: expect.any(Date), isDefault: false },
        });
        expect(result).toEqual({ id: CV_ID, deletedAt: expect.any(Date) });
        expect(storage.deletePrivate).not.toHaveBeenCalled();
        expect(prisma.cV).not.toHaveProperty('delete');
    });

    it('returns not found when deleting an already deleted or foreign CV', async () => {
        prisma.cV.findFirst.mockResolvedValue(null);
        await expect(service.deleteCv(USER_ID, CV_ID)).rejects.toBeInstanceOf(
            NotFoundException,
        );
        expect(prisma.cV.updateMany).not.toHaveBeenCalled();
    });
});
