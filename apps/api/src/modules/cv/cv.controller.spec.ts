import {
    type CanActivate,
    type ExecutionContext,
    type INestApplication,
    UnauthorizedException,
    ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import type { App } from 'supertest/types';

import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MAX_CV_FILE_SIZE } from './constants/cv.constant';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvAnalysisService } from './cv-analysis/cv-analysis.service';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const ENDPOINT = '/api/v1/cvs';
const CREATED_AT = new Date('2026-09-11T00:00:00.000Z');

const safeManagementCv = {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Backend CV',
    originalFilename: 'cv.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    processingStatus: 'READY' as const,
    isDefault: false,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
};

describe('CvController', () => {
    const cvService = {
        listCvs: jest.fn<CvService['listCvs']>(),
        getCv: jest.fn<CvService['getCv']>(),
        renameCv: jest.fn<CvService['renameCv']>(),
        setDefaultCv: jest.fn<CvService['setDefaultCv']>(),
        deleteCv: jest.fn<CvService['deleteCv']>(),
        uploadCv: jest.fn<CvService['uploadCv']>(),
        listVersions: jest.fn<CvService['listVersions']>(),
        uploadVersion: jest.fn<CvService['uploadVersion']>(),
        setCurrentVersion: jest.fn<CvService['setCurrentVersion']>(),
    };
    const cvAnalysisService = {
        analyze: jest.fn<CvAnalysisService['analyze']>(),
        getLatest: jest.fn<CvAnalysisService['getLatest']>(),
        listHistory: jest.fn<CvAnalysisService['listHistory']>(),
        compareVersions: jest.fn<CvAnalysisService['compareVersions']>(),
        compareCvs: jest.fn<CvAnalysisService['compareCvs']>(),
    };
    const authGuard: CanActivate = {
        canActivate: jest.fn((context: ExecutionContext) => {
            context.switchToHttp().getRequest().user = {
                id: USER_ID,
                sessionId: 'session-id',
                email: 'cv@example.com',
                role: 'USER',
            };
            return true;
        }),
    };
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [CvController],
            providers: [
                { provide: CvService, useValue: cvService },
                { provide: CvAnalysisService, useValue: cvAnalysisService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(authGuard)
            .compile();

        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());
        app.useGlobalInterceptors(new ResponseInterceptor());
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (authGuard.canActivate as jest.Mock).mockImplementation(
            (context: ExecutionContext) => {
                context.switchToHttp().getRequest().user = {
                    id: USER_ID,
                    sessionId: 'session-id',
                    email: 'cv@example.com',
                    role: 'USER',
                };
                return true;
            },
        );
        cvService.uploadCv.mockResolvedValue({
            id: '00000000-0000-4000-8000-000000000002',
            name: 'Frontend Developer CV',
            originalFilename: 'Nguyen_Duc_Khoa_CV.pdf',
            mimeType: 'application/pdf',
            fileSize: 16,
            processingStatus: 'READY',
            isDefault: false,
            createdAt: CREATED_AT,
        });
        cvService.listCvs.mockResolvedValue({
            items: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });
        cvService.getCv.mockResolvedValue({
            ...safeManagementCv,
            extractedText: 'CV text',
        });
        cvService.renameCv.mockResolvedValue(safeManagementCv);
        cvService.setDefaultCv.mockResolvedValue({
            ...safeManagementCv,
            isDefault: true,
        });
        cvService.deleteCv.mockResolvedValue({
            id: safeManagementCv.id,
            deletedAt: CREATED_AT,
        });
        cvService.listVersions.mockResolvedValue([]);
        cvService.uploadVersion.mockResolvedValue({
            ...safeManagementCv,
            extractedText: 'Updated CV text',
        });
        cvService.setCurrentVersion.mockResolvedValue({
            ...safeManagementCv,
            extractedText: 'Selected CV text',
        });
        cvAnalysisService.analyze.mockResolvedValue({
            id: '00000000-0000-4000-8000-000000000003',
            cvId: safeManagementCv.id,
            status: 'COMPLETED',
        } as never);
        cvAnalysisService.getLatest.mockResolvedValue({
            id: '00000000-0000-4000-8000-000000000003',
            cvId: safeManagementCv.id,
            status: 'COMPLETED',
        } as never);
        cvAnalysisService.listHistory.mockResolvedValue({
            items: [],
            pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        } as never);
        cvAnalysisService.compareVersions.mockResolvedValue({
            from: {},
            to: {},
            comparison: null,
        } as never);
        cvAnalysisService.compareCvs.mockResolvedValue({
            left: {},
            right: {},
            comparison: null,
        } as never);
    });

    describe('version endpoints', () => {
        const versionId = '00000000-0000-4000-8000-000000000004';

        it('lists and selects versions using the authenticated owner', async () => {
            await request(app.getHttpServer())
                .get(`${ENDPOINT}/${safeManagementCv.id}/versions`)
                .expect(200);
            expect(cvService.listVersions).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
            );

            await request(app.getHttpServer())
                .patch(
                    `${ENDPOINT}/${safeManagementCv.id}/versions/${versionId}/current`,
                )
                .expect(200);
            expect(cvService.setCurrentVersion).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
                versionId,
            );
        });

        it('validates a new version file before calling the service', async () => {
            const pdf = Buffer.from('%PDF-1.7\ncontent');
            await request(app.getHttpServer())
                .post(`${ENDPOINT}/${safeManagementCv.id}/versions`)
                .attach('file', pdf, {
                    filename: 'updated.pdf',
                    contentType: 'application/pdf',
                })
                .expect(201);
            expect(cvService.uploadVersion).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
                expect.objectContaining({
                    originalname: 'updated.pdf',
                    buffer: pdf,
                }),
            );

            await request(app.getHttpServer())
                .post(`${ENDPOINT}/${safeManagementCv.id}/versions`)
                .attach('file', Buffer.from('not pdf'), {
                    filename: 'fake.pdf',
                    contentType: 'application/pdf',
                })
                .expect(400);
        });

        it('validates and forwards both version ids for comparison', async () => {
            const fromVersionId = '00000000-0000-4000-8000-000000000005';
            await request(app.getHttpServer())
                .get(`${ENDPOINT}/${safeManagementCv.id}/versions/compare`)
                .query({ fromVersionId, toVersionId: versionId })
                .expect(200);
            expect(cvAnalysisService.compareVersions).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
                fromVersionId,
                versionId,
            );

            await request(app.getHttpServer())
                .get(`${ENDPOINT}/${safeManagementCv.id}/versions/compare`)
                .query({ fromVersionId: 'invalid', toVersionId: versionId })
                .expect(400);
        });
    });

    afterAll(async () => {
        await app.close();
    });

    describe('management endpoints', () => {
        it('lists with transformed defaults and wraps pagination', async () => {
            const response = await request(app.getHttpServer())
                .get(ENDPOINT)
                .expect(200);

            expect(cvService.listCvs).toHaveBeenCalledWith(USER_ID, {
                page: 1,
                limit: 20,
            });
            expect(response.body.data.pagination).toEqual({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
            });
        });

        it.each([
            '?status=UNKNOWN',
            '?page=0',
            '?page=abc',
            '?limit=0',
            '?limit=101',
        ])('rejects invalid list query %s', async (query) => {
            await request(app.getHttpServer())
                .get(ENDPOINT + query)
                .expect(400);
            expect(cvService.listCvs).not.toHaveBeenCalled();
        });

        it('passes valid filter and numeric pagination', async () => {
            await request(app.getHttpServer())
                .get(ENDPOINT + '?status=READY&page=2&limit=10')
                .expect(200);
            expect(cvService.listCvs).toHaveBeenCalledWith(USER_ID, {
                status: 'READY',
                page: 2,
                limit: 10,
            });
        });

        it('gets detail using authenticated user', async () => {
            const response = await request(app.getHttpServer())
                .get(ENDPOINT + '/' + safeManagementCv.id)
                .expect(200);
            expect(cvService.getCv).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
            );
            expect(response.body.data.extractedText).toBe('CV text');
        });

        it('trims rename and rejects invalid payloads', async () => {
            await request(app.getHttpServer())
                .patch(ENDPOINT + '/' + safeManagementCv.id)
                .send({ name: '  CV mới  ' })
                .expect(200);
            expect(cvService.renameCv).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
                { name: 'CV mới' },
            );

            for (const body of [
                { name: '   ' },
                { name: 'a'.repeat(151) },
                { name: 'CV', userId: 'another-user' },
            ]) {
                await request(app.getHttpServer())
                    .patch(ENDPOINT + '/' + safeManagementCv.id)
                    .send(body)
                    .expect(400);
            }
        });

        it('sets default and deletes through authenticated user', async () => {
            await request(app.getHttpServer())
                .patch(ENDPOINT + '/' + safeManagementCv.id + '/default')
                .expect(200);
            expect(cvService.setDefaultCv).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
            );

            await request(app.getHttpServer())
                .delete(ENDPOINT + '/' + safeManagementCv.id)
                .expect(200);
            expect(cvService.deleteCv).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
            );
        });

        it.each(['not-a-uuid', '00000000-0000-0000-0000-000000000001'])(
            'rejects invalid or non-v4 UUID %s',
            async (cvId) => {
                await request(app.getHttpServer())
                    .get(ENDPOINT + '/' + cvId)
                    .expect(400);
                expect(cvService.getCv).not.toHaveBeenCalled();
            },
        );

        it('protects management endpoints with authentication', async () => {
            (authGuard.canActivate as jest.Mock).mockImplementation(() => {
                throw new UnauthorizedException();
            });
            await request(app.getHttpServer()).get(ENDPOINT).expect(401);
            expect(cvService.listCvs).not.toHaveBeenCalled();
        });
    });

    describe('analysis endpoints', () => {
        it('analyzes using only authenticated user and route CV id', async () => {
            const response = await request(app.getHttpServer())
                .post(ENDPOINT + '/' + safeManagementCv.id + '/analyze')
                .send({
                    userId: 'attacker',
                    extractedText: 'client text',
                    overallScore: 100,
                    provider: 'CLIENT',
                })
                .expect(201);

            expect(cvAnalysisService.analyze).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
            );
            expect(cvAnalysisService.analyze).toHaveBeenCalledTimes(1);
            expect(response.body.data.status).toBe('COMPLETED');
        });

        it('gets latest and paginated history through the shared handler', async () => {
            await request(app.getHttpServer())
                .get(ENDPOINT + '/' + safeManagementCv.id + '/analyses/latest')
                .expect(200);
            expect(cvAnalysisService.getLatest).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
            );

            await request(app.getHttpServer())
                .get(
                    ENDPOINT +
                        '/' +
                        safeManagementCv.id +
                        '/analyses?page=2&limit=10',
                )
                .expect(200);
            expect(cvAnalysisService.listHistory).toHaveBeenCalledWith(
                USER_ID,
                safeManagementCv.id,
                { page: 2, limit: 10 },
            );
        });

        it('rejects invalid history pagination before reaching the service', async () => {
            await request(app.getHttpServer())
                .get(ENDPOINT + '/' + safeManagementCv.id + '/analyses?page=0')
                .expect(400);
            expect(cvAnalysisService.listHistory).not.toHaveBeenCalled();
        });
    });

    it('accepts a valid PDF, uses authenticated userId and wraps sanitized data', async () => {
        const pdf = Buffer.from('%PDF-1.7\ncontent');
        const response = await request(app.getHttpServer())
            .post(ENDPOINT)
            .field('name', '  Frontend Developer CV  ')
            .attach('file', pdf, {
                filename: 'Nguyen_Duc_Khoa_CV.pdf',
                contentType: 'application/pdf',
            })
            .expect(201);

        expect(cvService.uploadCv).toHaveBeenCalledWith(
            USER_ID,
            expect.objectContaining({
                originalname: 'Nguyen_Duc_Khoa_CV.pdf',
                mimetype: 'application/pdf',
                size: pdf.length,
                buffer: pdf,
            }),
            { name: 'Frontend Developer CV' },
        );
        expect(response.body.success).toBe(true);
        expect(response.body.data.processingStatus).toBe('READY');
        expect(response.body.data).not.toHaveProperty('storageKey');
        expect(response.body.data).not.toHaveProperty('userId');
    });

    it('rejects a missing file', async () => {
        const response = await request(app.getHttpServer())
            .post(ENDPOINT)
            .field('name', 'My CV')
            .expect(400);

        expect(response.body.error.code).toBe('CV_FILE_REQUIRED');
        expect(cvService.uploadCv).not.toHaveBeenCalled();
    });

    it('rejects a wrong MIME type', async () => {
        const response = await request(app.getHttpServer())
            .post(ENDPOINT)
            .field('name', 'My CV')
            .attach('file', Buffer.from('%PDF-1.7\ncontent'), {
                filename: 'cv.txt',
                contentType: 'text/plain',
            })
            .expect(400);

        expect(response.body.error.code).toBe('CV_INVALID_FILE_TYPE');
        expect(cvService.uploadCv).not.toHaveBeenCalled();
    });

    it('rejects application/pdf with invalid magic bytes', async () => {
        const response = await request(app.getHttpServer())
            .post(ENDPOINT)
            .field('name', 'My CV')
            .attach('file', Buffer.from('not a real PDF'), {
                filename: 'fake.pdf',
                contentType: 'application/pdf',
            })
            .expect(400);

        expect(response.body.error.code).toBe('CV_INVALID_PDF');
        expect(cvService.uploadCv).not.toHaveBeenCalled();
    });

    it('rejects an empty file', async () => {
        const response = await request(app.getHttpServer())
            .post(ENDPOINT)
            .field('name', 'My CV')
            .attach('file', Buffer.alloc(0), {
                filename: 'empty.pdf',
                contentType: 'application/pdf',
            })
            .expect(400);

        expect(response.body.error.code).toBe('CV_FILE_EMPTY');
        expect(cvService.uploadCv).not.toHaveBeenCalled();
    });

    it('rejects a file larger than 5 MB', async () => {
        const file = Buffer.alloc(MAX_CV_FILE_SIZE + 1, 1);
        file.write('%PDF-', 0, 'ascii');
        const response = await request(app.getHttpServer())
            .post(ENDPOINT)
            .field('name', 'My CV')
            .attach('file', file, {
                filename: 'large.pdf',
                contentType: 'application/pdf',
            })
            .expect(400);

        expect(response.body.error.code).toBe('CV_FILE_TOO_LARGE');
        expect(cvService.uploadCv).not.toHaveBeenCalled();
    });

    it('rejects missing and overlong names with stable codes', async () => {
        const pdf = Buffer.from('%PDF-1.7\ncontent');
        const missing = await request(app.getHttpServer())
            .post(ENDPOINT)
            .attach('file', pdf, {
                filename: 'cv.pdf',
                contentType: 'application/pdf',
            })
            .expect(400);
        expect(missing.body.error.code).toBe('CV_NAME_REQUIRED');

        const tooLong = await request(app.getHttpServer())
            .post(ENDPOINT)
            .field('name', 'a'.repeat(151))
            .attach('file', pdf, {
                filename: 'cv.pdf',
                contentType: 'application/pdf',
            })
            .expect(400);
        expect(tooLong.body.error.code).toBe('CV_NAME_TOO_LONG');
    });

    it('rejects client-controlled userId', async () => {
        const response = await request(app.getHttpServer())
            .post(ENDPOINT)
            .field('name', 'My CV')
            .field('userId', 'another-user')
            .attach('file', Buffer.from('%PDF-1.7\ncontent'), {
                filename: 'cv.pdf',
                contentType: 'application/pdf',
            })
            .expect(400);

        expect(response.body.error.code).toBe('CV_INVALID_REQUEST');
        expect(cvService.uploadCv).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated requests', async () => {
        (authGuard.canActivate as jest.Mock).mockImplementation(() => {
            throw new UnauthorizedException();
        });

        await request(app.getHttpServer())
            .post(ENDPOINT)
            .field('name', 'My CV')
            .attach('file', Buffer.from('%PDF-1.7\ncontent'), {
                filename: 'cv.pdf',
                contentType: 'application/pdf',
            })
            .expect(401);

        expect(cvService.uploadCv).not.toHaveBeenCalled();
    });
});
