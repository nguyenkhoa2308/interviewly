import { AiException } from '../../ai/ai.errors';
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

export const QUESTION_COUNT_BY_DURATION: Record<
    number,
    { min: number; max: number }
> = {
    15: { min: 4, max: 6 },
    30: { min: 7, max: 10 },
    45: { min: 9, max: 13 },
    60: { min: 11, max: 16 },
};

export function assertConfiguredQuestionCount(
    durationMinutes: number,
    questionCount: number,
) {
    const range = QUESTION_COUNT_BY_DURATION[durationMinutes];
    if (!range || questionCount < range.min || questionCount > range.max) {
        throw new AiException('AI_INVALID_INPUT');
    }
}

export function validateInterviewPlanContract(
    plan: InterviewPlanResult,
    configuration: {
        interviewType: string;
        durationMinutes: number;
        questionCount: number;
    },
    options: { hasProjectEvidence: boolean },
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
    if (questions.length !== configuration.questionCount)
        invalid(
            `QUESTION_COUNT:${questions.length}/${configuration.questionCount}`,
        );
    const totalDuration = plan.sections.reduce(
        (total, section) => total + section.durationMinutes,
        0,
    );
    if (totalDuration !== configuration.durationMinutes)
        invalid(
            `DURATION_TOTAL:${totalDuration}/${configuration.durationMinutes}`,
        );
    if (plan.sections[0].questions.length > 2) invalid('INTRODUCTION_TOO_LONG');

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

    const orders = questions.map((question) => question.order);
    if (
        orders.some((order, index) => order !== index + 1) ||
        new Set(orders).size !== orders.length
    )
        invalid('INVALID_QUESTION_ORDER');

    return plan;
}

function invalid(reason: string): never {
    throw new AiException('AI_SCHEMA_VALIDATION_FAILED', {
        cause: new Error(reason),
    });
}
