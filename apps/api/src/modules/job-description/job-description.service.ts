import {
    ConflictException,
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JDAnalysisStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiException, type AiErrorCode } from '../ai/ai.errors';
import { CreateJobDescriptionDto } from './dto/create-job-description.dto';
import { ListJdAnalysesQueryDto } from './dto/list-jd-analyses-query.dto';
import {
    JobDescriptionListSort,
    JobDescriptionListStatus,
    ListJobDescriptionsQueryDto,
} from './dto/list-job-descriptions-query.dto';
import { UpdateJobDescriptionDto } from './dto/update-job-description.dto';
import { JdAnalyzerService } from './jd-analysis/jd-analyzer.service';

const ANALYSIS_DETAIL_SELECT = {
    id: true,
    jobDescriptionId: true,
    status: true,
    detectedRole: true,
    seniority: true,
    summary: true,
    requiredSkills: true,
    preferredSkills: true,
    responsibilities: true,
    requirements: true,
    keywords: true,
    interviewFocus: true,
    insights: true,
    modelProvider: true,
    modelName: true,
    promptVersion: true,
    createdAt: true,
    completedAt: true,
} as const;

const ANALYSIS_SUMMARY_SELECT = {
    id: true,
    jobDescriptionId: true,
    status: true,
    detectedRole: true,
    seniority: true,
    createdAt: true,
    completedAt: true,
} as const;

