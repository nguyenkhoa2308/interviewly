import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    InterviewEvaluationReport,
    InterviewEvaluationResponse,
} from '@/types/interview';
import { InterviewEvaluationReportPage } from './interview-evaluation-report-page';

const createMutate = vi.fn();
const retryMutate = vi.fn();
const reanalyzeMutate = vi.fn();
const refetch = vi.fn();
let response: InterviewEvaluationResponse;
let queryError = false;

vi.mock('@/hooks/auth/use-me', () => ({
    useMe: () => ({
        data: {
            id: 'user-1',
            fullName: 'Nguyễn Đức Khoa',
            avatarUrl: '/avatars/user.webp',
        },
    }),
}));

vi.mock('@/hooks/interview/use-interviews', () => ({
    useInterview: () => ({ data: { targetRole: 'Frontend Developer' } }),
    useInterviewEvaluation: () => ({
        data: response,
        isPending: false,
        isError: queryError,
        refetch,
    }),
    useInterviewQuestionReviews: () => ({
        data: {
            status: 'COMPLETED',
            reviews: {
                schemaVersion: 1,
                answerReviews: response?.report?.answerReviews ?? [],
            },
        },
        isPending: false,
        isError: false,
    }),    useInterviewTranscript: () => ({
        data: { turns: [] },
        isPending: false,
        isError: false,
    }),
    useCreateInterviewEvaluation: () => ({
        mutate: createMutate,
        isPending: false,
    }),
    useRetryInterviewEvaluation: () => ({
        mutate: retryMutate,
        isPending: false,
    }),
    useReanalyzeInterviewEvaluation: () => ({
        mutate: reanalyzeMutate,
        isPending: false,
    }),
    useReanalyzeInterviewQuestionReviews: () => ({
        mutate: reanalyzeMutate,
        isPending: false,
    }),
}));

const report: InterviewEvaluationReport = {
    overallSummary: 'Đáp ứng một phần kỳ vọng Junior Frontend.',
    overallScore: 6.5,
    coverage: 0.75,
    confidence: 'MEDIUM',
    levelAssessment: 'PARTIALLY_MEETS_EXPECTATIONS',
    demonstratedStrengths: ['Giải thích đúng state trong React.'],
    competencies: [
        {
            competencyKey: 'javascript-core',
            name: 'JavaScript Core',
            priority: 'KEY',
            score: 4,
            coverageStatus: 'PARTIAL',
            confidence: 'MEDIUM',
            summary: 'Nắm được cú pháp nhưng chưa chắc về event loop.',
            strengths: ['Hiểu Promise cơ bản.'],
            weaknesses: ['Chưa giải thích được event loop.'],
            evidenceTurnIds: ['11111111-1111-4111-8111-111111111111'],
        },
    ],
    diagnosticFindings: [
        {
            id: 'javascript-event-loop',
            competencyKey: 'javascript-core',
            subarea: 'Event Loop',
            category: 'KNOWLEDGE_GAP',
            evidenceStatus: 'DEMONSTRATED_GAP',
            severity: 'HIGH',
            observation: 'Chưa mô tả được thứ tự thực thi bất đồng bộ.',
            expectedUnderstanding: 'Hiểu call stack và task queues.',
            explanation: 'Đây là nền tảng xử lý bất đồng bộ của JavaScript.',
            evidenceTurnIds: ['11111111-1111-4111-8111-111111111111'],
            improvementAction: 'Ôn lại event loop.',
            suggestedPractice: 'Dự đoán output của các đoạn mã Promise.',
        },
    ],
    answerReviews: [
        {
            turnId: '11111111-1111-4111-8111-111111111111',
            questionText: 'Event loop trong JavaScript hoạt động thế nào?',
            answerText: 'Em chưa rõ.',
            probeType: 'MAIN_TARGET_LEVEL',
            scoringImpact: 'TARGET_LEVEL',
            competencyKey: 'javascript-core',
            correctAspects: [],
            missingAspects: ['Call stack và task queues.'],
            incorrectAspects: [],
            whyItMatters: 'Ảnh hưởng cách xử lý async.',
            improvement: 'Giải thích theo thứ tự thực thi.',
            exampleImprovedAnswer:
                'Event loop phối hợp call stack và các hàng đợi tác vụ.',
            reviewSections: [
                {
                    type: 'KNOWLEDGE_EXPLANATION',
                    title: 'Kiến thức cần nắm',
                    data: {
                        explanation:
                            'Event loop điều phối công việc bất đồng bộ trong JavaScript.',
                        keyPoints: ['Call stack', 'Microtask queue'],
                        commonMisconception: null,
                    },
                },
            ],
        },
    ],
    recommendations: [
        {
            competencyKey: 'javascript-core',
            priority: 'KEY',
            topic: 'JavaScript Event Loop',
            reason: 'Khắc phục khoảng trống đã thể hiện trong buổi phỏng vấn.',
            learningObjectives: ['Hiểu call stack.'],
            suggestedExercises: ['Dự đoán thứ tự console.log.'],
            expectedOutcome: 'Giải thích đúng luồng bất đồng bộ.',
            relatedFindingIds: ['javascript-event-loop'],
        },
    ],
    unassessedAreas: [],
    stretchAchievements: [],
    generatedAt: '2026-10-13T00:00:00.000Z',
    rubricVersion: 'evaluation-v1',
};

