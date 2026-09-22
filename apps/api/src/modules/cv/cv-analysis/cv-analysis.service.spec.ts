import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';

import {
    CVAnalysisStatus,
    CVProcessingStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiException } from '../../ai/ai.errors';
import { CvAnalysisService } from './cv-analysis.service';
import { createValidAnalysisResult } from './cv-analysis.test-fixture';
import { CvAnalyzerService } from './cv-analyzer.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const CV_ID = '00000000-0000-4000-8000-000000000002';
const ANALYSIS_ID = '00000000-0000-4000-8000-000000000003';
const CV_VERSION_ID = '00000000-0000-4000-8000-000000000004';
const CREATED_AT = new Date('2026-09-19T00:00:00.000Z');

describe('CvAnalysisService', () => {
    const prisma = {
        cV: { findFirst: jest.fn(), findMany: jest.fn() },
        cVVersion: { findMany: jest.fn() },
        cVAnalysis: {
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
        $transaction: jest.fn(),
    };
    const analyzer = { analyze: jest.fn() };
    const config = {
        getOrThrow: jest.fn((key: string) =>
            key === 'NODE_ENV' ? 'development' : 10,
        ),
    };
    let service: CvAnalysisService;
    let loggerError: jest.SpiedFunction<Logger['error']>;

    beforeAll(() => {
        loggerError = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        config.getOrThrow.mockImplementation((key: string) =>
            key === 'NODE_ENV' ? 'development' : 10,
        );
        service = new CvAnalysisService(
            prisma as unknown as PrismaService,
            analyzer as unknown as CvAnalyzerService,
            config as unknown as ConfigService,
        );
        prisma.cV.findFirst.mockResolvedValue({
            id: CV_ID,
            currentVersionId: CV_VERSION_ID,
            processingStatus: CVProcessingStatus.READY,
            extractedText: '  Backend CV content  ',
        });
        prisma.cVAnalysis.findFirst.mockResolvedValue(null);
        prisma.cVAnalysis.create.mockResolvedValue({
            id: ANALYSIS_ID,
            createdAt: CREATED_AT,
        });
        analyzer.analyze.mockResolvedValue({
            result: createValidAnalysisResult(),
            metadata: {
                modelProvider: 'GEMINI',
                modelName: 'gemini-test',
                promptVersion: 'cv-analysis-v1',
            },
        });
        prisma.cVAnalysis.update.mockImplementation(async ({ data }) => ({
            id: ANALYSIS_ID,
            cvId: CV_ID,
            ...data,
            createdAt: CREATED_AT,
        }));
    });

    afterAll(() => loggerError.mockRestore());

    it('does not enforce the daily limit outside production', async () => {
        await service.analyze(USER_ID, CV_ID);

        expect(prisma.cVAnalysis.count).not.toHaveBeenCalled();
    });

    it('compares completed analyses from two owned CV versions', async () => {
        const previousVersionId = '00000000-0000-4000-8000-000000000005';
        prisma.cVVersion.findMany.mockResolvedValue([
            {
                id: previousVersionId,
                versionNumber: 1,
                originalFilename: 'v1.pdf',
                createdAt: CREATED_AT,
            },
            {
                id: CV_VERSION_ID,
                versionNumber: 2,
                originalFilename: 'v2.pdf',
                createdAt: CREATED_AT,
            },
        ]);
        prisma.cVAnalysis.findFirst
            .mockResolvedValueOnce({
                id: 'analysis-v1',
                overallScore: 70,
                detectedRole: 'Backend Developer',
                detectedLevel: 'JUNIOR',
                extractedSkills: [{ name: 'Node.js' }, { name: 'SQL' }],
                strengths: [{}],
                weaknesses: [{}, {}],
                interviewRisks: [{}, {}],
                completedAt: CREATED_AT,
            })
            .mockResolvedValueOnce({
                id: 'analysis-v2',
                overallScore: 82,
                detectedRole: 'Backend Developer',
                detectedLevel: 'MIDDLE',
                extractedSkills: [{ name: 'Node.js' }, { name: 'Docker' }],
                strengths: [{}, {}],
                weaknesses: [{}],
                interviewRisks: [{}],
                completedAt: CREATED_AT,
            });

        const result = await service.compareVersions(
            USER_ID,
            CV_ID,
            previousVersionId,
            CV_VERSION_ID,
        );

        expect(result.comparison).toMatchObject({
            scoreDelta: 12,
            skills: {
                added: ['Docker'],
                removed: ['SQL'],
                retained: ['Node.js'],
            },
            strengthCountDelta: 1,
            weaknessCountDelta: -1,
            riskCountDelta: -1,
        });
        expect(prisma.cVVersion.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    cvId: CV_ID,
                    id: { in: [previousVersionId, CV_VERSION_ID] },
                },
            }),
        );
    });

    it('compares the current versions of two owned CVs', async () => {
        const rightCvId = '00000000-0000-4000-8000-000000000006';
        const rightVersionId = '00000000-0000-4000-8000-000000000007';
        prisma.cV.findMany.mockResolvedValue([
            { id: CV_ID, name: 'Backend CV', currentVersionId: CV_VERSION_ID },
            {
                id: rightCvId,
                name: 'Fullstack CV',
                currentVersionId: rightVersionId,
            },
        ]);
        prisma.cVAnalysis.findFirst
            .mockResolvedValueOnce({
                id: 'left-analysis',
                overallScore: 70,
                detectedRole: 'Backend Developer',
                detectedLevel: 'JUNIOR',
                extractedSkills: [{ name: 'Node.js' }],
                strengths: [],
                weaknesses: [{}],
                interviewRisks: [{}],
                completedAt: CREATED_AT,
            })
            .mockResolvedValueOnce({
                id: 'right-analysis',
                overallScore: 80,
                detectedRole: 'Fullstack Developer',
                detectedLevel: 'MIDDLE',
                extractedSkills: [{ name: 'Node.js' }, { name: 'React' }],
                strengths: [{}],
                weaknesses: [],
                interviewRisks: [],
                completedAt: CREATED_AT,
            });

        const result = await service.compareCvs(USER_ID, CV_ID, rightCvId);

        expect(result.left.name).toBe('Backend CV');
        expect(result.right.name).toBe('Fullstack CV');
        expect(result.comparison?.scoreDelta).toBe(10);
        expect(result.comparison?.skills.added).toEqual(['React']);
    });

    it('allows the tenth production analysis attempt', async () => {
        config.getOrThrow.mockImplementation((key: string) =>
            key === 'NODE_ENV' ? 'production' : 10,
        );
        prisma.cVAnalysis.count.mockResolvedValue(9);

        await expect(service.analyze(USER_ID, CV_ID)).resolves.toBeDefined();
        expect(prisma.cVAnalysis.count).toHaveBeenCalledWith({
            where: {
                cv: { userId: USER_ID },
                createdAt: { gte: expect.any(Date) },
            },
        });
    });

    it('rejects production attempts after the daily account limit', async () => {
        config.getOrThrow.mockImplementation((key: string) =>
            key === 'NODE_ENV' ? 'production' : 10,
        );
        prisma.cVAnalysis.count.mockResolvedValue(10);

        await expect(service.analyze(USER_ID, CV_ID)).rejects.toMatchObject({
            status: 429,
            response: {
                code: 'CV_ANALYSIS_DAILY_LIMIT_REACHED',
                retryAt: expect.any(String),
            },
        });
        expect(prisma.cVAnalysis.create).not.toHaveBeenCalled();
        expect(analyzer.analyze).not.toHaveBeenCalled();
    });

    it('scopes CV ownership and creates PROCESSING before calling AI', async () => {
        const events: string[] = [];
        prisma.cVAnalysis.create.mockImplementation(async () => {
            events.push('create');
            return { id: ANALYSIS_ID, createdAt: CREATED_AT };
        });
        analyzer.analyze.mockImplementation(async () => {
            events.push('analyze');
            return {
                result: createValidAnalysisResult(),
                metadata: {
                    modelProvider: 'GEMINI',
                    modelName: 'gemini-test',
                    promptVersion: 'cv-analysis-v1',
                },
            };
        });

        await service.analyze(USER_ID, CV_ID);

        expect(prisma.cV.findFirst).toHaveBeenCalledWith({
            where: { id: CV_ID, userId: USER_ID, deletedAt: null },
            select: expect.any(Object),
        });
        expect(events).toEqual(['create', 'analyze']);
        expect(prisma.cVAnalysis.create).toHaveBeenCalledWith({
            data: {
                cvId: CV_ID,
                cvVersionId: CV_VERSION_ID,
                status: CVAnalysisStatus.PROCESSING,
            },
            select: { id: true, createdAt: true },
        });
        expect(analyzer.analyze).toHaveBeenCalledWith({
            extractedText: 'Backend CV content',
        });
        expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('persists the validated result and metadata on the same row', async () => {
        const result = await service.analyze(USER_ID, CV_ID);
        const update = prisma.cVAnalysis.update.mock.calls[0][0];

        expect(update.where).toEqual({ id: ANALYSIS_ID });
        expect(update.data).toMatchObject({
            status: CVAnalysisStatus.COMPLETED,
            overallScore: 72,
            detectedRole: 'Backend Developer',
            modelProvider: 'GEMINI',
            modelName: 'gemini-test',
            promptVersion: 'cv-analysis-v1',
            errorCode: null,
            errorMessage: null,
            extractedSkills: expect.any(Array),
        });
        expect(update.data.completedAt).toBeInstanceOf(Date);
        expect(update.select).not.toHaveProperty('errorCode');
        expect(result.status).toBe(CVAnalysisStatus.COMPLETED);
    });

    it.each([
        ['missing', null],
        ['cross-user', null],
        ['soft-deleted', null],
    ])('returns the same safe not-found for %s CV', async (_case, cv) => {
        prisma.cV.findFirst.mockResolvedValue(cv);
        await expect(service.analyze(USER_ID, CV_ID)).rejects.toMatchObject({
            status: 404,
            response: { code: 'CV_NOT_FOUND' },
        });
        expect(analyzer.analyze).not.toHaveBeenCalled();
    });

    it.each([
        CVProcessingStatus.UPLOADING,
        CVProcessingStatus.PROCESSING,
        CVProcessingStatus.FAILED,
    ])('rejects non-READY status %s before AI', async (processingStatus) => {
        prisma.cV.findFirst.mockResolvedValue({
            id: CV_ID,
            processingStatus,
            extractedText: 'text',
        });
        await expect(service.analyze(USER_ID, CV_ID)).rejects.toMatchObject({
            status: 422,
            response: { code: 'CV_NOT_READY' },
        });
        expect(analyzer.analyze).not.toHaveBeenCalled();
    });

    it.each([null, '', '   \n'])(
        'rejects unusable text %# before AI',
        async (text) => {
            prisma.cV.findFirst.mockResolvedValue({
                id: CV_ID,
                processingStatus: CVProcessingStatus.READY,
                extractedText: text,
            });
            await expect(service.analyze(USER_ID, CV_ID)).rejects.toMatchObject(
                {
                    status: 422,
                    response: { code: 'CV_TEXT_UNAVAILABLE' },
                },
            );
            expect(analyzer.analyze).not.toHaveBeenCalled();
        },
    );

    it('rejects an existing PROCESSING analysis', async () => {
        prisma.cVAnalysis.findFirst.mockResolvedValue({ id: ANALYSIS_ID });
        await expect(service.analyze(USER_ID, CV_ID)).rejects.toMatchObject({
            status: 409,
            response: { code: 'CV_ANALYSIS_ALREADY_PROCESSING' },
        });
        expect(prisma.cVAnalysis.create).not.toHaveBeenCalled();
        expect(analyzer.analyze).not.toHaveBeenCalled();
    });

    it('maps the database P2002 race to conflict', async () => {
        prisma.cVAnalysis.create.mockRejectedValue({
            code: 'P2002',
            meta: { target: 'cv_analyses_one_processing_per_cv' },
        });
        await expect(service.analyze(USER_ID, CV_ID)).rejects.toMatchObject({
            status: 409,
            response: { code: 'CV_ANALYSIS_ALREADY_PROCESSING' },
        });
        expect(analyzer.analyze).not.toHaveBeenCalled();
    });

    it.each([
        ['AI_PROVIDER_ERROR', 502],
        ['AI_TIMEOUT', 504],
        ['AI_INVALID_RESPONSE', 502],
        ['AI_SCHEMA_VALIDATION_FAILED', 502],
    ] as const)('marks the row FAILED for %s', async (code, httpStatus) => {
        analyzer.analyze.mockRejectedValue(
            new AiException(code, { cause: new Error('secret raw error') }),
        );
        await expect(service.analyze(USER_ID, CV_ID)).rejects.toMatchObject({
            status: httpStatus,
            response: { code },
        });
        const failedUpdate = prisma.cVAnalysis.update.mock.calls[0][0];
        expect(failedUpdate.where).toEqual({ id: ANALYSIS_ID });
        expect(failedUpdate.data).toMatchObject({
            status: CVAnalysisStatus.FAILED,
            errorCode: code,
        });
        expect(failedUpdate.data.completedAt).toBeInstanceOf(Date);
        expect(JSON.stringify(failedUpdate.data)).not.toContain(
            'secret raw error',
        );
    });

    it('reports lifecycle persistence failure without pretending FAILED was saved', async () => {
        analyzer.analyze.mockRejectedValue(new AiException('AI_TIMEOUT'));
        prisma.cVAnalysis.update.mockRejectedValue(new Error('database down'));
        await expect(service.analyze(USER_ID, CV_ID)).rejects.toMatchObject({
            status: 500,
            response: { code: 'CV_ANALYSIS_STATE_UPDATE_FAILED' },
        });
    });

    it('allows re-analysis when older runs are not PROCESSING', async () => {
        prisma.cVAnalysis.findFirst.mockResolvedValue(null);
        await service.analyze(USER_ID, CV_ID);
        expect(prisma.cVAnalysis.create).toHaveBeenCalledTimes(1);
        expect(prisma.cVAnalysis.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: ANALYSIS_ID } }),
        );
    });

    it('returns newest COMPLETED as latest successful analysis', async () => {
        const completed = {
            id: ANALYSIS_ID,
            status: CVAnalysisStatus.COMPLETED,
            overallScore: 72,
        };
        prisma.cVAnalysis.findFirst.mockResolvedValue(completed);
        await expect(service.getLatest(USER_ID, CV_ID)).resolves.toEqual(
            completed,
        );
        expect(prisma.cVAnalysis.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    cvVersionId: CV_VERSION_ID,
                    status: CVAnalysisStatus.COMPLETED,
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            }),
        );
    });

    it('returns safe not-found when no completed analysis exists', async () => {
        prisma.cVAnalysis.findFirst.mockResolvedValue(null);
        await expect(service.getLatest(USER_ID, CV_ID)).rejects.toMatchObject({
            status: 404,
            response: { code: 'CV_ANALYSIS_NOT_FOUND' },
        });
    });

    it('lists all lifecycle states newest-first with pagination', async () => {
        const items = [
            {
                id: 'failed',
                status: CVAnalysisStatus.FAILED,
                overallScore: null,
            },
            {
                id: 'completed',
                status: CVAnalysisStatus.COMPLETED,
                overallScore: 72,
            },
            {
                id: 'processing',
                status: CVAnalysisStatus.PROCESSING,
                overallScore: null,
            },
        ];
        prisma.$transaction.mockResolvedValue([items, 23]);
        const result = await service.listHistory(USER_ID, CV_ID, {
            page: 2,
            limit: 10,
        });
        expect(prisma.cVAnalysis.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { cvVersionId: CV_VERSION_ID },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: 10,
                take: 10,
            }),
        );
        expect(result).toEqual({
            items,
            pagination: { page: 2, limit: 10, total: 23, totalPages: 3 },
        });
        const historySelect =
            prisma.cVAnalysis.findMany.mock.calls[0][0].select;
        expect(historySelect).not.toHaveProperty('modelProvider');
        expect(historySelect).not.toHaveProperty('modelName');
        expect(historySelect).not.toHaveProperty('promptVersion');
        expect(historySelect).not.toHaveProperty('errorCode');
        expect(historySelect).not.toHaveProperty('errorMessage');
    });
});