@Injectable()
export class JobDescriptionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly analyzer: JdAnalyzerService,
        private readonly config: ConfigService,
    ) {}

    create(userId: string, dto: CreateJobDescriptionDto) {
        return this.prisma.jobDescription.create({
            data: {
                userId,
                title: dto.title,
                company: dto.company || null,
                content: dto.content,
            },
            select: this.detailSelect(),
        });
    }

    async list(userId: string, query: ListJobDescriptionsQueryDto) {
        const search = query.search?.trim();
        const latestAnalyses =
            query.status === JobDescriptionListStatus.ALL
                ? []
                : await this.prisma.jDAnalysis.findMany({
                      where: { jobDescription: { userId, deletedAt: null } },
                      distinct: ['jobDescriptionId'],
                      orderBy: [
                          { jobDescriptionId: 'asc' },
                          { createdAt: 'desc' },
                          { id: 'desc' },
                      ],
                      select: { jobDescriptionId: true, status: true },
                  });
        const statusIds = latestAnalyses
            .filter((analysis) =>
                query.status === JobDescriptionListStatus.ANALYZED
                    ? analysis.status === JDAnalysisStatus.COMPLETED
                    : query.status === JobDescriptionListStatus.FAILED
                      ? analysis.status === JDAnalysisStatus.FAILED
                      : false,
            )
            .map((analysis) => analysis.jobDescriptionId);
        const statusWhere =
            query.status === JobDescriptionListStatus.ALL
                ? {}
                : query.status === JobDescriptionListStatus.NOT_ANALYZED
                  ? {
                        id: {
                            notIn: latestAnalyses.map(
                                (analysis) => analysis.jobDescriptionId,
                            ),
                        },
                    }
                  : { id: { in: statusIds } };
        const where = {
            userId,
            deletedAt: null,
            ...statusWhere,
            ...(search
                ? {
                      OR: [
                          {
                              title: {
                                  contains: search,
                                  mode: 'insensitive' as const,
                              },
                          },
                          {
                              company: {
                                  contains: search,
                                  mode: 'insensitive' as const,
                              },
                          },
                      ],
                  }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.jobDescription.findMany({
                where,
                orderBy: this.listOrderBy(query.sort),
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                select: this.listSelect(),
            }),
            this.prisma.jobDescription.count({ where }),
        ]);
        return {
            items,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        };
    }

    async get(userId: string, id: string) {
        const item = await this.prisma.jobDescription.findFirst({
            where: { id, userId, deletedAt: null },
            select: this.detailSelect(),
        });
        if (!item) this.notFound();
        return item;
    }

    async update(userId: string, id: string, dto: UpdateJobDescriptionDto) {
        await this.assertOwned(userId, id);
        return this.prisma.jobDescription.update({
            where: { id },
            data: {
                ...(dto.title !== undefined ? { title: dto.title } : {}),
                ...(dto.company !== undefined
                    ? { company: dto.company || null }
                    : {}),
                ...(dto.content !== undefined ? { content: dto.content } : {}),
            },
            select: this.detailSelect(),
        });
    }

    async delete(userId: string, id: string) {
        await this.assertOwned(userId, id);
        await this.prisma.jobDescription.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        return { id, deleted: true };
    }

    async analyze(userId: string, id: string) {
        const jd = await this.assertOwned(userId, id);
        await this.assertWithinDailyLimit(userId);
        const running = await this.prisma.jDAnalysis.findFirst({
            where: {
                jobDescriptionId: id,
                status: JDAnalysisStatus.PROCESSING,
            },
            select: { id: true },
        });
        if (running) this.alreadyProcessing();

        let attempt: { id: string };
        try {
            attempt = await this.prisma.jDAnalysis.create({
                data: {
                    jobDescriptionId: id,
                    status: JDAnalysisStatus.PROCESSING,
                },
                select: { id: true },
            });
        } catch (error) {
            if (this.isP2002(error)) this.alreadyProcessing();
            throw error;
        }

        try {
            const output = await this.analyzer.analyze(jd);
            return await this.prisma.jDAnalysis.update({
                where: { id: attempt.id },
                data: {
                    status: JDAnalysisStatus.COMPLETED,
                    ...output.result,
                    ...output.metadata,
                    errorCode: null,
                    errorMessage: null,
                    completedAt: new Date(),
                },
                select: ANALYSIS_DETAIL_SELECT,
            });
        } catch (error) {
            const aiError =
                error instanceof AiException
                    ? error
                    : new AiException('AI_PROVIDER_ERROR', { cause: error });
            await this.prisma.jDAnalysis.update({
                where: { id: attempt.id },
                data: {
                    status: JDAnalysisStatus.FAILED,
                    errorCode: aiError.code,
                    errorMessage: aiError.safeMessage,
                    completedAt: new Date(),
                },
            });
            throw this.toHttpException(aiError);
        }
    }

    async latest(userId: string, id: string) {
        await this.assertOwned(userId, id);
        const result = await this.prisma.jDAnalysis.findFirst({
            where: { jobDescriptionId: id, status: JDAnalysisStatus.COMPLETED },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: ANALYSIS_DETAIL_SELECT,
        });
        if (!result)
            throw new NotFoundException({
                code: 'JD_ANALYSIS_NOT_FOUND',
                message: 'JD chưa có kết quả phân tích.',
            });
        return result;
    }

    async history(userId: string, id: string, query: ListJdAnalysesQueryDto) {
        await this.assertOwned(userId, id);
        const where = { jobDescriptionId: id };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.jDAnalysis.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                select: ANALYSIS_SUMMARY_SELECT,
            }),
            this.prisma.jDAnalysis.count({ where }),
        ]);
        return {
            items,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages: Math.ceil(total / query.limit),
            },
        };
    }

    private async assertOwned(userId: string, id: string) {
        const jd = await this.prisma.jobDescription.findFirst({
            where: { id, userId, deletedAt: null },
            select: { id: true, title: true, company: true, content: true },
        });
        if (!jd) this.notFound();
        return jd;
    }

    private async assertWithinDailyLimit(userId: string) {
        if (this.config.get<string>('NODE_ENV') !== 'production') return;
        const limit = this.config.get<number>('JD_ANALYSIS_DAILY_LIMIT', 10);
        const now = new Date();
        const start = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
        const count = await this.prisma.jDAnalysis.count({
            where: { jobDescription: { userId }, createdAt: { gte: start } },
        });
        if (count >= limit)
            throw new HttpException(
                {
                    code: 'JD_ANALYSIS_DAILY_LIMIT_REACHED',
                    message: `Bạn đã dùng hết ${limit} lượt phân tích JD hôm nay.`,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
    }

    private detailSelect() {
        return {
            id: true,
            title: true,
            company: true,
            content: true,
            createdAt: true,
            updatedAt: true,
        } as const;
    }
    private listSelect() {
        return {
            id: true,
            title: true,
            company: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            analyses: {
                orderBy: { createdAt: 'desc' as const },
                take: 1,
                select: {
                    id: true,
                    status: true,
                    detectedRole: true,
                    seniority: true,
                    completedAt: true,
                },
            },
        } as const;
    }
    private listOrderBy(sort: JobDescriptionListSort) {
        if (sort === JobDescriptionListSort.NEWEST)
            return [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
        if (sort === JobDescriptionListSort.OLDEST)
            return [{ createdAt: 'asc' as const }, { id: 'asc' as const }];
        if (sort === JobDescriptionListSort.TITLE)
            return [{ title: 'asc' as const }, { id: 'asc' as const }];
        return [{ updatedAt: 'desc' as const }, { id: 'desc' as const }];
    }
    private notFound(): never {
        throw new NotFoundException({
            code: 'JOB_DESCRIPTION_NOT_FOUND',
            message: 'Không tìm thấy mô tả công việc.',
        });
    }
    private alreadyProcessing(): never {
        throw new ConflictException({
            code: 'JD_ANALYSIS_ALREADY_PROCESSING',
            message: 'JD này đang được phân tích.',
        });
    }
    private isP2002(error: unknown) {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'P2002'
        );
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
        return new HttpException(
            { code: error.code, message: error.safeMessage },
            statuses[error.code],
        );
    }
}
