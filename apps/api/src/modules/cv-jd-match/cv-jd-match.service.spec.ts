import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { CVJDMatchStatus, CVProcessingStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CvJdMatchService } from './cv-jd-match.service';
import { CvJdMatcherService } from './matching/cv-jd-matcher.service';

const USER = '00000000-0000-4000-8000-000000000001';
const CV = '00000000-0000-4000-8000-000000000002';
const JD = '00000000-0000-4000-8000-000000000003';
const sources = {
    cv: { id: CV, name: 'CV Frontend', updatedAt: new Date('2026-09-20T00:00:00Z'), processingStatus: CVProcessingStatus.READY, currentVersion: { id: 'version', versionNumber: 2, extractedText: 'React', processingStatus: CVProcessingStatus.READY, analyses: [{ id: 'cv-analysis', overallScore: 80, detectedRole: 'Frontend', detectedLevel: 'JUNIOR', extractedSkills: [], workExperiences: [], projects: [], education: [] }] } },
    jd: { id: JD, title: 'Frontend', company: 'Interviewly', updatedAt: new Date('2026-09-18T00:00:00Z'), content: 'React required', analyses: [{ id: 'jd-analysis', detectedRole: 'Frontend', seniority: 'Junior', summary: 'Summary', requiredSkills: ['React'], preferredSkills: [], responsibilities: [], requirements: [], keywords: [] }] },
};
const result = { matchScore: 80, scoreBreakdown: {
        requiredSkills: { earned: 35, maximum: 40, reason: 'Thiếu một phần bằng chứng bắt buộc.' },
        preferredSkills: { earned: 8, maximum: 10, reason: 'Thiếu một kỹ năng ưu tiên.' },
        experienceAndRole: { earned: 17, maximum: 20, reason: 'Kinh nghiệm gần phù hợp.' },
        responsibilityEvidence: { earned: 15, maximum: 20, reason: 'Minh chứng trách nhiệm chưa đầy đủ.' },
        educationAndDomain: { earned: 8, maximum: 10, reason: 'Phù hợp phần lớn.' },
    }, matchSummary: 'Phù hợp', matchedSkills: [], skillGaps: [], strengths: [], gaps: [], experienceAlignment: { summary: 'Phù hợp', jdExpectation: null, cvEvidence: null }, recommendations: [] };

describe('CvJdMatchService', () => {
    const prisma = {
        cV: { findFirst: jest.fn(), findMany: jest.fn() },
        jobDescription: { findFirst: jest.fn(), findMany: jest.fn() },
        cVJDMatch: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
        $transaction: jest.fn(),
    };
    const matcher = { match: jest.fn() };
    const config = { get: jest.fn() };
    let service: CvJdMatchService;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new CvJdMatchService(prisma as unknown as PrismaService, matcher as unknown as CvJdMatcherService, config as unknown as ConfigService);
        prisma.cV.findFirst.mockResolvedValue(sources.cv);
        prisma.jobDescription.findFirst.mockResolvedValue(sources.jd);
        prisma.cVJDMatch.findFirst.mockResolvedValue(null);
        prisma.cVJDMatch.create.mockResolvedValue({ id: 'match' });
        prisma.cVJDMatch.update.mockResolvedValue({ id: 'match', matchScore: 80 });
        matcher.match.mockResolvedValue({ result, metadata: { modelProvider: 'GEMINI', modelName: 'test', promptVersion: 'v1' } });
        config.get.mockImplementation((key: string, fallback?: unknown) => key === 'NODE_ENV' ? 'test' : fallback);
    });
    it('scopes both source queries to owner and active records', async () => {
        await service.create(USER, { cvId: CV, jobDescriptionId: JD });
        expect(prisma.cV.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: CV, userId: USER, deletedAt: null } }));
        expect(prisma.jobDescription.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: JD, userId: USER, deletedAt: null } }));
    });
    it('rejects inaccessible or cross-user CV', async () => {
        prisma.cV.findFirst.mockResolvedValue(null);
        await expect(service.create(USER, { cvId: CV, jobDescriptionId: JD })).rejects.toBeInstanceOf(NotFoundException);
    });
    it('rejects inaccessible or deleted JD', async () => {
        prisma.jobDescription.findFirst.mockResolvedValue(null);
        await expect(service.create(USER, { cvId: CV, jobDescriptionId: JD })).rejects.toBeInstanceOf(NotFoundException);
    });
    it('requires a successful CV analysis', async () => {
        prisma.cV.findFirst.mockResolvedValue({ ...sources.cv, currentVersion: { ...sources.cv.currentVersion, analyses: [] } });
        await expect(service.create(USER, { cvId: CV, jobDescriptionId: JD })).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
    it('requires a successful JD analysis', async () => {
        prisma.jobDescription.findFirst.mockResolvedValue({ ...sources.jd, analyses: [] });
        await expect(service.create(USER, { cvId: CV, jobDescriptionId: JD })).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
    it('rejects a concurrent match for the same immutable analyses', async () => {
        prisma.cVJDMatch.findFirst.mockResolvedValue({ id: 'running' });
        await expect(service.create(USER, { cvId: CV, jobDescriptionId: JD })).rejects.toBeInstanceOf(ConflictException);
    });
    it('creates a new append-only row and pins analysis snapshots', async () => {
        await service.create(USER, { cvId: CV, jobDescriptionId: JD });
        expect(prisma.cVJDMatch.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: USER, cvAnalysisId: 'cv-analysis', jdAnalysisId: 'jd-analysis', cvVersionNumber: 2, status: CVJDMatchStatus.PROCESSING }) }));
        expect(matcher.match).toHaveBeenCalled();
    });
    it('marks provider failures as FAILED', async () => {
        matcher.match.mockRejectedValue(new Error('provider secret'));
        await expect(service.create(USER, { cvId: CV, jobDescriptionId: JD })).rejects.toMatchObject({ status: 502 });
        expect(prisma.cVJDMatch.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: CVJDMatchStatus.FAILED, errorCode: 'AI_PROVIDER_ERROR' }) }));
    });
    it('scopes detail reads to the authenticated user', async () => {
        prisma.cVJDMatch.findFirst.mockResolvedValue({ id: 'match', matchScore: 75 });
        await service.get(USER, 'match');
        expect(prisma.cVJDMatch.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'match', userId: USER } }));
    });
    it('returns paginated append-only history', async () => {
        prisma.$transaction.mockResolvedValue([[{ id: 'match', matchScore: 75 }], 1]);
        const response = await service.list(USER, { page: 1, limit: 10 });
        expect(response.pagination.total).toBe(1);
        expect(response.items[0].matchScore).toBe(75);
    });
});