import { AiException } from '../../ai/ai.errors';
import { findQuestionStyleIssues } from '../question-style.validator';
import type {
    InterviewPlanResult,
    InterviewSectionType,
} from './interview-plan.schema';

const TEMPLATES: Record<string, InterviewSectionType[]> = {
    TECHNICAL: [
        'INTRODUCTION',
        'TECHNICAL',
        'PROJECT_EXPERIENCE',
        'BEHAVIORAL_WORKING_STYLE',
        'CANDIDATE_QUESTIONS',
    ],
    FULL: [
        'INTRODUCTION',
        'TECHNICAL',
        'PROJECT_EXPERIENCE',
        'BEHAVIORAL_WORKING_STYLE',
        'CANDIDATE_QUESTIONS',
    ],
    HR: [
        'INTRODUCTION',
        'PROJECT_EXPERIENCE',
        'BEHAVIORAL_WORKING_STYLE',
        'CANDIDATE_QUESTIONS',
    ],
    BEHAVIORAL: [
        'INTRODUCTION',
        'PROJECT_EXPERIENCE',
        'BEHAVIORAL_WORKING_STYLE',
        'CANDIDATE_QUESTIONS',
    ],
};

export function assertConfiguredQuestionCount(questionCount: number) {
    if (
        !Number.isInteger(questionCount) ||
        questionCount < 3 ||
        questionCount > 30
    ) {
        throw new AiException('AI_INVALID_INPUT');
    }
}

export function getQuestionPoolRange(configuration: {
    durationMinutes: number;
    questionCount: number;
}) {
    const expandedPool = configuration.durationMinutes >= 45;
    const minimum = expandedPool
        ? configuration.questionCount +
          Math.max(4, Math.ceil(configuration.questionCount * 0.25))
        : Math.ceil(configuration.questionCount * 0.6);
    const maximum = Math.min(
        30,
        configuration.questionCount +
            Math.max(8, Math.ceil(configuration.questionCount * 0.7)),
    );
    return { minimum, maximum: Math.max(minimum, maximum) };
}

export function validateInterviewPlanContract(
    plan: InterviewPlanResult,
    configuration: {
        interviewType: string;
        durationMinutes: number;
        questionCount: number;
        experienceLevel?: string | null;
    },
    options: {
        hasProjectEvidence: boolean;
        hasCvEvidence?: boolean;
        requiredTechnicalSkills?: string[];
    },
): InterviewPlanResult {
    const expected = TEMPLATES[configuration.interviewType];
    const actual = plan.sections.map((section) => section.type);
    if (
        !expected ||
        actual.length !== expected.length ||
        actual.some((type, index) => type !== expected[index])
    ) {
        invalid('SECTION_ORDER');
    }

    const questions = plan.sections.flatMap((section) => section.questions);
    const poolRange = getQuestionPoolRange(configuration);
    const minimumPoolSize = Math.max(
        expected.length,
        configuration.durationMinutes >= 45
            ? configuration.questionCount
            : poolRange.minimum,
    );
    const maximumPoolSize = poolRange.maximum;
    if (
        questions.length < minimumPoolSize ||
        questions.length > maximumPoolSize
    )
        invalid(
            `QUESTION_POOL_SIZE:${questions.length}/${minimumPoolSize}-${maximumPoolSize}:TARGET_${configuration.questionCount}`,
        );
    validateCompetencyCoverage(plan, questions, options);

    const totalDuration = plan.sections.reduce(
        (total, section) => total + section.durationMinutes,
        0,
    );
    if (totalDuration !== configuration.durationMinutes)
        invalid(
            `DURATION_TOTAL:${totalDuration}/${configuration.durationMinutes}`,
        );
    if (plan.sections[0].questions.length > 2) invalid('INTRODUCTION_TOO_LONG');

    const technicalSection = plan.sections.find(
        (section) => section.type === 'TECHNICAL',
    );
    const minimumTechnicalQuestions =
        configuration.durationMinutes >= 60
            ? 8
            : configuration.durationMinutes >= 45
              ? 6
              : 0;
    if (
        technicalSection &&
        technicalSection.questions.length < minimumTechnicalQuestions
    ) {
        invalid(
            `INSUFFICIENT_TECHNICAL_POOL:${technicalSection.questions.length}/${minimumTechnicalQuestions}`,
        );
    }

    const closing = plan.sections.at(-1);
    if (
        closing?.type !== 'CANDIDATE_QUESTIONS' ||
        closing.questions.length !== 1 ||
        closing.questions[0].type !== 'CANDIDATE' ||
        closing.questions[0].difficulty !== null
    )
        invalid('INVALID_CANDIDATE_QUESTIONS');

    if (options.hasProjectEvidence) {
        const project = plan.sections.find(
            (section) => section.type === 'PROJECT_EXPERIENCE',
        );
        if (
            !project ||
            !project.questions.some((question) => question.type === 'PROJECT')
        )
            invalid('MISSING_PROJECT_QUESTION');
    }

    for (const question of questions) {
        const styleIssues = findQuestionStyleIssues({
            questionText: question.suggestedQuestion,
            primaryIntent:
                question.type === 'CANDIDATE'
                    ? 'Mời ứng viên đặt câu hỏi'
                    : question.primaryIntent,
            level: configuration.experienceLevel,
            questionType: question.type,
        });
        if (styleIssues.length > 0) {
            invalid(
                `QUESTION_STYLE:${question.order}:${styleIssues.join('+')}`,
            );
        }
    }
    const orders = questions.map((question) => question.order);
    if (
        orders.some((order, index) => order !== index + 1) ||
        new Set(orders).size !== orders.length
    )
        invalid('INVALID_QUESTION_ORDER');

    return plan;
}

