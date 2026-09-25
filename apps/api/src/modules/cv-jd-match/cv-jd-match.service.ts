import {
    ConflictException,
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CVAnalysisStatus, CVJDMatchStatus, CVProcessingStatus, JDAnalysisStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiException, type AiErrorCode } from '../ai/ai.errors';
import { CreateCvJdMatchDto } from './dto/create-cv-jd-match.dto';
import { ListCvJdMatchesQueryDto } from './dto/list-cv-jd-matches-query.dto';
import { CvJdMatcherService } from './matching/cv-jd-matcher.service';

const DETAIL_SELECT = {
    id: true, userId: true, cvId: true, cvVersionId: true, cvAnalysisId: true,
    jobDescriptionId: true, jdAnalysisId: true, status: true,
    cvNameSnapshot: true, cvVersionNumber: true, jdTitleSnapshot: true,
    jdCompanySnapshot: true, cvUpdatedAtSnapshot: true, jdUpdatedAtSnapshot: true,
    matchScore: true, scoreBreakdown: true, matchSummary: true,
    matchedSkills: true, skillGaps: true, strengths: true, gaps: true,
    experienceAlignment: true, recommendations: true, modelProvider: true,
    modelName: true, promptVersion: true, errorCode: true, createdAt: true,
    completedAt: true,
} as const;

const SUMMARY_SELECT = {
    id: true, cvId: true, jobDescriptionId: true, status: true,
    cvNameSnapshot: true, cvVersionNumber: true, jdTitleSnapshot: true,
    jdCompanySnapshot: true, cvUpdatedAtSnapshot: true, jdUpdatedAtSnapshot: true,
    matchScore: true, scoreBreakdown: true, createdAt: true, completedAt: true,
} as const;

