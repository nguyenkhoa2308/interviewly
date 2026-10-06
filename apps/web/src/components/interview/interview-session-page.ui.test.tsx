import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InterviewRuntimeState } from '@/types/interview';

import { InterviewSessionPage } from './interview-session-page';

const mutateAsync = vi.fn();
const refetch = vi.fn();
const startMutate = vi.fn();
let runtimeState: InterviewRuntimeState;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/hooks/interview/use-interviews', () => ({
    useInterviewRuntime: () => ({
        data: runtimeState,
        isPending: false,
        isError: false,
        refetch,
    }),
    useStartInterview: () => ({ mutateAsync: startMutate, isPending: false }),
    useSubmitInterviewAnswer: () => ({ mutateAsync, isPending: false }),
}));

const activeState: InterviewRuntimeState = {
    interview: {
        id: 'interview-id',
        status: 'IN_PROGRESS',
        interviewType: 'FULL',
        targetRole: 'Frontend Developer',
        targetLevel: 'JUNIOR',
        durationMinutes: 30,
    },
    session: {
        id: 'session-id',
        planId: 'plan-id',
        planVersion: 1,
        startedAt: '2026-10-05T00:00:00Z',
        completedAt: null,
    },
    currentTurn: {
        id: 'turn-id',
        ordinal: 2,
        sectionIndex: 1,
        sectionTitle: 'Kỹ thuật',
        questionType: 'TECHNICAL',
        questionText: 'Bạn tối ưu render React như thế nào?',
        isAdaptive: false,
        transition: null,
    },
    progress: {
        completedQuestions: 1,
        totalQuestions: 4,
        percentage: 25,
        currentSection: 'Kỹ thuật',
        sectionNumber: 2,
        totalSections: 4,
    },
    processing: false,
    completed: false,
};

describe('InterviewSessionPage', () => {
    beforeEach(() => {
        runtimeState = structuredClone(activeState);
        mutateAsync.mockReset();
        refetch.mockReset();
    });

    it('shows the exact current question and accessible progress', () => {
        render(<InterviewSessionPage id="interview-id" />);
        expect(
            screen.getByRole('heading', {
                name: 'Bạn tối ưu render React như thế nào?',
            }),
        ).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute(
            'aria-valuenow',
            '25',
        );
        expect(
            screen.getByRole('button', { name: 'Gửi và sang câu tiếp theo' }),
        ).toBeDisabled();
    });

    it('submits the current turn id with the trimmed answer', async () => {
        mutateAsync.mockResolvedValue({ ...activeState, completed: false });
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);
        await user.type(
            screen.getByLabelText('Câu trả lời của bạn'),
            '  Dùng memo khi profiling cho thấy cần thiết.  ',
        );
        await user.click(
            screen.getByRole('button', { name: 'Gửi và sang câu tiếp theo' }),
        );
        expect(mutateAsync).toHaveBeenCalledWith({
            turnId: 'turn-id',
            answer: 'Dùng memo khi profiling cho thấy cần thiết.',
        });
    });

    it('keeps the typed answer and refetches state when submission fails', async () => {
        mutateAsync.mockRejectedValue(new Error('Mất kết nối'));
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);
        const textarea = screen.getByLabelText('Câu trả lời của bạn');
        await user.type(textarea, 'Nội dung chưa gửi');
        await user.click(
            screen.getByRole('button', { name: 'Gửi và sang câu tiếp theo' }),
        );
        expect(textarea).toHaveValue('Nội dung chưa gửi');
        expect(refetch).toHaveBeenCalledOnce();
    });
    it('renders an adaptive follow-up as a normal question with a natural transition', () => {
        runtimeState = {
            ...structuredClone(activeState),
            currentTurn: {
                ...activeState.currentTurn!,
                id: 'adaptive-turn-id',
                ordinal: 2,
                questionText: 'Can you give a concrete example?',
                isAdaptive: true,
                transition: 'Let us explore that point a little further.',
            },
        };
        render(<InterviewSessionPage id="interview-id" />);
        expect(
            screen.getByRole('heading', {
                name: 'Can you give a concrete example?',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Let us explore that point a little further.'),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/FOLLOW_UP|REPHRASE/),
        ).not.toBeInTheDocument();
    });

    it('shows a subtle processing state while the next question is prepared', () => {
        runtimeState = {
            ...structuredClone(activeState),
            currentTurn: null,
            processing: true,
        };
        const { container } = render(
            <InterviewSessionPage id="interview-id" />,
        );
        expect(
            container.querySelector('[aria-live="polite"]'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows completion without exposing a Phase 8 score or report', () => {
        runtimeState = {
            ...structuredClone(activeState),
            currentTurn: null,
            processing: false,
            completed: true,
            session: {
                ...activeState.session!,
                completedAt: '2026-10-05T00:30:00Z',
            },
        };
        render(<InterviewSessionPage id="interview-id" />);
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(
            screen.queryByText(/overall score|hiring recommendation/i),
        ).not.toBeInTheDocument();
    });
});