function validateCompetencyCoverage(
    plan: InterviewPlanResult,
    questions: InterviewPlanResult['sections'][number]['questions'],
    options: {
        hasProjectEvidence: boolean;
        hasCvEvidence?: boolean;
        requiredTechnicalSkills?: string[];
    },
) {
    const baseline = plan.roleBaseline;
    const map = plan.competencyMap;
    if (!baseline || !map) invalid('MISSING_COMPETENCY_STRATEGY');

    const baselineKeys = new Set(baseline.map((item) => item.key));
    const mapKeys = new Set(map.map((item) => item.key));
    if (baselineKeys.size !== baseline.length || mapKeys.size !== map.length) {
        invalid('DUPLICATE_COMPETENCY_KEY');
    }
    for (const key of baselineKeys) {
        const competency = map.find((item) => item.key === key);
        if (!competency?.sources.includes('ROLE_BASELINE')) {
            invalid(`MISSING_ROLE_BASELINE:${key}`);
        }
    }
    if (!map.some((item) => item.sources.includes('JD'))) {
        invalid('MISSING_JD_COMPETENCY');
    }
    if (
        options.hasCvEvidence &&
        !map.some((item) => item.sources.includes('CV'))
    ) {
        invalid('MISSING_CV_PERSONALIZATION');
    }

    const assessmentQuestions = plan.sections
        .filter(
            (section) =>
                section.type !== 'INTRODUCTION' &&
                section.type !== 'CANDIDATE_QUESTIONS',
        )
        .flatMap((section) => section.questions);
    for (const question of assessmentQuestions) {
        if (!question.competencyKey || !mapKeys.has(question.competencyKey)) {
            invalid(`QUESTION_COMPETENCY:${question.order}`);
        }
    }
    for (const competency of map.filter((item) => item.priority === 'KEY')) {
        if (
            !assessmentQuestions.some(
                (question) => question.competencyKey === competency.key,
            )
        ) {
            invalid(`MISSING_KEY_COVERAGE:${competency.key}`);
        }
    }

    const technicalSection = plan.sections.find(
        (section) => section.type === 'TECHNICAL',
    );
    if (technicalSection && technicalSection.questions.length >= 3) {
        validateMatchedSkillCoverage(
            technicalSection.questions,
            options.requiredTechnicalSkills ?? [],
        );
        const technicalKeys = technicalSection.questions
            .map((question) => question.competencyKey)
            .filter((key): key is string => Boolean(key));
        const uniqueTechnicalKeys = new Set(technicalKeys);
        if (uniqueTechnicalKeys.size < 2) {
            invalid('INSUFFICIENT_TECHNICAL_BREADTH');
        }
        const maximumPerCompetency = Math.ceil(
            technicalSection.questions.length * 0.6,
        );
        for (const key of uniqueTechnicalKeys) {
            if (
                technicalKeys.filter((candidateKey) => candidateKey === key)
                    .length > maximumPerCompetency
            ) {
                invalid(`TECHNICAL_COMPETENCY_CONCENTRATION:${key}`);
            }
        }
    }
    const uniqueCovered = new Set(
        assessmentQuestions.map((question) => question.competencyKey),
    ).size;
    if (uniqueCovered < Math.min(3, map.length)) {
        invalid('INSUFFICIENT_BREADTH');
    }
    const concentrationLimit = Math.max(
        2,
        Math.ceil(assessmentQuestions.length * 0.6),
    );
    for (const competency of map) {
        const count = assessmentQuestions.filter(
            (question) => question.competencyKey === competency.key,
        ).length;
        if (count > concentrationLimit) {
            invalid(`EXCESSIVE_CONCENTRATION:${competency.key}`);
        }
    }

    const intents = new Set<string>();
    for (const question of assessmentQuestions) {
        const normalized = question.primaryIntent
            ?.toLocaleLowerCase('en-US')
            .replace(/\s+/g, ' ')
            .trim();
        if (!normalized) invalid(`MISSING_PRIMARY_INTENT:${question.order}`);
        const key = `${question.competencyKey}:${normalized}`;
        if (intents.has(key)) invalid(`DUPLICATE_COVERAGE:${question.order}`);
        intents.add(key);
    }
}
function validateMatchedSkillCoverage(
    questions: InterviewPlanResult['sections'][number]['questions'],
    matchedSkills: string[],
) {
    const uniqueSkills = uniqueSkillLabels(matchedSkills);
    const requiredSkills = uniqueSkills.slice(0, Math.min(6, questions.length));
    const questionEvidence = questions.map((question) =>
        normalizeSkillEvidence(
            [
                question.topic,
                question.primaryIntent,
                question.suggestedQuestion,
                question.objective,
                ...(question.probeAreas ?? []),
                ...(question.evidenceObjectives ?? []),
            ]
                .filter(Boolean)
                .join(' '),
        ),
    );
    const coreSkillCount = Math.min(
        4,
        requiredSkills.length,
        Math.max(0, questions.length - requiredSkills.length),
    );
    const coverageIssues: string[] = [];
    for (const [index, skill] of requiredSkills.entries()) {
        const key = normalizeSkillEvidence(skill);
        const coverageCount = questionEvidence.filter((evidence) =>
            evidence.includes(key),
        ).length;
        if (coverageCount === 0) {
            coverageIssues.push(`MISSING:${skill}`);
            continue;
        }
        if (index < coreSkillCount && coverageCount < 2) {
            coverageIssues.push(`DEPTH:${skill}:${coverageCount}/2`);
        }
    }
    if (coverageIssues.length > 0) {
        invalid(`MATCHED_SKILL_COVERAGE:${coverageIssues.join('|')}`);
    }
}

function uniqueSkillLabels(skills: string[]) {
    const seen = new Set<string>();
    return skills.filter((skill) => {
        const key = normalizeSkillEvidence(skill);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function normalizeSkillEvidence(value: string) {
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
function invalid(reason: string): never {
    throw new AiException('AI_SCHEMA_VALIDATION_FAILED', {
        cause: new Error(reason),
    });
}
