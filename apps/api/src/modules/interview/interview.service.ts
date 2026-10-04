import {
    ConflictException,
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
    Difficulty,
    InterviewPlanStatus,
    InterviewStatus,
    InterviewType,
    Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiException, type AiErrorCode } from '../ai/ai.errors';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { ListInterviewPlansQueryDto } from './dto/list-interview-plans-query.dto';
import {
    InterviewListSort,
    ListInterviewsQueryDto,
} from './dto/list-interviews-query.dto';
import { InterviewContextService } from './interview-context.service';
import { InterviewPlannerService } from './planning/interview-planner.service';

const DETAIL = {
    id: true,
    status: true,
    interviewType: true,
    difficulty: true,
    durationMinutes: true,
    questionCount: true,
    focusAreas: true,
    targetRole: true,
    targetLevel: true,
    createdAt: true,
    updatedAt: true,
    cv: { select: { id: true, name: true } },
    jobDescription: { select: { id: true, title: true, company: true } },
    plans: {
        where: { status: InterviewPlanStatus.COMPLETED },
        orderBy: { version: 'desc' as const },
        take: 1,
        select: {
            id: true,
            version: true,
            status: true,
            summary: true,
            planData: true,
            modelProvider: true,
            modelName: true,
            promptVersion: true,
            createdAt: true,
            completedAt: true,
        },
    },
} as const;

