import {
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import {
    CVAnalysisStatus,
    CVJDMatchStatus,
    CVProcessingStatus,
    JDAnalysisStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
@Injectable()
export class InterviewContextService {
    constructor(private readonly prisma: PrismaService) {}
    async build(userId: string, dto: CreateInterviewDto) {
        const [cv, jd, match, preference] = await Promise.all([
            this.prisma.cV.findFirst({
                where: { id: dto.cvId, userId, deletedAt: null },
                include: {
                    currentVersion: {
                        include: {
                            analyses: {
                                where: { status: CVAnalysisStatus.COMPLETED },
                                orderBy: [
                                    { createdAt: 'desc' },
                                    { id: 'desc' },
                                ],
                                take: 1,
                            },
                        },
                    },
                },
            }),
            this.prisma.jobDescription.findFirst({
                where: { id: dto.jobDescriptionId, userId, deletedAt: null },
                include: {
                    analyses: {
                        where: { status: JDAnalysisStatus.COMPLETED },
                        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                        take: 1,
                    },
                },
            }),
            dto.cvJdMatchId
                ? this.prisma.cVJDMatch.findFirst({
                      where: {
                          id: dto.cvJdMatchId,
                          userId,
                          status: CVJDMatchStatus.COMPLETED,
                      },
                  })
                : Promise.resolve(null),
            this.prisma.userPreference.findUnique({
                where: { userId },
                select: {
                    targetRole: true,
                    experienceLevel: true,
                    yearsOfExperience: true,
                    interviewGoals: true,
                    learningStyle: true,
                    preferredLanguage: true,
                },
            }),
        ]);
        if (!cv || !jd)
            throw new NotFoundException({
                code: 'INTERVIEW_SOURCE_NOT_FOUND',
                message: 'Không tìm thấy CV hoặc mô tả công việc.',
            });
        const version = cv.currentVersion,
            cvAnalysis = version?.analyses[0],
            jdAnalysis = jd.analyses[0];
        if (
            cv.processingStatus !== CVProcessingStatus.READY ||
            !version ||
            !cvAnalysis ||
            !jdAnalysis
        )
            throw new UnprocessableEntityException({
                code: 'INTERVIEW_SOURCE_NOT_READY',
                message:
                    'CV và JD phải được phân tích thành công trước khi tạo phỏng vấn.',
            });
        if (
            dto.cvJdMatchId &&
            (!match || match.cvId !== cv.id || match.jobDescriptionId !== jd.id)
        )
            throw new UnprocessableEntityException({
                code: 'INTERVIEW_MATCH_MISMATCH',
                message: 'Kết quả đối chiếu không thuộc CV và JD đã chọn.',
            });
        const technicalSkillCoverage = buildTechnicalSkillCoverage(
            cvAnalysis.extractedSkills,
            jdAnalysis.requiredSkills,
            jdAnalysis.preferredSkills,
        );
        const snapshot = {
            capturedAt: new Date().toISOString(),
            candidateProfile: {
                source: 'ONBOARDING',
                targetRole: preference?.targetRole ?? null,
                experienceLevel:
                    preference?.experienceLevel ??
                    cvAnalysis.detectedLevel ??
                    null,
                yearsOfExperience:
                    preference?.yearsOfExperience?.toNumber() ?? null,
                interviewGoals: preference?.interviewGoals ?? [],
                learningStyle: preference?.learningStyle ?? null,
                preferredLanguage: preference?.preferredLanguage ?? 'VI',
                levelFallbackUsed: !preference?.experienceLevel,
            },
            technicalSkillCoverage,
            cv: {
                id: cv.id,
                name: cv.name,
                versionId: version.id,
                versionNumber: version.versionNumber,
                analysisId: cvAnalysis.id,
                analysis: {
                    detectedRole: cvAnalysis.detectedRole,
                    detectedLevel: cvAnalysis.detectedLevel,
                    extractedSkills: cvAnalysis.extractedSkills,
                    workExperiences: cvAnalysis.workExperiences,
                    projects: cvAnalysis.projects,
                    strengths: cvAnalysis.strengths,
                    weaknesses: cvAnalysis.weaknesses,
                    interviewRisks: cvAnalysis.interviewRisks,
                },
            },
            jd: {
                id: jd.id,
                title: jd.title,
                company: jd.company,
                updatedAt: jd.updatedAt,
                analysisId: jdAnalysis.id,
                analysis: {
                    detectedRole: jdAnalysis.detectedRole,
                    seniority: jdAnalysis.seniority,
                    summary: jdAnalysis.summary,
                    requiredSkills: jdAnalysis.requiredSkills,
                    preferredSkills: jdAnalysis.preferredSkills,
                    responsibilities: jdAnalysis.responsibilities,
                    requirements: jdAnalysis.requirements,
                    interviewFocus: jdAnalysis.interviewFocus,
                },
            },
            match: match
                ? {
                      id: match.id,
                      matchScore: match.matchScore,
                      matchedSkills: match.matchedSkills,
                      skillGaps: match.skillGaps,
                      strengths: match.strengths,
                      gaps: match.gaps,
                      experienceAlignment: match.experienceAlignment,
                      recommendations: match.recommendations,
                  }
                : null,
            configuration: {
                interviewType: dto.interviewType,
                difficulty: dto.difficulty,
                durationMinutes: dto.durationMinutes,
                questionCount: dto.questionCount,
                focusAreas: dto.focusAreas,
                targetRole: dto.targetRole,
                targetLevel: dto.targetLevel ?? null,
            },
        };
        return { cv, version, cvAnalysis, jd, jdAnalysis, match, snapshot };
    }
}
function buildTechnicalSkillCoverage(
    extractedSkills: unknown,
    requiredSkills: unknown,
    preferredSkills: unknown,
) {
    const cvSkills = extractCvSkillNames(extractedSkills);
    const jdRequiredSkills = extractStrings(requiredSkills);
    const jdPreferredSkills = extractStrings(preferredSkills);
    const cvKeys = new Set(cvSkills.map(normalizeSkillKey));
    const matched = (skills: string[]) =>
        skills.filter((skill) => cvKeys.has(normalizeSkillKey(skill)));
    return {
        cvSkills,
        jdRequiredSkills,
        jdPreferredSkills,
        matchedRequiredSkills: matched(jdRequiredSkills),
        matchedPreferredSkills: matched(jdPreferredSkills),
    };
}
function extractCvSkillNames(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return uniqueStrings(
        value.flatMap((item) => {
            if (typeof item === 'string') return [item];
            if (
                typeof item === 'object' &&
                item !== null &&
                'name' in item &&
                typeof item.name === 'string'
            )
                return [item.name];
            return [];
        }),
    );
}
function extractStrings(value: unknown): string[] {
    return Array.isArray(value)
        ? uniqueStrings(
              value.filter((item): item is string => typeof item === 'string'),
          )
        : [];
}
function uniqueStrings(values: string[]) {
    const seen = new Set<string>();
    return values.filter((value) => {
        const key = normalizeSkillKey(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
function normalizeSkillKey(value: string) {
    const key = value.toLocaleLowerCase('en-US').replace(/[^a-z0-9+#]+/g, '');
    const aliases: Record<string, string> = {
        js: 'javascript',
        javascriptes6: 'javascript',
        'javascriptes6+': 'javascript',
        ecmascript6: 'javascript',
        'ecmascript6+': 'javascript',
        es6: 'javascript',
        ts: 'typescript',
        reactjs: 'react',
        next: 'nextjs',
        vuejs: 'vue',
        angularjs: 'angular',
        nodejs: 'node',
    };
    return aliases[key] ?? key;
}
