import {
    ConflictException,
    HttpException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
    CVAnalysisStatus,
    CVProcessingStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiException, type AiErrorCode } from '../../ai/ai.errors';
import { mapAnalysisResultToPrisma } from './cv-analysis.mapper';
import { CvAnalyzerService } from './cv-analyzer.service';
import { ListCvAnalysesQueryDto } from './dto/list-cv-analyses-query.dto';

const ANALYSIS_DETAIL_SELECT = {
    id: true,
    cvId: true,
    status: true,
    overallScore: true,
    detectedRole: true,
    detectedLevel: true,
    extractedSkills: true,
    workExperiences: true,
    projects: true,
    education: true,
    strengths: true,
    weaknesses: true,
    interviewRisks: true,
    potentialQuestions: true,
    suggestions: true,
    modelProvider: true,
    modelName: true,
    promptVersion: true,
    createdAt: true,
    completedAt: true,
} as const;

const ANALYSIS_SUMMARY_SELECT = {
    id: true,
    cvId: true,
    status: true,
    overallScore: true,
    detectedRole: true,
    detectedLevel: true,
    createdAt: true,
    completedAt: true,
} as const;

@Injectable()
export class CvAnalysisService {
    private readonly logger = new Logger(CvAnalysisService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly analyzer: CvAnalyzerService,
        private readonly config: ConfigService,
    ) {}

    async analyze(userId: string, cvId: string) {
        const cv = await this.findOwnedCv(userId, cvId);
        this.assertReady(cv.processingStatus, cv.extractedText);
        const cvVersionId = this.getCurrentVersionId(cv.currentVersionId);
        await this.assertWithinDailyLimit(userId);

        const running = await this.prisma.cVAnalysis.findFirst({
            where: { cvVersionId, status: CVAnalysisStatus.PROCESSING },
            select: { id: true },
        });
        if (running) this.throwAlreadyProcessing();

        let analysis: { id: string; createdAt: Date };
        try {
            analysis = await this.prisma.cVAnalysis.create({
                data: {
                    cvId,
                    cvVersionId,
                    status: CVAnalysisStatus.PROCESSING,
                },
                select: { id: true, createdAt: true },
            });
        } catch (error) {
            if (this.isUniqueConstraintError(error)) {
                this.throwAlreadyProcessing();
            }
            this.logDatabaseError(
                'Không thể tạo lần phân tích CV.',
                error,
                cvId,
            );
            throw new InternalServerErrorException({
                code: 'CV_ANALYSIS_CREATE_FAILED',
                message: 'Không thể bắt đầu phân tích CV. Vui lòng thử lại.',
            });
        }

        const startedAt = Date.now();
        let output: Awaited<ReturnType<CvAnalyzerService['analyze']>>;
        try {
            output = await this.analyzer.analyze({
                extractedText: cv.extractedText!.trim(),
            });
        } catch (error) {
            const aiError =
                error instanceof AiException
                    ? error
                    : new AiException('AI_PROVIDER_ERROR', { cause: error });
            await this.markFailedOrThrow(
                analysis.id,
                cvId,
                aiError.code,
                aiError.safeMessage,
            );
            throw this.toHttpException(aiError);
        }

        try {
            const completed = await this.prisma.cVAnalysis.update({
                where: { id: analysis.id },
                data: {
                    status: CVAnalysisStatus.COMPLETED,
                    ...mapAnalysisResultToPrisma(output.result),
                    modelProvider: output.metadata.modelProvider,
                    modelName: output.metadata.modelName,
                    promptVersion: output.metadata.promptVersion,
                    errorCode: null,
                    errorMessage: null,
                    completedAt: new Date(),
                },
                select: ANALYSIS_DETAIL_SELECT,
            });
            this.logger.log({
                message: 'Phân tích CV hoàn tất.',
                analysisId: analysis.id,
                cvId,
                provider: output.metadata.modelProvider,
                model: output.metadata.modelName,
                promptVersion: output.metadata.promptVersion,
                durationMs: Date.now() - startedAt,
            });
            return serializeAnalysisScore(completed);
        } catch (error) {
            this.logDatabaseError(
                'AI đã trả kết quả nhưng không thể lưu analysis COMPLETED.',
                error,
                cvId,
            );
            await this.markFailedOrThrow(
                analysis.id,
                cvId,
                'CV_ANALYSIS_PERSIST_FAILED',
                'Không thể lưu kết quả phân tích CV.',
            );
            throw new InternalServerErrorException({
                code: 'CV_ANALYSIS_PERSIST_FAILED',
                message:
                    'Không thể lưu kết quả phân tích CV. Vui lòng thử lại.',
            });
        }
    }