function evaluation(
    overrides: Partial<InterviewEvaluationResponse> = {},
): InterviewEvaluationResponse {
    return {
        interviewId: 'interview-id',
        status: 'COMPLETED',
        report,
        canRetry: false,
        attemptCount: 1,
        ...overrides,
    };
}

describe('InterviewEvaluationReportPage', () => {
    beforeEach(() => {
        response = evaluation();
        queryError = false;
        createMutate.mockReset();
        retryMutate.mockReset();
        reanalyzeMutate.mockReset();
        refetch.mockReset();
    });

    it('automatically requests an evaluation only from NOT_STARTED', async () => {
        response = evaluation({ status: 'NOT_STARTED', report: null });
        render(<InterviewEvaluationReportPage id="interview-id" />);
        await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
        expect(
            screen.getByText(/đang phân tích câu trả lời/i),
        ).toBeInTheDocument();
    });

    it('renders the persisted processing state', () => {
        response = evaluation({ status: 'PROCESSING', report: null });
        render(<InterviewEvaluationReportPage id="interview-id" />);
        expect(
            screen.getByText(/đang phân tích câu trả lời/i),
        ).toBeInTheDocument();
        expect(createMutate).not.toHaveBeenCalled();
    });

    it('renders retry only when the backend allows it', async () => {
        const user = userEvent.setup();
        response = evaluation({
            status: 'FAILED',
            report: null,
            canRetry: true,
            errorCode: 'AI_TIMEOUT',
        });
        render(<InterviewEvaluationReportPage id="interview-id" />);
        await user.click(screen.getByRole('button', { name: /thử lại/i }));
        expect(retryMutate).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/AI_TIMEOUT/)).toBeInTheDocument();
    });

    it('confirms before queuing a fresh analysis', async () => {
        const user = userEvent.setup();
        render(<InterviewEvaluationReportPage id="interview-id" />);

        await user.click(
            screen.getByRole('button', { name: /phân tích lại/i }),
        );
        expect(
            screen.getByRole('heading', { name: /phân tích lại báo cáo/i }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', {
                name: 'Phân tích lại',
            }),
        );
        expect(reanalyzeMutate).toHaveBeenCalledTimes(1);
    });

    it('keeps the previous report visible while re-analysis is pending', () => {
        response = evaluation({ status: 'PROCESSING' });
        render(<InterviewEvaluationReportPage id="interview-id" />);

        expect(
            screen.getByText(/đang tạo bản phân tích mới/i),
        ).toBeInTheDocument();
        expect(screen.getByText('JavaScript Core')).toBeInTheDocument();
    });

    it('renders evidence-backed diagnostics and learning recommendations', () => {
        render(<InterviewEvaluationReportPage id="interview-id" />);
        expect(screen.getByText('JavaScript Core')).toBeInTheDocument();
        expect(screen.getByText('Event Loop')).toBeInTheDocument();
        expect(
            screen.getAllByText('JavaScript Event Loop').length,
        ).toBeGreaterThan(0);
        expect(
            screen.getAllByText(/event loop trong JavaScript hoạt động/i)[0],
        ).toBeInTheDocument();
    });

    it('renders schema-driven review sections from the persisted report', async () => {
        const user = userEvent.setup();
        render(<InterviewEvaluationReportPage id="interview-id" />);

        await user.click(
            screen.getByRole('tab', { name: 'Giải thích & kiến thức' }),
        );

        expect(screen.getByText('Kiến thức cần nắm')).toBeInTheDocument();
        expect(screen.getByText('Microtask queue')).toBeInTheDocument();
    });
    it('shows an honest insufficient-evidence state instead of zero', () => {
        response = evaluation({
            report: {
                ...report,
                overallScore: null,
                coverage: 0.25,
                confidence: 'LOW',
                levelAssessment: 'INSUFFICIENT_EVIDENCE',
            },
        });
        render(<InterviewEvaluationReportPage id="interview-id" />);
        expect(
            screen.getByText(/chưa đủ dữ liệu để đánh giá tổng thể/i),
        ).toBeInTheDocument();
        expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    });
    it('switches tab sets between adjacent questions without leaking content', async () => {
        const user = userEvent.setup();
        const secondReview = {
            ...report.answerReviews[0],
            turnId: '44444444-4444-4444-8444-444444444444',
            questionText:
                'Bạn sẽ trình bày kinh nghiệm dự án theo cấu trúc nào?',
            answerText: 'Em sẽ nêu bối cảnh, hành động và kết quả.',
            reviewSections: [
                {
                    type: 'ANSWER_STRUCTURE' as const,
                    title: 'Cấu trúc trình bày',
                    order: 1,
                    data: {
                        steps: [
                            {
                                label: 'Bối cảnh',
                                guidance: 'Nêu tình huống liên quan.',
                            },
                            {
                                label: 'Kết quả',
                                guidance: 'Nêu kết quả có căn cứ.',
                            },
                        ],
                    },
                },
            ],
        };
        response = evaluation({
            report: {
                ...report,
                answerReviews: [report.answerReviews[0], secondReview],
            },
        });
        render(<InterviewEvaluationReportPage id="interview-id" />);

        expect(
            screen.getByRole('tab', { name: 'Giải thích & kiến thức' }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: /Câu tiếp theo/i }),
        );

        expect(
            screen.getByRole('tab', { name: 'Cấu trúc gợi ý' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('tab', { name: 'Giải thích & kiến thức' }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Microtask queue')).not.toBeInTheDocument();
    });

    it('groups by the authoritative question type and keeps legacy answer tabs', () => {
        response = evaluation({
            report: {
                ...report,
                answerReviews: [
                    {
                        ...report.answerReviews[0],
                        questionType: 'GENERAL',
                        sectionIndex: 0,
                        sectionTitle: 'Mở đầu',
                        competencyKey: 'PROJECT_EXPERIENCE',
                    },
                ],
            },
        });
        render(<InterviewEvaluationReportPage id="interview-id" />);

        expect(screen.getByText(/Giới thiệu bản thân/)).toBeInTheDocument();
        expect(
            screen.getByRole('tab', { name: 'Câu trả lời tốt hơn' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('tab', { name: 'So sánh' }),
        ).toBeInTheDocument();
    });
    it('keeps a graceful legacy review when reviewSections are absent', () => {
        response = evaluation({
            report: {
                ...report,
                answerReviews: [
                    { ...report.answerReviews[0], reviewSections: undefined },
                ],
            },
        });
        render(<InterviewEvaluationReportPage id="interview-id" />);

        expect(
            screen.getByRole('tab', { name: 'Phân tích chi tiết' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(report.answerReviews[0].improvement),
        ).toBeInTheDocument();
    });
});