type InterviewPreviewPayload = {
    userId: string;
    expiresAt: number;
    source: {
        cvId: string;
        cvVersionId: string;
        cvAnalysisId: string;
        jobDescriptionId: string;
        jdAnalysisId: string;
        cvJdMatchId: string | null;
    };
    configuration: ReturnType<typeof previewConfiguration>;
    planData: { summary: string; [key: string]: unknown };
    metadata: {
        modelProvider: string;
        modelName: string;
        promptVersion: string;
    };
};
@Injectable()
export class InterviewService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly context: InterviewContextService,
        private readonly planner: InterviewPlannerService,
        private readonly config: ConfigService,
    ) {}

    async preview(userId: string, dto: CreateInterviewDto) {
        const src = await this.context.build(userId, dto);
        let output: Awaited<ReturnType<InterviewPlannerService['generate']>>;
        try {
            output = await this.planner.generate(src.snapshot);
        } catch (error) {
            const aiError =
                error instanceof AiException
                    ? error
                    : new AiException('AI_PROVIDER_ERROR', { cause: error });
            throw this.http(aiError);
        }
        const payload = {
            userId,
            expiresAt: Date.now() + 15 * 60 * 1000,
            source: {
                cvId: src.cv.id,
                cvVersionId: src.version.id,
                cvAnalysisId: src.cvAnalysis.id,
                jobDescriptionId: src.jd.id,
                jdAnalysisId: src.jdAnalysis.id,
                cvJdMatchId: src.match?.id ?? null,
            },
            configuration: previewConfiguration(dto),
            planData: output.result,
            metadata: output.metadata,
        };
        return {
            planData: output.result,
            metadata: output.metadata,
            previewToken: this.signPreview(payload),
        };
    }
    async options(userId: string) {
        const [cvs, jobs, matches, preference, setting] = await Promise.all([
            this.prisma.cV.findMany({
                where: { userId, deletedAt: null, processingStatus: 'READY' },
                orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
                select: {
                    id: true,
                    name: true,
                    originalFilename: true,
                    fileSize: true,
                    isDefault: true,
                    updatedAt: true,
                    currentVersion: {
                        select: {
                            analyses: {
                                where: { status: 'COMPLETED' },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                                select: {
                                    detectedRole: true,
                                    detectedLevel: true,
                                    extractedSkills: true,
                                    workExperiences: true,
                                    projects: true,
                                    education: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.jobDescription.findMany({
                where: { userId, deletedAt: null },
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    title: true,
                    company: true,
                    updatedAt: true,
                    analyses: {
                        where: { status: 'COMPLETED' },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            detectedRole: true,
                            seniority: true,
                            requiredSkills: true,
                            interviewFocus: true,
                        },
                    },
                },
            }),
            this.prisma.cVJDMatch.findMany({
                where: { userId, status: 'COMPLETED' },
                orderBy: { createdAt: 'desc' },
                take: 50,
                select: {
                    id: true,
                    cvId: true,
                    jobDescriptionId: true,
                    matchScore: true,
                    strengths: true,
                    gaps: true,
                    createdAt: true,
                },
            }),
            this.prisma.userPreference.findUnique({
                where: { userId },
                select: {
                    targetRole: true,
                    experienceLevel: true,
                    defaultInterviewType: true,
                    defaultDifficulty: true,
                },
            }),
            this.prisma.userSetting.findUnique({
                where: { userId },
                select: { defaultDurationMinutes: true },
            }),
        ]);
        return {
            cvs: cvs
                .filter((cv) => cv.currentVersion?.analyses.length)
                .map((cv) => ({
                    id: cv.id,
                    name: cv.name,
                    originalFilename: cv.originalFilename,
                    fileSize: cv.fileSize,
                    isDefault: cv.isDefault,
                    updatedAt: cv.updatedAt,
                    analysis: cv.currentVersion!.analyses[0],
                })),
            jobDescriptions: jobs
                .filter((job) => job.analyses.length)
                .map((job) => ({
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    updatedAt: job.updatedAt,
                    analysis: job.analyses[0],
                })),
            matches: matches.map((x) => ({
                ...x,
                matchScore: x.matchScore?.toNumber() ?? null,
            })),
            defaults: {
                targetRole: preference?.targetRole ?? null,
                targetLevel: preference?.experienceLevel ?? null,
                interviewType:
                    preference?.defaultInterviewType ?? InterviewType.TECHNICAL,
                difficulty:
                    preference?.defaultDifficulty ?? Difficulty.ADAPTIVE,
                durationMinutes: setting?.defaultDurationMinutes ?? 30,
            },
        };
    }
    async list(userId: string, query: ListInterviewsQueryDto) {
        const search = query.search?.trim();
        const where: Prisma.InterviewWhereInput = {
            userId,
            ...(query.status ? { status: query.status } : {}),
            ...(search
                ? {
                      OR: [
                          {
                              targetRole: {
                                  contains: search,
                                  mode: 'insensitive',
                              },
                          },
                          {
                              cv: {
                                  name: {
                                      contains: search,
                                      mode: 'insensitive',
                                  },
                              },
                          },
                          {
                              jobDescription: {
                                  OR: [
                                      {
                                          title: {
                                              contains: search,
                                              mode: 'insensitive',
                                          },
                                      },
                                      {
                                          company: {
                                              contains: search,
                                              mode: 'insensitive',
                                          },
                                      },
                                  ],
                              },
                          },
                      ],
                  }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.interview.findMany({
                where,
                orderBy:
                    query.sort === InterviewListSort.OLDEST
                        ? { createdAt: 'asc' }
                        : query.sort === InterviewListSort.NEWEST
                          ? { createdAt: 'desc' }
                          : { updatedAt: 'desc' },
                skip: (query.page - 1) * query.limit,
                take: query.limit,
                select: {
                    id: true,
                    status: true,
                    interviewType: true,
                    difficulty: true,
                    durationMinutes: true,
                    questionCount: true,
                    targetRole: true,
                    targetLevel: true,
                    createdAt: true,
                    updatedAt: true,
                    cv: { select: { id: true, name: true } },
                    jobDescription: {
                        select: { id: true, title: true, company: true },
                    },
                    plans: {
                        where: { status: InterviewPlanStatus.COMPLETED },
                        orderBy: { version: 'desc' },
                        take: 1,
                        select: { summary: true, version: true },
                    },
                },
            }),
            this.prisma.interview.count({ where }),
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
    async create(userId: string, dto: CreateInterviewDto) {
        const src = await this.context.build(userId, dto);
        if (dto.previewToken) {
            const preview = this.verifyPreview(dto.previewToken, userId, dto);
            if (
                preview.source.cvId !== src.cv.id ||
                preview.source.cvVersionId !== src.version.id ||
                preview.source.cvAnalysisId !== src.cvAnalysis.id ||
                preview.source.jobDescriptionId !== src.jd.id ||
                preview.source.jdAnalysisId !== src.jdAnalysis.id ||
                preview.source.cvJdMatchId !== (src.match?.id ?? null)
            )
                throw new ConflictException({
                    code: 'INTERVIEW_PREVIEW_STALE',
                    message:
                        'Dữ liệu CV hoặc JD đã thay đổi. Vui lòng tạo lại bản xem trước.',
                });
            const interview = await this.prisma.$transaction(async (tx) => {
                const created = await tx.interview.create({
                    data: {
                        userId,
                        cvId: src.cv.id,
                        cvVersionId: src.version.id,
                        cvAnalysisId: src.cvAnalysis.id,
                        jobDescriptionId: src.jd.id,
                        jdAnalysisId: src.jdAnalysis.id,
                        cvJdMatchId: src.match?.id,
                        status: dto.saveAsDraft
                            ? InterviewStatus.DRAFT
                            : InterviewStatus.READY,
                        interviewType: dto.interviewType,
                        difficulty: dto.difficulty,
                        durationMinutes: dto.durationMinutes,
                        questionCount: dto.questionCount,
                        focusAreas: dto.focusAreas,
                        targetRole: dto.targetRole.trim(),
                        targetLevel: dto.targetLevel ?? null,
                        sourceContextSnapshot:
                            src.snapshot as Prisma.InputJsonValue,
                    },
                });
                await tx.interviewPlan.create({
                    data: {
                        interviewId: created.id,
                        version: 1,
                        status: InterviewPlanStatus.COMPLETED,
                        summary: preview.planData.summary,
                        planData: preview.planData as Prisma.InputJsonValue,
                        ...preview.metadata,
                        completedAt: new Date(),
                    },
                });
                return created;
            });
            return this.get(userId, interview.id);
        }
        const interview = await this.prisma.interview.create({
            data: {
                userId,
                cvId: src.cv.id,
                cvVersionId: src.version.id,
                cvAnalysisId: src.cvAnalysis.id,
                jobDescriptionId: src.jd.id,
                jdAnalysisId: src.jdAnalysis.id,
                cvJdMatchId: src.match?.id,
                status: InterviewStatus.PLANNING,
                interviewType: dto.interviewType,
                difficulty: dto.difficulty,
                durationMinutes: dto.durationMinutes,
                questionCount: dto.questionCount,
                focusAreas: dto.focusAreas,
                targetRole: dto.targetRole.trim(),
                targetLevel: dto.targetLevel ?? null,
                sourceContextSnapshot: src.snapshot as Prisma.InputJsonValue,
            },
            select: { id: true },
        });
        await this.generatePlan(interview.id, userId);
        return this.get(userId, interview.id);
    }

    private signPreview(payload: InterviewPreviewPayload) {
        const encoded = Buffer.from(JSON.stringify(payload)).toString(
            'base64url',
        );
        const signature = createHmac('sha256', this.previewSecret())
            .update(encoded)
            .digest('base64url');
        return `${encoded}.${signature}`;
    }

    private verifyPreview(
        token: string,
        userId: string,
        dto: CreateInterviewDto,
    ) {
        const [encoded, providedSignature, extra] = token.split('.');
        if (!encoded || !providedSignature || extra)
            throw this.invalidPreview();
        const expectedSignature = createHmac('sha256', this.previewSecret())
            .update(encoded)
            .digest('base64url');
        const provided = Buffer.from(providedSignature);
        const expected = Buffer.from(expectedSignature);
        if (
            provided.length !== expected.length ||
            !timingSafeEqual(provided, expected)
        )
            throw this.invalidPreview();
        let payload: InterviewPreviewPayload;
        try {
            payload = JSON.parse(
                Buffer.from(encoded, 'base64url').toString('utf8'),
            ) as InterviewPreviewPayload;
        } catch {
            throw this.invalidPreview();
        }
        if (
            payload.userId !== userId ||
            payload.expiresAt < Date.now() ||
            JSON.stringify(payload.configuration) !==
                JSON.stringify(previewConfiguration(dto))
        )
            throw this.invalidPreview();
        return payload;
    }

    private previewSecret() {
        return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    }

    private invalidPreview() {
        return new ConflictException({
            code: 'INTERVIEW_PREVIEW_INVALID',
            message:
                'Bản xem trước đã hết hạn hoặc không còn hợp lệ. Vui lòng tạo lại.',
        });
    }
    async get(userId: string, id: string) {
        const item = await this.prisma.interview.findFirst({
            where: { id, userId },
            select: DETAIL,
        });
        if (!item)
            throw new NotFoundException({
                code: 'INTERVIEW_NOT_FOUND',
                message: 'Không tìm thấy buổi phỏng vấn.',
            });
        return item;
    }
    async remove(userId: string, id: string) {
        const deleted = await this.prisma.interview.deleteMany({
            where: { id, userId },
        });
        if (deleted.count === 0)
            throw new NotFoundException({
                code: 'INTERVIEW_NOT_FOUND',
                message:
                    'Kh\u00f4ng t\u00ecm th\u1ea5y bu\u1ed5i ph\u1ecfng v\u1ea5n.',
            });
        return { id };
    }
    async removeMany(userId: string, ids: string[]) {
        const result = await this.prisma.interview.deleteMany({
            where: { id: { in: ids }, userId },
        });
        return { deletedCount: result.count };
    }
    async regenerate(userId: string, id: string) {
        await this.requireOwned(userId, id);
        await this.generatePlan(id, userId);
        return this.get(userId, id);
    }
    async latestPlan(userId: string, id: string) {
        await this.requireOwned(userId, id);
        const plan = await this.prisma.interviewPlan.findFirst({
            where: { interviewId: id, status: InterviewPlanStatus.COMPLETED },
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
        });
        if (!plan)
            throw new NotFoundException({
                code: 'INTERVIEW_PLAN_NOT_FOUND',
                message: 'Chưa có kế hoạch phỏng vấn thành công.',
            });
        return plan;
    }
    async plans(userId: string, id: string, q: ListInterviewPlansQueryDto) {
        await this.requireOwned(userId, id);
        const where = { interviewId: id };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.interviewPlan.findMany({
                where,
                orderBy: [{ version: 'desc' }],
                skip: (q.page - 1) * q.limit,
                take: q.limit,
            }),
            this.prisma.interviewPlan.count({ where }),
        ]);
        return {
            items,
            pagination: {
                page: q.page,
                limit: q.limit,
                total,
                totalPages: Math.ceil(total / q.limit),
            },
        };
    }
    private async requireOwned(userId: string, id: string) {
        const item = await this.prisma.interview.findFirst({
            where: { id, userId },
            select: { id: true },
        });
        if (!item)
            throw new NotFoundException({
                code: 'INTERVIEW_NOT_FOUND',
                message: 'Không tìm thấy buổi phỏng vấn.',
            });
    }
    private async generatePlan(interviewId: string, userId: string) {
        const owned = await this.prisma.interview.findFirst({
            where: { id: interviewId, userId },
            select: {
                sourceContextSnapshot: true,
                plans: {
                    where: { status: InterviewPlanStatus.COMPLETED },
                    orderBy: { version: 'desc' },
                    take: 1,
                    select: { planData: true },
                },
            },
        });
        if (!owned) throw new NotFoundException();
        const active = await this.prisma.interviewPlan.findFirst({
            where: { interviewId, status: InterviewPlanStatus.PROCESSING },
            select: { id: true },
        });
        if (active)
            throw new ConflictException({
                code: 'INTERVIEW_PLAN_PROCESSING',
                message: 'Kế hoạch phỏng vấn đang được tạo.',
            });
        const latest = await this.prisma.interviewPlan.aggregate({
            where: { interviewId },
            _max: { version: true },
        });
        let plan;
        try {
            plan = await this.prisma.interviewPlan.create({
                data: {
                    interviewId,
                    version: (latest._max.version ?? 0) + 1,
                    status: InterviewPlanStatus.PROCESSING,
                },
                select: { id: true },
            });
        } catch (e) {
            if (
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002'
            )
                throw new ConflictException({
                    code: 'INTERVIEW_PLAN_PROCESSING',
                    message: 'Kế hoạch phỏng vấn đang được tạo.',
                });
            throw e;
        }
        try {
            const planningContext = withRegenerationContext(
                owned.sourceContextSnapshot,
                owned.plans[0]?.planData,
            );
            const output = await this.planner.generate(planningContext);
            await this.prisma.$transaction([
                this.prisma.interviewPlan.update({
                    where: { id: plan.id },
                    data: {
                        status: InterviewPlanStatus.COMPLETED,
                        summary: output.result.summary,
                        planData: output.result as Prisma.InputJsonValue,
                        ...output.metadata,
                        completedAt: new Date(),
                    },
                }),
                this.prisma.interview.update({
                    where: { id: interviewId },
                    data: { status: InterviewStatus.READY },
                }),
            ]);
        } catch (e) {
            const ai =
                e instanceof AiException
                    ? e
                    : new AiException('AI_PROVIDER_ERROR', { cause: e });
            await this.prisma.interviewPlan.update({
                where: { id: plan.id },
                data: {
                    status: InterviewPlanStatus.FAILED,
                    errorCode: ai.code,
                    errorMessage: ai.safeMessage,
                    completedAt: new Date(),
                },
            });
            throw this.http(ai);
        }
    }
    private http(e: AiException) {
        const status: Record<AiErrorCode, number> = {
            AI_CONFIGURATION_ERROR: 503,
            AI_PROVIDER_ERROR: 502,
            AI_TIMEOUT: 504,
            AI_RATE_LIMITED: 429,
            AI_EMPTY_RESPONSE: 502,
            AI_INVALID_RESPONSE: 502,
            AI_SCHEMA_VALIDATION_FAILED: 502,
            AI_INVALID_INPUT: 422,
        };
        return new HttpException(
            { code: e.code, message: e.safeMessage },
            status[e.code] ?? HttpStatus.BAD_GATEWAY,
        );
    }
}

function withRegenerationContext(
    snapshot: Prisma.JsonValue,
    previous: Prisma.JsonValue | undefined,
) {
    if (
        typeof snapshot !== 'object' ||
        snapshot === null ||
        Array.isArray(snapshot) ||
        !previous
    )
        return snapshot;
    const questions = extractPreviousQuestions(previous);
    return {
        ...snapshot,
        regeneration: {
            previousPlannedQuestions: questions,
            instruction:
                'Chọn góc hỏi hoặc competency khác khi hợp lý; không chỉ diễn đạt lại toàn bộ câu cũ. Vẫn giữ các câu nền tảng bắt buộc.',
        },
    };
}

function previewConfiguration(dto: CreateInterviewDto) {
    return {
        cvId: dto.cvId,
        jobDescriptionId: dto.jobDescriptionId,
        cvJdMatchId: dto.cvJdMatchId ?? null,
        interviewType: dto.interviewType,
        difficulty: dto.difficulty,
        durationMinutes: dto.durationMinutes,
        questionCount: dto.questionCount,
        focusAreas: dto.focusAreas,
        targetRole: dto.targetRole.trim(),
        targetLevel: dto.targetLevel ?? null,
    };
}
function extractPreviousQuestions(value: Prisma.JsonValue): string[] {
    if (
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value) ||
        !('sections' in value) ||
        !Array.isArray(value.sections)
    )
        return [];
    return value.sections
        .flatMap((section) => {
            if (
                typeof section !== 'object' ||
                section === null ||
                Array.isArray(section) ||
                !('questions' in section) ||
                !Array.isArray(section.questions)
            )
                return [];
            return section.questions.flatMap((question) =>
                typeof question === 'object' &&
                question !== null &&
                !Array.isArray(question) &&
                'suggestedQuestion' in question &&
                typeof question.suggestedQuestion === 'string'
                    ? [question.suggestedQuestion]
                    : [],
            );
        })
        .slice(0, 20);
}
