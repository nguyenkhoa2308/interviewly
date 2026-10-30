import { Inject, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AiException } from '../../ai/ai.errors';
import type { AiProvider } from '../../ai/ai-provider.types';
import { AI_PROVIDER } from '../../ai/ai.tokens';
import {
    findQuestionStyleIssues,
    simplifyCompoundQuestion,
} from '../question-style.validator';
import {
    assertConfiguredQuestionCount,
    getQuestionPoolRange,
    validateInterviewPlanContract,
} from './interview-plan.contract';
import {
    buildInterviewPlanPrompt,
    INTERVIEW_PLAN_MAX_INPUT_CHARS,
    INTERVIEW_PLAN_PROMPT_VERSION,
    INTERVIEW_PLAN_SYSTEM_INSTRUCTION,
} from './interview-plan.prompt';
import {
    GeneratedInterviewPlanResultSchema,
    INTERVIEW_PLAN_JSON_SCHEMA,
    InterviewPlanResultSchema,
    type InterviewPlanResult,
} from './interview-plan.schema';

import { getRequiredRoleBaselines } from './role-baseline.catalog';

const contextContract = z
    .object({
        configuration: z
            .object({
                interviewType: z.string(),
                durationMinutes: z.number().int(),
                questionCount: z.number().int(),
                targetLevel: z.string().optional(),
                targetRole: z.string().optional(),
            })
            .passthrough(),
        cv: z
            .object({
                analysis: z
                    .object({
                        projects: z.unknown().optional(),
                        workExperiences: z.unknown().optional(),
                    })
                    .passthrough(),
            })
            .passthrough(),
        technicalSkillCoverage: z
            .object({
                matchedRequiredSkills: z.array(z.string()),
                matchedPreferredSkills: z.array(z.string()),
            })
            .passthrough()
            .optional(),
        regeneration: z
            .object({
                previousPrimaryIntents: z.array(z.string()).optional(),
                minimumNewPrimaryIntentRatio: z
                    .number()
                    .min(0)
                    .max(1)
                    .optional(),
            })
            .passthrough()
            .optional(),
    })
    .passthrough();

@Injectable()
export class InterviewPlannerService {
    private readonly logger = new Logger(InterviewPlannerService.name);

    constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