    async getLatest(userId: string, cvId: string) {
        const cv = await this.findOwnedCv(userId, cvId);
        const cvVersionId = this.getCurrentVersionId(cv.currentVersionId);
        const analysis = await this.prisma.cVAnalysis.findFirst({
            where: { cvVersionId, status: CVAnalysisStatus.COMPLETED },
            select: ANALYSIS_DETAIL_SELECT,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        if (!analysis) {
            throw new NotFoundException({
                code: 'CV_ANALYSIS_NOT_FOUND',
                message: 'CV chưa có kết quả phân tích thành công.',
            });
        }
        return serializeAnalysisScore(analysis);
    }

    async listHistory(
        userId: string,
        cvId: string,
        query: ListCvAnalysesQueryDto,
    ) {
        const cv = await this.findOwnedCv(userId, cvId);
        const cvVersionId = this.getCurrentVersionId(cv.currentVersionId);
        const where = { cvVersionId };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.cVAnalysis.findMany({
                where,
                select: ANALYSIS_SUMMARY_SELECT,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (query.page - 1) * query.limit,
                take: query.limit,
            }),
            this.prisma.cVAnalysis.count({ where }),
        ]);
        return {
            items: items.map(serializeAnalysisScore),
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        };
    }

    async compareVersions(
        userId: string,
        cvId: string,
        fromVersionId: string,
        toVersionId: string,
    ) {
        await this.findOwnedCv(userId, cvId);
        if (fromVersionId === toVersionId) {
            throw new UnprocessableEntityException({
                code: 'CV_VERSION_COMPARISON_SAME_VERSION',
                message: 'Vui lòng chọn hai phiên bản khác nhau.',
            });
        }

        const versions = await this.prisma.cVVersion.findMany({
            where: { cvId, id: { in: [fromVersionId, toVersionId] } },
            select: {
                id: true,
                versionNumber: true,
                originalFilename: true,
                createdAt: true,
            },
        });
        if (versions.length !== 2) {
            throw new NotFoundException({
                code: 'CV_VERSION_NOT_FOUND',
                message: 'Không tìm thấy phiên bản CV để so sánh.',
            });
        }

        const [fromAnalysis, toAnalysis] = await Promise.all([
            this.findLatestVersionAnalysis(fromVersionId),
            this.findLatestVersionAnalysis(toVersionId),
        ]);
        const fromVersion = versions.find((item) => item.id === fromVersionId)!;
        const toVersion = versions.find((item) => item.id === toVersionId)!;

        return {
            from: this.toComparisonVersion(fromVersion, fromAnalysis),
            to: this.toComparisonVersion(toVersion, toAnalysis),
            comparison:
                fromAnalysis && toAnalysis
                    ? buildVersionComparison(fromAnalysis, toAnalysis)
                    : null,
        };
    }

    async compareCvs(userId: string, leftCvId: string, rightCvId: string) {
        if (leftCvId === rightCvId) {
            throw new UnprocessableEntityException({
                code: 'CV_COMPARISON_SAME_CV',
                message: 'Vui lòng chọn hai CV khác nhau.',
            });
        }
        const cvs = await this.prisma.cV.findMany({
            where: {
                userId,
                deletedAt: null,
                id: { in: [leftCvId, rightCvId] },
            },
            select: { id: true, name: true, currentVersionId: true },
        });
        if (cvs.length !== 2 || cvs.some((cv) => !cv.currentVersionId)) {
            throw new NotFoundException({
                code: 'CV_NOT_FOUND',
                message: 'Không tìm thấy CV để so sánh.',
            });
        }
        const left = cvs.find((cv) => cv.id === leftCvId)!;
        const right = cvs.find((cv) => cv.id === rightCvId)!;
        const [leftAnalysis, rightAnalysis] = await Promise.all([
            this.findLatestVersionAnalysis(left.currentVersionId!),
            this.findLatestVersionAnalysis(right.currentVersionId!),
        ]);
        return {
            left: {
                id: left.id,
                name: left.name,
                analysis: this.toComparisonAnalysis(leftAnalysis),
            },
            right: {
                id: right.id,
                name: right.name,
                analysis: this.toComparisonAnalysis(rightAnalysis),
            },
            comparison:
                leftAnalysis && rightAnalysis
                    ? buildVersionComparison(leftAnalysis, rightAnalysis)
                    : null,
        };
    }

