import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { JDAnalysisStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JdAnalyzerService } from './jd-analysis/jd-analyzer.service';
import { JobDescriptionService } from './job-description.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const JD_ID = '00000000-0000-4000-8000-000000000002';
const jd = {
    id: JD_ID,
    title: 'Frontend Developer',
    company: 'Acme',
    content: 'A sufficiently detailed job description for testing.',
};

describe('JobDescriptionService', () => {
    const prisma = {
        jobDescription: {
            create: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
        },
        jDAnalysis: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        $transaction: jest.fn(),
    };
    const analyzer = { analyze: jest.fn() };
    const config = { get: jest.fn() };
    let service: JobDescriptionService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new JobDescriptionService(
            prisma as unknown as PrismaService,
            analyzer as unknown as JdAnalyzerService,
            config as unknown as ConfigService,
        );
        prisma.jobDescription.findFirst.mockResolvedValue(jd);
        prisma.jDAnalysis.findFirst.mockResolvedValue(null);
        config.get.mockImplementation((key: string, fallback?: unknown) =>
            key === 'NODE_ENV' ? 'test' : fallback,
        );
    });

    it('scopes detail reads to owner and active records', async () => {
        await service.get(USER_ID, JD_ID);
        expect(prisma.jobDescription.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: JD_ID, userId: USER_ID, deletedAt: null },
            }),
        );
    });

    it('returns not found for inaccessible JD', async () => {
        prisma.jobDescription.findFirst.mockResolvedValue(null);
        await expect(service.get(USER_ID, JD_ID)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('soft deletes after ownership verification', async () => {
        prisma.jobDescription.update.mockResolvedValue({});
        await service.delete(USER_ID, JD_ID);
        expect(prisma.jobDescription.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: JD_ID },
                data: { deletedAt: expect.any(Date) },
            }),
        );
    });

    it('latest selects only completed analyses', async () => {
        prisma.jDAnalysis.findFirst.mockResolvedValue({ id: 'analysis' });
        await service.latest(USER_ID, JD_ID);
        expect(prisma.jDAnalysis.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    jobDescriptionId: JD_ID,
                    status: JDAnalysisStatus.COMPLETED,
                },
            }),
        );
    });

    it('transitions the same analysis row from processing to completed', async () => {
        prisma.jDAnalysis.create.mockResolvedValue({ id: 'analysis-id' });
        prisma.jDAnalysis.update.mockResolvedValue({
            id: 'analysis-id',
            status: JDAnalysisStatus.COMPLETED,
        });
        analyzer.analyze.mockResolvedValue({
            result: {
                detectedRole: 'Frontend',
                seniority: 'Junior',
                summary: 'Summary',
                requiredSkills: [],
                preferredSkills: [],
                responsibilities: [],
                requirements: [],
                keywords: [],
                interviewFocus: [],
                insights: [],
            },
            metadata: {
                modelProvider: 'GEMINI',
                modelName: 'test',
                promptVersion: 'v1',
            },
        });
        await service.analyze(USER_ID, JD_ID);
        expect(prisma.jDAnalysis.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: {
                    jobDescriptionId: JD_ID,
                    status: JDAnalysisStatus.PROCESSING,
                },
            }),
        );
        expect(prisma.jDAnalysis.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'analysis-id' },
                data: expect.objectContaining({
                    status: JDAnalysisStatus.COMPLETED,
                }),
            }),
        );
    });
});