    async generate(context: unknown) {
        const trusted = contextContract.safeParse(context);
        if (!trusted.success) throw new AiException('AI_INVALID_INPUT');

        const { configuration } = trusted.data;
        assertConfiguredQuestionCount(configuration.questionCount);

        const requiredRoleBaselines = getRequiredRoleBaselines(
            configuration.targetRole,
            configuration.interviewType,
        );
        const prompt = buildInterviewPlanPrompt({
            ...(context as Record<string, unknown>),
            requiredRoleBaselines,
        });
        if (prompt.length > INTERVIEW_PLAN_MAX_INPUT_CHARS)
            throw new AiException('AI_INVALID_INPUT');

        const hasProjectEvidence =
            hasItems(trusted.data.cv.analysis.projects) ||
            hasItems(trusted.data.cv.analysis.workExperiences);
        let correction = '';
        const accumulatedDiagnostics: string[] = [];
        let latestDraft: unknown = null;
        let bestValid: {
            result: ReturnType<typeof validateInterviewPlanContract>;
            modelName: string;
        } | null = null;
        const desiredPool = getQuestionPoolRange(configuration);

        const maximumAttempts = 3;
        for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
            let response: Awaited<ReturnType<AiProvider['generateStructured']>>;
            try {
                response = await this.provider.generateStructured({
                    systemInstruction: INTERVIEW_PLAN_SYSTEM_INSTRUCTION,
                    prompt: prompt + correction,
                    responseJsonSchema: INTERVIEW_PLAN_JSON_SCHEMA,
                    temperature: trusted.data.regeneration ? 0.35 : undefined,
                    maxOutputTokens: 16_384,
                });
            } catch (error) {
                if (
                    error instanceof AiException &&
                    isTransientProviderError(error) &&
                    attempt < maximumAttempts
                ) {
                    this.logger.debug(
                        `Transient AI provider failure (attempt ${attempt}/${maximumAttempts}): ${error.code}`,
                    );
                    continue;
                }
                if (bestValid) return toPlannerOutput(this.provider, bestValid);
                throw error;
            }
            latestDraft = response.data;
            const baseParsed = InterviewPlanResultSchema.safeParse(
                response.data,
            );
            const repairedDraft = baseParsed.success
                ? repairPlanRelations(baseParsed.data)
                : response.data;
            latestDraft = repairedDraft;
            const parsed =
                GeneratedInterviewPlanResultSchema.safeParse(repairedDraft);

            if (!parsed.success) {
                const diagnostic = parsed.error.issues
                    .slice(0, 8)
                    .map(
                        (issue) =>
                            `${issue.path.join('.') || 'root'}:${issue.code}`,
                    )
                    .join(', ');
                logValidationDiagnostic(
                    this.logger,
                    attempt,
                    maximumAttempts,
                    `Interview plan schema validation failed (attempt ${attempt}/${maximumAttempts}): ${diagnostic}`,
                );
                if (attempt === maximumAttempts) {
                    if (bestValid)
                        return toPlannerOutput(this.provider, bestValid);
                    throw new AiException('AI_SCHEMA_VALIDATION_FAILED', {
                        cause: parsed.error,
                    });
                }
                addDiagnostic(accumulatedDiagnostics, diagnostic);
                correction = buildCorrection(
                    configuration,
                    accumulatedDiagnostics,
                    latestDraft,
                );
                continue;
            }

            try {
                const candidate =
                    attempt === maximumAttempts
                        ? repairRepeatedCompoundQuestions(parsed.data)
                        : parsed.data;
                const result = validateInterviewPlanContract(
                    candidate,
                    {
                        ...configuration,
                        experienceLevel: getExperienceLevel(trusted.data),
                    },
                    {
                        hasProjectEvidence,
                        hasCvEvidence: hasAnalysisEvidence(
                            trusted.data.cv.analysis,
                        ),
                        requiredRoleBaselines,
                        requiredTechnicalSkills: [
                            ...(trusted.data.technicalSkillCoverage
                                ?.matchedRequiredSkills ?? []),
                            ...(trusted.data.technicalSkillCoverage
                                ?.matchedPreferredSkills ?? []),
                        ],
                    },
                );
                validateRegenerationDiversity(
                    result,
                    trusted.data.regeneration?.previousPrimaryIntents,
                    trusted.data.regeneration?.minimumNewPrimaryIntentRatio,
                );
                const generatedQuestionCount = result.sections.reduce(
                    (total, section) => total + section.questions.length,
                    0,
                );
                if (
                    generatedQuestionCount < desiredPool.minimum &&
                    attempt < maximumAttempts
                ) {
                    if (
                        !bestValid ||
                        generatedQuestionCount >
                            countPlanQuestions(bestValid.result)
                    ) {
                        bestValid = { result, modelName: response.modelName };
                    }
                    this.logger.debug(
                        `Valid interview pool is shorter than desired (attempt ${attempt}/${maximumAttempts}): ${generatedQuestionCount}/${desiredPool.minimum}`,
                    );
                    correction = buildExpansionCorrection(
                        configuration,
                        result,
                    );
                    continue;
                }
                return {
                    result,
                    metadata: {
                        modelProvider: this.provider.providerName,
                        modelName: response.modelName,
                        promptVersion: INTERVIEW_PLAN_PROMPT_VERSION,
                    },
                };
            } catch (error) {
                if (!(error instanceof AiException)) throw error;
                const diagnostic =
                    error.cause instanceof Error
                        ? error.cause.message
                        : 'CONTRACT_MISMATCH';
                logValidationDiagnostic(
                    this.logger,
                    attempt,
                    maximumAttempts,
                    `Interview plan contract validation failed (attempt ${attempt}/${maximumAttempts}): ${diagnostic}`,
                );
                if (attempt === maximumAttempts) {
                    if (bestValid)
                        return toPlannerOutput(this.provider, bestValid);
                    throw error;
                }
                addDiagnostic(accumulatedDiagnostics, diagnostic);
                correction = buildCorrection(
                    configuration,
                    accumulatedDiagnostics,
                    latestDraft,
                );
            }
        }