    private findLatestVersionAnalysis(cvVersionId: string) {
        return this.prisma.cVAnalysis.findFirst({
            where: { cvVersionId, status: CVAnalysisStatus.COMPLETED },
            select: {
                id: true,
                overallScore: true,
                detectedRole: true,
                detectedLevel: true,
                extractedSkills: true,
                weaknesses: true,
                interviewRisks: true,
                strengths: true,
                completedAt: true,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
    }

    private toComparisonVersion<
        TVersion extends {
            id: string;
            versionNumber: number;
            originalFilename: string;
            createdAt: Date;
        },
    >(
        version: TVersion,
        analysis: Awaited<
            ReturnType<CvAnalysisService['findLatestVersionAnalysis']>
        >,
    ) {
        return {
            ...version,
            analysis: this.toComparisonAnalysis(analysis),
        };
    }

    private toComparisonAnalysis(
        analysis: Awaited<
            ReturnType<CvAnalysisService['findLatestVersionAnalysis']>
        >,
    ) {
        return analysis
            ? {
                  id: analysis.id,
                  overallScore:
                      analysis.overallScore === null
                          ? null
                          : Number(analysis.overallScore),
                  detectedRole: analysis.detectedRole,
                  detectedLevel: analysis.detectedLevel,
                  completedAt: analysis.completedAt,
              }
            : null;
    }

    private async findOwnedCv(userId: string, cvId: string) {
        const cv = await this.prisma.cV.findFirst({
            where: { id: cvId, userId, deletedAt: null },
            select: {
                id: true,
                currentVersionId: true,
                processingStatus: true,
                extractedText: true,
            },
        });
        if (!cv) {
            throw new NotFoundException({
                code: 'CV_NOT_FOUND',
                message: 'Không tìm thấy CV.',
            });
        }
        return cv;
    }

    private getCurrentVersionId(currentVersionId: string | null): string {
        if (currentVersionId) return currentVersionId;
        throw new InternalServerErrorException({
            code: 'CV_VERSION_UNAVAILABLE',
            message: 'Không thể xác định phiên bản hiện tại của CV.',
        });
    }

    private async assertWithinDailyLimit(userId: string): Promise<void> {
        if (this.config.getOrThrow<string>('NODE_ENV') !== 'production') return;

        const dailyLimit = this.config.getOrThrow<number>(
            'CV_ANALYSIS_DAILY_LIMIT',
        );
        const now = new Date();
        const startOfDayUtc = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
        const attemptsToday = await this.prisma.cVAnalysis.count({
            where: {
                cv: { userId },
                createdAt: { gte: startOfDayUtc },
            },
        });

        if (attemptsToday < dailyLimit) return;

        const retryAt = new Date(startOfDayUtc);
        retryAt.setUTCDate(retryAt.getUTCDate() + 1);
        throw new HttpException(
            {
                code: 'CV_ANALYSIS_DAILY_LIMIT_REACHED',
                message: `Bạn đã sử dụng hết ${dailyLimit} lượt phân tích CV hôm nay.`,
                retryAt: retryAt.toISOString(),
            },
            HttpStatus.TOO_MANY_REQUESTS,
        );
    }

    private assertReady(
        status: CVProcessingStatus,
        extractedText: string | null,
    ): void {
        if (status !== CVProcessingStatus.READY) {
            throw new UnprocessableEntityException({
                code: 'CV_NOT_READY',
                message: 'CV chưa sẵn sàng để phân tích.',
            });
        }
        if (!extractedText?.trim()) {
            throw new UnprocessableEntityException({
                code: 'CV_TEXT_UNAVAILABLE',
                message: 'CV không có nội dung văn bản để phân tích.',
            });
        }
    }

    private async markFailedOrThrow(
        analysisId: string,
        cvId: string,
        errorCode: string,
        errorMessage: string,
    ): Promise<void> {
        try {
            await this.prisma.cVAnalysis.update({
                where: { id: analysisId },
                data: {
                    status: CVAnalysisStatus.FAILED,
                    errorCode,
                    errorMessage,
                    completedAt: new Date(),
                },
                select: { id: true },
            });
        } catch (databaseError) {
            this.logger.error({
                message: 'AI lỗi và không thể đánh dấu analysis FAILED.',
                analysisId,
                cvId,
                originalErrorCode: errorCode,
                databaseError:
                    databaseError instanceof Error
                        ? databaseError.message
                        : 'Unknown database error',
            });
            throw new InternalServerErrorException({
                code: 'CV_ANALYSIS_STATE_UPDATE_FAILED',
                message: 'Không thể cập nhật trạng thái phân tích CV.',
            });
        }
    }

    private toHttpException(error: AiException): HttpException {
        const statusByCode: Record<AiErrorCode, HttpStatus> = {
            AI_CONFIGURATION_ERROR: HttpStatus.SERVICE_UNAVAILABLE,
            AI_PROVIDER_ERROR: HttpStatus.BAD_GATEWAY,
            AI_TIMEOUT: HttpStatus.GATEWAY_TIMEOUT,
            AI_RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
            AI_EMPTY_RESPONSE: HttpStatus.BAD_GATEWAY,
            AI_INVALID_RESPONSE: HttpStatus.BAD_GATEWAY,
            AI_SCHEMA_VALIDATION_FAILED: HttpStatus.BAD_GATEWAY,
            AI_INVALID_INPUT: HttpStatus.UNPROCESSABLE_ENTITY,
        };
        return new HttpException(
            { code: error.code, message: error.safeMessage },
            statusByCode[error.code],
        );
    }

    private throwAlreadyProcessing(): never {
        throw new ConflictException({
            code: 'CV_ANALYSIS_ALREADY_PROCESSING',
            message: 'CV này đang được phân tích.',
        });
    }

    private isUniqueConstraintError(error: unknown): boolean {
        if (
            typeof error !== 'object' ||
            error === null ||
            !('code' in error) ||
            error.code !== 'P2002'
        ) {
            return false;
        }

        const meta = 'meta' in error ? error.meta : undefined;
        const target =
            typeof meta === 'object' && meta !== null && 'target' in meta
                ? meta.target
                : undefined;
        const targets = Array.isArray(target) ? target : [target];
        return targets.some(
            (item) =>
                typeof item === 'string' &&
                (item.includes('cv_version_id') ||
                    item.includes('cv_id') ||
                    item.includes('one_processing_per_cv')),
        );
    }

    private logDatabaseError(
        message: string,
        error: unknown,
        cvId: string,
    ): void {
        this.logger.error({
            message,
            cvId,
            error:
                error instanceof Error
                    ? error.message
                    : 'Unknown database error',
        });
    }
}

function serializeAnalysisScore<T extends { overallScore: unknown }>(
    analysis: T,
): Omit<T, 'overallScore'> & { overallScore: number | null } {
    return {
        ...analysis,
        overallScore:
            analysis.overallScore === null
                ? null
                : Number(analysis.overallScore),
    };
}

type ComparisonAnalysis = NonNullable<
    Awaited<ReturnType<CvAnalysisService['findLatestVersionAnalysis']>>
>;

function buildVersionComparison(
    from: ComparisonAnalysis,
    to: ComparisonAnalysis,
) {
    const fromSkills = extractSkillNames(from.extractedSkills);
    const toSkills = extractSkillNames(to.extractedSkills);
    const fromNormalized = new Map(
        fromSkills.map((skill) => [skill.toLocaleLowerCase(), skill]),
    );
    const toNormalized = new Map(
        toSkills.map((skill) => [skill.toLocaleLowerCase(), skill]),
    );
    return {
        scoreDelta: nullableDelta(from.overallScore, to.overallScore),
        skills: {
            added: toSkills.filter(
                (skill) => !fromNormalized.has(skill.toLocaleLowerCase()),
            ),
            removed: fromSkills.filter(
                (skill) => !toNormalized.has(skill.toLocaleLowerCase()),
            ),
            retained: toSkills.filter((skill) =>
                fromNormalized.has(skill.toLocaleLowerCase()),
            ),
        },
        strengthCountDelta:
            jsonArrayLength(to.strengths) - jsonArrayLength(from.strengths),
        weaknessCountDelta:
            jsonArrayLength(to.weaknesses) - jsonArrayLength(from.weaknesses),
        riskCountDelta:
            jsonArrayLength(to.interviewRisks) -
            jsonArrayLength(from.interviewRisks),
    };
}

function nullableDelta(from: unknown, to: unknown): number | null {
    if (from === null || to === null) return null;
    return Number(to) - Number(from);
}

function jsonArrayLength(value: unknown): number {
    return Array.isArray(value) ? value.length : 0;
}

function extractSkillNames(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (typeof item === 'string' && item.trim()) return [item.trim()];
        if (
            typeof item === 'object' &&
            item !== null &&
            'name' in item &&
            typeof item.name === 'string' &&
            item.name.trim()
        ) {
            return [item.name.trim()];
        }
        return [];
    });
}