@Injectable()
export class CvJdMatchService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly matcher: CvJdMatcherService,
        private readonly config: ConfigService,
    ) {}

    async create(userId: string, dto: CreateCvJdMatchDto) {
        const sources = await this.loadEligibleSources(userId, dto.cvId, dto.jobDescriptionId);
        await this.assertWithinDailyLimit(userId);
        const running = await this.prisma.cVJDMatch.findFirst({
            where: {
                cvAnalysisId: sources.cvAnalysis.id,
                jdAnalysisId: sources.jdAnalysis.id,
                status: CVJDMatchStatus.PROCESSING,
            },
            select: { id: true },
        });
        if (running) this.alreadyProcessing();

        let attempt: { id: string };
        try {
            attempt = await this.prisma.cVJDMatch.create({
                data: {
                    userId,
                    cvId: sources.cv.id,
                    cvVersionId: sources.version.id,
                    cvAnalysisId: sources.cvAnalysis.id,
                    jobDescriptionId: sources.jd.id,
                    jdAnalysisId: sources.jdAnalysis.id,
                    status: CVJDMatchStatus.PROCESSING,
                    cvNameSnapshot: sources.cv.name,
                    cvVersionNumber: sources.version.versionNumber,
                    jdTitleSnapshot: sources.jd.title,
                    jdCompanySnapshot: sources.jd.company,
                    cvUpdatedAtSnapshot: sources.cv.updatedAt,
                    jdUpdatedAtSnapshot: sources.jd.updatedAt,
                },
                select: { id: true },
            });
        } catch (error) {
            if (this.isP2002(error)) this.alreadyProcessing();
            throw new InternalServerErrorException({
                code: 'CV_JD_MATCH_CREATE_FAILED',
                message: 'Không thể bắt đầu đối chiếu CV và JD.',
            });
        }

        try {
            const output = await this.matcher.match({
                cv: {
                    name: sources.cv.name,
                    sourceText: sources.version.extractedText,
                    analysis: sources.cvAnalysis,
                },
                jobDescription: {
                    title: sources.jd.title,
                    company: sources.jd.company,
                    sourceText: sources.jd.content,
                    analysis: sources.jdAnalysis,
                },
            });
            const completed = await this.prisma.cVJDMatch.update({
                where: { id: attempt.id },
                data: {
                    status: CVJDMatchStatus.COMPLETED,
                    ...output.result,
                    ...output.metadata,
                    errorCode: null,
                    errorMessage: null,
                    completedAt: new Date(),
                },
                select: DETAIL_SELECT,
            });
            return serializeMatch(completed);
        } catch (error) {
            const aiError = error instanceof AiException
                ? error
                : new AiException('AI_PROVIDER_ERROR', { cause: error });
            await this.prisma.cVJDMatch.update({
                where: { id: attempt.id },
                data: {
                    status: CVJDMatchStatus.FAILED,
                    errorCode: aiError.code,
                    errorMessage: aiError.safeMessage,
                    completedAt: new Date(),
                },
                select: { id: true },
            });
            throw this.toHttpException(aiError);
        }
    }

    async options(userId: string) {
        const [cvs, jobDescriptions] = await Promise.all([
            this.prisma.cV.findMany({
                where: { userId, deletedAt: null },
                orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
                select: {
                    id: true, name: true, originalFilename: true, isDefault: true, updatedAt: true,
                    processingStatus: true,
                    currentVersion: {
                        select: {
                            id: true,
                            analyses: {
                                where: { status: CVAnalysisStatus.COMPLETED },
                                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                                take: 1,
                                select: { id: true },
                            },
                        },
                    },
                },
            }),
            this.prisma.jobDescription.findMany({
                where: { userId, deletedAt: null },
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true, title: true, company: true, updatedAt: true,
                    analyses: {
                        where: { status: JDAnalysisStatus.COMPLETED },
                        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                        take: 1,
                        select: { id: true },
                    },
                },
            }),
        ]);
        return {
            cvs: cvs.map((cv) => ({
                id: cv.id,
                name: cv.name,
                originalFilename: cv.originalFilename,
                isDefault: cv.isDefault,
                updatedAt: cv.updatedAt,
                eligible: cv.processingStatus === CVProcessingStatus.READY && Boolean(cv.currentVersion?.analyses[0]),
                reason: cv.processingStatus !== CVProcessingStatus.READY
                    ? 'CV chưa sẵn sàng.'
                    : !cv.currentVersion?.analyses[0]
                      ? 'Cần phân tích CV trước.'
                      : null,
            })),
            jobDescriptions: jobDescriptions.map((jd) => ({
                id: jd.id,
                title: jd.title,
                company: jd.company,
                updatedAt: jd.updatedAt,
                eligible: Boolean(jd.analyses[0]),
                reason: jd.analyses[0] ? null : 'Cần phân tích JD trước.',
            })),
        };
    }
    async get(userId: string, id: string) {
        const match = await this.prisma.cVJDMatch.findFirst({
            where: { id, userId },
            select: DETAIL_SELECT,
        });
        if (!match) this.notFound();
        return serializeMatch(match);
    }

    async list(userId: string, query: ListCvJdMatchesQueryDto) {
        const where = {
            userId,
            ...(query.cvId ? { cvId: query.cvId } : {}),
            ...(query.jobDescriptionId ? { jobDescriptionId: query.jobDescriptionId } : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.cVJDMatch.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                select: SUMMARY_SELECT,
            }),
            this.prisma.cVJDMatch.count({ where }),
        ]);
        return {
            items: items.map(serializeMatch),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        };
    }

    private async loadEligibleSources(userId: string, cvId: string, jdId: string) {
        const [cv, jd] = await Promise.all([
            this.prisma.cV.findFirst({
                where: { id: cvId, userId, deletedAt: null },
                select: {
                    id: true, name: true, updatedAt: true, processingStatus: true,
                    currentVersion: {
                        select: {
                            id: true, versionNumber: true, extractedText: true,
                            processingStatus: true,
                            analyses: {
                                where: { status: CVAnalysisStatus.COMPLETED },
                                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                                take: 1,
                                select: {
                                    id: true, overallScore: true, detectedRole: true,
                                    detectedLevel: true, extractedSkills: true,
                                    workExperiences: true, projects: true, education: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.jobDescription.findFirst({
                where: { id: jdId, userId, deletedAt: null },
                select: {
                    id: true, title: true, company: true, updatedAt: true, content: true,
                    analyses: {
                        where: { status: JDAnalysisStatus.COMPLETED },
                        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                        take: 1,
                        select: {
                            id: true, detectedRole: true, seniority: true,
                            summary: true, requiredSkills: true, preferredSkills: true,
                            responsibilities: true, requirements: true, keywords: true,
                        },
                    },
                },
            }),
        ]);
        if (!cv) throw new NotFoundException({ code: 'CV_NOT_FOUND', message: 'Không tìm thấy CV.' });
        if (!jd) throw new NotFoundException({ code: 'JOB_DESCRIPTION_NOT_FOUND', message: 'Không tìm thấy mô tả công việc.' });
        if (cv.processingStatus !== CVProcessingStatus.READY || !cv.currentVersion || cv.currentVersion.processingStatus !== CVProcessingStatus.READY) {
            throw new UnprocessableEntityException({ code: 'CV_NOT_READY', message: 'CV chưa sẵn sàng để đối chiếu.' });
        }
        const cvAnalysis = cv.currentVersion.analyses[0];
        if (!cvAnalysis) throw new UnprocessableEntityException({ code: 'CV_ANALYSIS_REQUIRED', message: 'Hãy phân tích CV trước khi đối chiếu.' });
        const jdAnalysis = jd.analyses[0];
        if (!jdAnalysis) throw new UnprocessableEntityException({ code: 'JD_ANALYSIS_REQUIRED', message: 'Hãy phân tích JD trước khi đối chiếu.' });
        return { cv, version: cv.currentVersion, cvAnalysis, jd, jdAnalysis };
    }

    private async assertWithinDailyLimit(userId: string) {
        if (this.config.get<string>('NODE_ENV') !== 'production') return;
        const limit = this.config.get<number>('CV_JD_MATCH_DAILY_LIMIT', 10);
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const count = await this.prisma.cVJDMatch.count({ where: { userId, createdAt: { gte: start } } });
        if (count >= limit) throw new HttpException({
            code: 'CV_JD_MATCH_DAILY_LIMIT_REACHED',
            message: `Bạn đã dùng hết ${limit} lượt đối chiếu hôm nay.`,
        }, HttpStatus.TOO_MANY_REQUESTS);
    }

    private alreadyProcessing(): never {
        throw new ConflictException({
            code: 'CV_JD_MATCH_ALREADY_PROCESSING',
            message: 'Cặp CV và JD này đang được đối chiếu.',
        });
    }
    private notFound(): never {
        throw new NotFoundException({ code: 'CV_JD_MATCH_NOT_FOUND', message: 'Không tìm thấy kết quả đối chiếu.' });
    }
    private isP2002(error: unknown): boolean {
        return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
    }
    private toHttpException(error: AiException) {
        const statuses: Record<AiErrorCode, HttpStatus> = {
            AI_CONFIGURATION_ERROR: HttpStatus.SERVICE_UNAVAILABLE,
            AI_PROVIDER_ERROR: HttpStatus.BAD_GATEWAY,
            AI_TIMEOUT: HttpStatus.GATEWAY_TIMEOUT,
            AI_RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
            AI_EMPTY_RESPONSE: HttpStatus.BAD_GATEWAY,
            AI_INVALID_RESPONSE: HttpStatus.BAD_GATEWAY,
            AI_SCHEMA_VALIDATION_FAILED: HttpStatus.BAD_GATEWAY,
            AI_INVALID_INPUT: HttpStatus.UNPROCESSABLE_ENTITY,
        };
        return new HttpException({ code: error.code, message: error.safeMessage }, statuses[error.code]);
    }
}

function serializeMatch<T extends { matchScore: unknown }>(match: T): Omit<T, 'matchScore'> & { matchScore: number | null } {
    return { ...match, matchScore: match.matchScore === null ? null : Number(match.matchScore) };
}