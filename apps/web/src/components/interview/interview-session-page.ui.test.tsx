import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { InterviewRuntimeState } from '@/types/interview';

import { InterviewSessionPage } from './interview-session-page';
const editorRect = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
} as DOMRect;

Range.prototype.getBoundingClientRect = () => editorRect;
Range.prototype.getClientRects = () => [editorRect] as unknown as DOMRectList;

const mutateAsync = vi.fn();
const refetch = vi.fn();
const startMutate = vi.fn();
let runtimeState: InterviewRuntimeState;
let submitPending = false;

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
    useSubmitInterviewAnswer: () => ({
        mutateAsync,
        isPending: submitPending,
    }),
}));

const activeState: InterviewRuntimeState = {
    interview: {
        id: 'interview-id',
        status: 'IN_PROGRESS',
        interviewType: 'FULL',
        targetRole: 'Frontend Developer',
        targetLevel: 'JUNIOR',
        durationMinutes: 30,
        focusAreas: ['React', 'TypeScript'],
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
    },
    progress: {
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
        submitPending = false;
        mutateAsync.mockReset();
        refetch.mockReset();
    });

    it('renders the authoritative question and section context without fake progress', () => {
        render(<InterviewSessionPage id="interview-id" />);

        expect(
            screen.getByRole('heading', {
                name: 'Bạn tối ưu render React như thế nào?',
            }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(
            screen.queryByText(/thời gian dự kiến còn lại/i),
        ).not.toBeInTheDocument();
        expect(screen.getByText('Phần 2/4')).toBeInTheDocument();
        expect(screen.getByText('Kỹ thuật')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Trả lời' })).toBeDisabled();
        expect(screen.getByText('React')).toBeInTheDocument();
    });

    it('submits the current turn id with the trimmed answer', async () => {
        mutateAsync.mockResolvedValue({ ...activeState, completed: false });
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);

        const editor = screen.getByLabelText('Câu trả lời của bạn');
        editor.focus();
        await user.keyboard('  Dùng memo khi profiling cho thấy cần thiết.  ');
        await user.click(screen.getByRole('button', { name: 'Trả lời' }));

        expect(mutateAsync).toHaveBeenCalledWith({
            turnId: 'turn-id',
            answer: 'Dùng memo khi profiling cho thấy cần thiết.',
        });
    });

    it('uses Enter for a new paragraph and only submits from the submit button', async () => {
        mutateAsync.mockResolvedValue({ ...activeState, completed: false });
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);
        const editor = screen.getByLabelText('Câu trả lời của bạn');

        editor.focus();
        await user.keyboard('Dòng một{Enter}Dòng hai');

        expect(editor.querySelectorAll('p')).toHaveLength(2);
        expect(mutateAsync).not.toHaveBeenCalled();

        const submitButton = screen.getByRole('button', { name: 'Trả lời' });
        submitButton.focus();
        await user.keyboard('{Enter}');

        expect(mutateAsync).toHaveBeenCalledWith({
            turnId: 'turn-id',
            answer: 'Dòng một\nDòng hai',
        });
    });

    it('uses Shift+Enter for a soft break without creating a new paragraph', async () => {
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);
        const editor = screen.getByLabelText('Câu trả lời của bạn');

        editor.focus();
        await user.keyboard('Dòng một{Shift>}{Enter}{/Shift}Dòng hai');

        expect(editor.querySelectorAll('p')).toHaveLength(1);
        expect(editor.querySelector('br')).toBeInTheDocument();
        expect(mutateAsync).not.toHaveBeenCalled();
    });
    it('applies rich-text formatting directly in the editor', async () => {
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);
        const boldButton = screen.getByRole('button', { name: 'In đậm' });

        await user.click(boldButton);

        expect(boldButton).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getByRole('toolbar', { name: 'Định dạng câu trả lời' }),
        ).toBeInTheDocument();
    });

    it('keeps Tab inside a plain answer instead of moving focus to the toolbar', async () => {
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);
        const editor = screen.getByLabelText('Câu trả lời của bạn');

        editor.focus();
        await user.keyboard('Đoạn trả lời{Tab}được thụt vào');

        expect(editor).toHaveFocus();
        expect(editor.textContent).toContain('Đoạn trả lời\tđược thụt vào');
        expect(
            screen.getByRole('button', { name: 'In đậm' }),
        ).not.toHaveFocus();
    });
    it('keeps Shift+Enter inside the current bullet item', async () => {
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);
        const editor = screen.getByLabelText('Câu trả lời của bạn');

        await user.click(
            screen.getByRole('button', {
                name: 'Danh sách gạch đầu dòng',
            }),
        );
        await user.keyboard('Dòng một{Shift>}{Enter}{/Shift}Dòng hai');

        expect(editor.querySelectorAll('li')).toHaveLength(1);
        expect(editor.querySelector('li br')).toBeInTheDocument();
        expect(mutateAsync).not.toHaveBeenCalled();
    });
    it('continues bullets with Enter and nests them with Tab', async () => {
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);
        const editor = screen.getByLabelText('Câu trả lời của bạn');

        await user.click(
            screen.getByRole('button', {
                name: 'Danh sách gạch đầu dòng',
            }),
        );
        await user.keyboard('React{Enter}TypeScript');

        await waitFor(() => {
            expect(editor.querySelectorAll('li')).toHaveLength(2);
        });

        await user.keyboard('{Tab}');

        await waitFor(() => {
            expect(editor.querySelector('ul ul')).toBeInTheDocument();
        });
        expect(mutateAsync).not.toHaveBeenCalled();
    });
    it('keeps the typed answer and allows retry when submission fails', async () => {
        mutateAsync.mockRejectedValue(new Error('Mất kết nối'));
        const user = userEvent.setup();
        render(<InterviewSessionPage id="interview-id" />);
        const editor = screen.getByLabelText('Câu trả lời của bạn');

        editor.focus();
        await user.keyboard('Nội dung chưa gửi');
        await user.click(screen.getByRole('button', { name: 'Trả lời' }));

        expect(editor).toHaveTextContent('Nội dung chưa gửi');
        expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối');
        expect(refetch).toHaveBeenCalledOnce();
        expect(screen.getByRole('button', { name: 'Trả lời' })).toBeEnabled();
    });

    it('disables input and action while an answer is being submitted', () => {
        submitPending = true;
        render(<InterviewSessionPage id="interview-id" />);

        expect(screen.getByLabelText('Câu trả lời của bạn')).toHaveAttribute(
            'contenteditable',
            'false',
        );
        expect(screen.getByRole('status')).toHaveTextContent(
            'Đang phân tích câu trả lời của bạn...',
        );
        expect(
            screen.queryByRole('button', { name: 'Đang gửi...' }),
        ).not.toBeInTheDocument();
    });

    it('renders every adaptive question as the same candidate-facing question', () => {
        runtimeState = {
            ...structuredClone(activeState),
            currentTurn: {
                ...activeState.currentTurn!,
                id: 'adaptive-turn-id',
                ordinal: 3,
                questionText: 'Bạn đo hiệu năng render bằng cách nào?',
            },
        };

        render(<InterviewSessionPage id="interview-id" />);

        expect(
            screen.getByRole('heading', {
                name: 'Bạn đo hiệu năng render bằng cách nào?',
            }),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/follow.?up|stretch|recovery|competency/i),
        ).not.toBeInTheDocument();
        expect(screen.getByText('Câu hỏi hiện tại')).toBeInTheDocument();
    });

    it('keeps the workspace context while the next question is prepared', () => {
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
        expect(
            screen.getByText('Thông tin buổi phỏng vấn'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows completion without exposing a fake Phase 8 report', () => {
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

        expect(
            screen.getByRole('heading', {
                name: 'Bạn đã hoàn thành buổi phỏng vấn!',
            }),
        ).toBeInTheDocument();
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        expect(
            screen.queryByText(/overall score|hiring recommendation/i),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Về danh sách phỏng vấn' }),
        ).toHaveAttribute('href', '/interviews');
    });
});