        if (bestValid) return toPlannerOutput(this.provider, bestValid);
        throw new AiException('AI_SCHEMA_VALIDATION_FAILED');
    }
}

function repairRepeatedCompoundQuestions(
    plan: InterviewPlanResult,
): InterviewPlanResult {
    const repaired = structuredClone(plan);
    for (const section of repaired.sections) {
        for (const question of section.questions) {
            const issues = findQuestionStyleIssues({
                questionText: question.suggestedQuestion,
                primaryIntent: question.primaryIntent,
                questionType: question.type,
            });
            if (issues.includes('COMPOUND_QUESTION')) {
                question.suggestedQuestion = simplifyCompoundQuestion(
                    question.suggestedQuestion,
                );
            }
        }
    }
    return repaired;
}
function repairPlanRelations(plan: InterviewPlanResult): InterviewPlanResult {
    if (!plan.roleBaseline || !plan.competencyMap) return plan;

    const repaired = structuredClone(plan);
    const baseline = repaired.roleBaseline!;
    const competencyMap = repaired.competencyMap!;

    for (const item of baseline) {
        const normalizedKey = normalizeCompetencyKey(item.key);
        const competency = competencyMap.find(
            (candidate) =>
                normalizeCompetencyKey(candidate.key) === normalizedKey,
        );
        if (competency) {
            item.key = competency.key;
            if (!competency.sources.includes('ROLE_BASELINE')) {
                competency.sources = ['ROLE_BASELINE', ...competency.sources];
            }
            continue;
        }

        competencyMap.push({
            key: item.key,
            name: item.name,
            sources: ['ROLE_BASELINE'],
            priority: 'MEDIUM',
            expectedDepth: item.expectedDepth,
            evidenceNeeded: [item.description],
            probeAreas: [],
            rationale: item.rationale,
        });
    }

    const closing = repaired.sections.at(-1);
    if (closing?.type === 'CANDIDATE_QUESTIONS') {
        const candidateQuestion = closing.questions[0];
        candidateQuestion.type = 'CANDIDATE';
        candidateQuestion.difficulty = null;
        candidateQuestion.competencyKey = undefined;
        closing.questions = [candidateQuestion];
    }
    const assignmentCounts = new Map<string, number>();
    for (const section of repaired.sections) {
        for (const question of section.questions) {
            if (question.type === 'CANDIDATE' || question.type === 'GENERAL') {
                continue;
            }
            const currentKey = question.competencyKey
                ? normalizeCompetencyKey(question.competencyKey)
                : '';
            const existing = competencyMap.find(
                (competency) =>
                    normalizeCompetencyKey(competency.key) === currentKey,
            );
            if (existing) {
                question.competencyKey = existing.key;
                assignmentCounts.set(
                    existing.key,
                    (assignmentCounts.get(existing.key) ?? 0) + 1,
                );
                continue;
            }

            const selected = selectQuestionCompetency(
                question,
                competencyMap,
                assignmentCounts,
            );
            if (selected) {
                question.competencyKey = selected.key;
                assignmentCounts.set(
                    selected.key,
                    (assignmentCounts.get(selected.key) ?? 0) + 1,
                );
            }
        }
    }

    let order = 1;
    for (const section of repaired.sections) {
        for (const question of section.questions) {
            question.order = order;
            order += 1;
        }
    }

    return repaired;
}

function selectQuestionCompetency(
    question: InterviewPlanResult['sections'][number]['questions'][number],
    competencies: NonNullable<InterviewPlanResult['competencyMap']>,
    assignmentCounts: Map<string, number>,
) {
    const questionTokens = tokenizeCompetencyText(
        [
            question.topic,
            question.primaryIntent,
            question.suggestedQuestion,
            question.objective,
            ...(question.probeAreas ?? []),
        ]
            .filter(Boolean)
            .join(' '),
    );
    return [...competencies].sort((left, right) => {
        const scoreDifference =
            scoreCompetency(right, questionTokens, question.type) -
            scoreCompetency(left, questionTokens, question.type);
        if (scoreDifference !== 0) return scoreDifference;
        return (
            (assignmentCounts.get(left.key) ?? 0) -
            (assignmentCounts.get(right.key) ?? 0)
        );
    })[0];
}

