export type InterviewExperienceLevel =
    'INTERN' | 'FRESHER' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD';

export type QuestionStyleInput = {
    questionText: string;
    primaryIntent?: string | null;
    level?: string | null;
    questionType?: string | null;
};

const SHORT_QUESTION_LEVELS = new Set(['INTERN', 'FRESHER', 'JUNIOR']);
const FORMAL_OPENINGS = [
    'trong quá trình làm việc',
    'bạn hãy chia sẻ cách',
    'theo kinh nghiệm của bạn',
    'dựa trên câu trả lời vừa rồi',
    'bạn vừa đề cập rằng',
];
const SOURCE_LEAKAGE = [
    'cv của bạn cho thấy',
    'jd yêu cầu',
    'mô tả công việc yêu cầu',
    'kết quả đối chiếu cho thấy',
];
const SECOND_INTENT_PATTERNS = [
    /\bvà\s+(?:khi nào|tại sao|vì sao|lý do|bạn sẽ|bạn có thể|hãy|cách nào|làm thế nào)\b/iu,
    /\b(?:đồng thời|bên cạnh đó|ngoài ra)\b/iu,
    /\?\s*\S/iu,
];

export type QuestionStyleIssue =
    | 'MISSING_PRIMARY_INTENT'
    | 'MULTIPLE_QUESTION_MARKS'
    | 'COMPOUND_QUESTION'
    | 'OVERLY_VERBOSE_FOR_LEVEL'
    | 'FORMAL_WRITTEN_STYLE'
    | 'SOURCE_CONTEXT_LEAKED';

/**
 * Deterministic last-line guardrail for generated spoken questions.
 * It deliberately combines structural signals instead of treating every
 * occurrence of "và" as a compound question (for example "var, let và const"
 * is a perfectly valid single-intent comparison).
 */
export function findQuestionStyleIssues({
    questionText,
    primaryIntent,
    level,
    questionType,
}: QuestionStyleInput): QuestionStyleIssue[] {
    const normalized = questionText.trim().replace(/\s+/gu, ' ');
    const lower = normalized.toLocaleLowerCase('vi');
    const words = normalized.split(/\s+/u).filter(Boolean);
    const questionMarks = (normalized.match(/\?/gu) ?? []).length;
    const isShortLevel = SHORT_QUESTION_LEVELS.has(level ?? '');
    const isContextual = ['PROJECT', 'BEHAVIORAL'].includes(questionType ?? '');
    const issues: QuestionStyleIssue[] = [];

    if (!primaryIntent?.trim()) issues.push('MISSING_PRIMARY_INTENT');
    if (questionMarks > 1) issues.push('MULTIPLE_QUESTION_MARKS');
    if (SECOND_INTENT_PATTERNS.some((pattern) => pattern.test(normalized))) {
        issues.push('COMPOUND_QUESTION');
    }

    // Fundamentals for early-career candidates should normally fit in one
    // short spoken sentence. Contextual project/behavioral prompts get room.
    if (
        isShortLevel &&
        !isContextual &&
        (words.length > 30 || normalized.length > 190)
    ) {
        issues.push('OVERLY_VERBOSE_FOR_LEVEL');
    }

    if (
        isShortLevel &&
        !isContextual &&
        FORMAL_OPENINGS.some((opening) => lower.startsWith(opening)) &&
        words.length > 18
    ) {
        issues.push('FORMAL_WRITTEN_STYLE');
    }

    if (
        !isContextual &&
        SOURCE_LEAKAGE.some((phrase) => lower.includes(phrase))
    ) {
        issues.push('SOURCE_CONTEXT_LEAKED');
    }

    return [...new Set(issues)];
}