function scoreCompetency(
    competency: NonNullable<InterviewPlanResult['competencyMap']>[number],
    questionTokens: Set<string>,
    questionType: string,
) {
    const competencyTokens = tokenizeCompetencyText(
        [
            competency.key,
            competency.name,
            ...competency.probeAreas,
            ...competency.evidenceNeeded,
        ].join(' '),
    );
    let score = [...competencyTokens].filter((token) =>
        questionTokens.has(token),
    ).length;
    if (questionType === 'PROJECT' && competency.sources.includes('CV')) {
        score += 2;
    }
    return score;
}

function tokenizeCompetencyText(value: string) {
    return new Set(
        value
            .normalize('NFKD')
            .toLocaleLowerCase('vi')
            .replace(/[^\p{L}\p{N}+#]+/gu, ' ')
            .split(/\s+/)
            .filter((token) => token.length >= 3),
    );
}

function normalizeCompetencyKey(value: string) {
    return value.toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '');
}
function addDiagnostic(diagnostics: string[], diagnostic: string) {
    if (!diagnostics.includes(diagnostic)) diagnostics.push(diagnostic);
}

function isTransientProviderError(error: AiException) {
    return new Set([
        'AI_PROVIDER_ERROR',
        'AI_RATE_LIMITED',
        'AI_TIMEOUT',
        'AI_EMPTY_RESPONSE',
        'AI_INVALID_RESPONSE',
    ]).has(error.code);
}
function countPlanQuestions(
    plan: ReturnType<typeof validateInterviewPlanContract>,
) {
    return plan.sections.reduce(
        (total, section) => total + section.questions.length,
        0,
    );
}

function toPlannerOutput(
    provider: AiProvider,
    value: {
        result: ReturnType<typeof validateInterviewPlanContract>;
        modelName: string;
    },
) {
    return {
        result: value.result,
        metadata: {
            modelProvider: provider.providerName,
            modelName: value.modelName,
            promptVersion: INTERVIEW_PLAN_PROMPT_VERSION,
        },
    };
}

function logValidationDiagnostic(
    logger: Logger,
    attempt: number,
    maximumAttempts: number,
    message: string,
) {
    if (attempt === maximumAttempts) logger.warn(message);
    else logger.debug(message);
}

function buildExpansionCorrection(
    configuration: { durationMinutes: number; questionCount: number },
    plan: ReturnType<typeof validateInterviewPlanContract>,
) {
    const poolRange = getQuestionPoolRange(configuration);
    return `\n\nEXPAND THIS VALID INTERVIEW PLAN INSTEAD OF STARTING OVER:
- Preserve all valid sections, durations, roleBaseline, competencyMap and existing questions.
- Expand the pool from ${countPlanQuestions(plan)} to ${poolRange.minimum}-${poolRange.maximum} distinct coverage options. Never return fewer than ${poolRange.minimum} unless the schema maximum makes that impossible.
- Include at least one focused TECHNICAL question for every prioritized matched skill. Runtime follow-ups provide adaptive depth.
- Do not use paraphrases to fake depth and do not merge independent skills into one compound question.
- Keep global question order continuous from 1.
- Return the complete expanded JSON object only.
<valid_plan_to_expand>
${JSON.stringify(plan)}
</valid_plan_to_expand>`;
}
function buildCorrection(
    configuration: { durationMinutes: number; questionCount: number },
    diagnostics: string[],
    latestDraft: unknown,
) {
    const diagnostic = diagnostics.join(' | ');
    const poolRange = getQuestionPoolRange(configuration);
    return `\n\nREGENERATE THE PREVIOUS PLAN:\n- Validation error: ${diagnostic}.\n- Repair the supplied latest draft. Preserve every field and coverage item that already satisfies the contract; do not regress an earlier fix.
- Resolve ALL accumulated validation errors in this retry, not only the last item.\n- ${configuration.questionCount} is the runtime target, not the generated pool size. Target ${poolRange.minimum} to ${poolRange.maximum} coverage options, but never return fewer than ${configuration.questionCount}; use continuous order values starting at 1.\n- For a 60-minute TECHNICAL/FULL interview, create 8-12 TECHNICAL, 4-6 PROJECT, 3-4 BEHAVIORAL, one INTRODUCTION and one CANDIDATE option.\n- Section durationMinutes must total exactly ${configuration.durationMinutes}.\n- roleBaseline and competencyMap are mandatory. TECHNICAL, PROJECT and BEHAVIORAL questions must have a valid competencyKey and primaryIntent. GENERAL introduction and CANDIDATE closing questions do not require competencyKey.\n- Every roleBaseline key must appear unchanged in competencyMap and that competency must include ROLE_BASELINE in sources.\n- Include every required field. Use null for nullable fields instead of omitting them.\n- Each question must ask one main idea. Keep INTERN/FRESHER/JUNIOR wording natural and concise.\n- For QUESTION_STYLE errors, simplify the exact invalid question instead of merely replacing words.\n- For REGENERATION_TOO_SIMILAR, replace at least 50% of assessment primaryIntent values with genuinely different evidence goals. Rotate secondary competencies, probe areas and project angles; synonyms do not count as new intent.\n- For MISSING_REQUIRED_ROLE_BASELINE, add the named mandatory role competency to roleBaseline and competencyMap with priority KEY and source ROLE_BASELINE. For MISSING_REQUIRED_ROLE_COVERAGE, add a focused TECHNICAL question that actually assesses that competency; an umbrella label or a question about another related technology does not count.\n- For MATCHED_SKILL_COVERAGE, add one focused TECHNICAL coverage question for every MISSING skill reported in the diagnostic. Do not merge independent skills into one compound question; runtime follow-ups provide adaptive depth.\n- For INSUFFICIENT_TECHNICAL_POOL, expand the TECHNICAL coverage pool; do not merge independent skills into compound questions.\n<latest_draft_to_repair>\n${JSON.stringify(latestDraft)}\n</latest_draft_to_repair>\n`;
}
function validateRegenerationDiversity(
    plan: ReturnType<typeof validateInterviewPlanContract>,
    previousIntents?: string[],
    minimumNewRatio = 0.5,
) {
    if (!previousIntents?.length) return;
    const previous = new Set(previousIntents.map(normalizeIntent));
    const current = plan.sections
        .filter(
            (section) =>
                section.type !== 'INTRODUCTION' &&
                section.type !== 'CANDIDATE_QUESTIONS',
        )
        .flatMap((section) => section.questions)
        .flatMap((question) =>
            question.primaryIntent
                ? [normalizeIntent(question.primaryIntent)]
                : [],
        );
    if (!current.length) return;
    const newCount = current.filter((intent) => !previous.has(intent)).length;
    const required = Math.ceil(current.length * minimumNewRatio);
    if (newCount < required) {
        throw new AiException('AI_SCHEMA_VALIDATION_FAILED', {
            cause: new Error(
                `REGENERATION_TOO_SIMILAR:${newCount}/${required}`,
            ),
        });
    }
}
function normalizeIntent(value: string) {
    return value
        .normalize('NFKC')
        .toLocaleLowerCase('vi')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}
function getExperienceLevel(context: Record<string, unknown>): string | null {
    const candidateProfile = context.candidateProfile;
    if (
        typeof candidateProfile === 'object' &&
        candidateProfile !== null &&
        'experienceLevel' in candidateProfile
    ) {
        return String(
            (candidateProfile as { experienceLevel: unknown }).experienceLevel,
        );
    }
    const configuration = context.configuration;
    if (
        typeof configuration === 'object' &&
        configuration !== null &&
        'targetLevel' in configuration
    ) {
        return String((configuration as { targetLevel: unknown }).targetLevel);
    }
    return null;
}
function hasAnalysisEvidence(value: Record<string, unknown>): boolean {
    return Object.values(value).some((item) => hasItems(item));
}
function hasItems(value: unknown): boolean {
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
}
