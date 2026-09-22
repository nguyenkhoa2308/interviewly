import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CvDetailShell } from './cv-detail-shell';
import { ApiError } from '@/lib/api-error';
import type { CvDetail } from '@/types/cv';

const mocks = vi.hoisted(() => ({
    useCv: vi.fn(),
    setDefault: vi.fn(),
    latestAnalysis: vi.fn(),
    replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/hooks/cv', () => ({
    useCv: mocks.useCv,
    useLatestCvAnalysis: mocks.latestAnalysis,
    useSetDefaultCv: () => ({
        isPending: false,
        mutateAsync: mocks.setDefault,
    }),
}));
vi.mock('@/components/cv/cv-actions-menu', () => ({
    CvActionsMenu: ({
        cv,
        onRename,
        onSetDefault,
        onDelete,
    }: {
        cv: CvDetail;
        onRename: (cv: CvDetail) => void;
        onSetDefault: (cv: CvDetail) => void;
        onDelete: (cv: CvDetail) => void;
    }) => (
        <div>
            <button onClick={() => onRename(cv)}>Đổi tên test</button>
            <button onClick={() => onSetDefault(cv)}>Mặc định test</button>
            <button onClick={() => onDelete(cv)}>Xóa test</button>
        </div>
    ),
}));
vi.mock('@/components/cv/cv-dialogs', () => ({
    CvVersionsDialog: ({ open }: { open: boolean }) =>
        open ? <div>Lịch sử phiên bản test</div> : null,
    RenameCvDialog: ({ cv }: { cv: CvDetail | null }) =>
        cv ? <div>Đang đổi tên: {cv.name}</div> : null,
    DeleteCvDialog: ({
        cv,
        onDeleted,
    }: {
        cv: CvDetail | null;
        onDeleted?: () => void;
    }) => (cv ? <button onClick={onDeleted}>Xác nhận xóa test</button> : null),
}));
vi.mock('@/components/cv/cv-analysis-section', () => ({
    CvAnalysisSection: ({ cv }: { cv: CvDetail }) => (
        <section>Phân tích CV test: {cv.id}</section>
    ),
}));

const readyCv: CvDetail = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'CV Backend Developer',
    originalFilename: 'Nguyen_Duc_Khoa_Backend_CV.pdf',
    mimeType: 'application/pdf',
    fileSize: 245760,
    processingStatus: 'READY',
    isDefault: true,
    createdAt: '2026-09-15T02:00:00.000Z',
    updatedAt: '2026-09-15T03:00:00.000Z',
    extractedText:
        'NGUYEN DUC KHOA\nBackend Developer\nhttps://example.com/a-very-long-profile',
};

function query(overrides: Record<string, unknown> = {}) {
    return {
        isPending: false,
        isError: false,
        data: readyCv,
        error: null,
        refetch: vi.fn(),
        ...overrides,
    };
}

describe('CvDetailShell', () => {
    beforeEach(() => {
        mocks.useCv.mockReturnValue(query());
        mocks.latestAnalysis.mockReturnValue({
            data: null,
            isPending: false,
            isError: false,
        });
        mocks.setDefault.mockResolvedValue(undefined);
    });

    it('passes the route CV id to useCv', () => {
        render(<CvDetailShell cvId="cv-123" />);
        expect(mocks.useCv).toHaveBeenCalledWith('cv-123');
    });

    it('renders a layout-shaped loading skeleton', () => {
        mocks.useCv.mockReturnValue(
            query({ isPending: true, data: undefined }),
        );
        render(<CvDetailShell cvId="cv-123" />);
        expect(screen.getByLabelText('Đang tải thông tin CV')).toHaveAttribute(
            'aria-busy',
            'true',
        );
        expect(screen.queryByText('Không tìm thấy CV')).not.toBeInTheDocument();
    });

    it('renders READY metadata and parsed text', () => {
        render(<CvDetailShell cvId="cv-123" />);
        expect(
            screen.getByRole('heading', { level: 1, name: readyCv.name }),
        ).toBeVisible();
        expect(screen.getAllByText(readyCv.originalFilename)).toHaveLength(2);
        expect(screen.getByText('240 KB')).toBeVisible();
        expect(
            screen.getByText('15/09/2026 · 09:00', { selector: 'time' }),
        ).toHaveAttribute('datetime', readyCv.createdAt);
        expect(
            screen.getByText('Cập nhật lần cuối 15/09/2026 · 10:00'),
        ).toBeVisible();
        expect(screen.getAllByText('Sẵn sàng')).toHaveLength(2);
        expect(screen.getByText('Mặc định')).toBeVisible();
        expect(screen.getByText('CV mặc định')).toBeVisible();
        expect(screen.getByText('Có')).toBeVisible();
        expect(
            screen.getByRole('heading', { name: 'NGUYEN DUC KHOA' }),
        ).toBeVisible();
        expect(screen.getByText('Backend Developer')).toBeVisible();
        expect(
            screen.getByText('https://example.com/a-very-long-profile'),
        ).toBeVisible();
    });

    it('renders hostile markup as text instead of executable HTML', () => {
        const hostile = `<script>alert('xss')</script>`;
        mocks.useCv.mockReturnValue(
            query({ data: { ...readyCv, extractedText: hostile } }),
        );
        const { container } = render(<CvDetailShell cvId="cv-123" />);
        expect(screen.getByText(hostile)).toBeVisible();
        expect(container.querySelector('script')).toBeNull();
    });

    it('turns extracted text into a structured document preview and keeps raw text available', async () => {
        const extractedText = [
            'NGUYEN DUC KHOA',
            'Backend Developer',
            'khoa@example.com · github.com/khoand',
            'ABOUT ME',
            'Backend engineer focused on reliable APIs.',
            'EXPERIENCE',
            'Interviewly',
            '- Built authentication services with NestJS.',
            'PROJECTS',
            'Task Hub | Project Management Platform Jul 2026 - Aug 2026',
            'Next.js • TypeScript • Tailwind CSS • NestJS',
        ].join('\n');
        mocks.useCv.mockReturnValue(
            query({ data: { ...readyCv, extractedText } }),
        );

        const { container } = render(<CvDetailShell cvId="cv-123" />);

        expect(
            screen.getByRole('heading', { name: 'NGUYEN DUC KHOA' }),
        ).toBeVisible();
        expect(screen.getByText('Backend Developer')).toBeVisible();
        expect(screen.getByRole('region', { name: 'ABOUT ME' })).toBeVisible();
        expect(screen.queryByText('Tổng quan')).not.toBeInTheDocument();
        expect(screen.queryByText('Thông tin')).not.toBeInTheDocument();
        expect(
            screen.getByText('Built authentication services with NestJS.'),
        ).toBeVisible();
        expect(screen.getByText('Interviewly')).toHaveClass('font-extrabold');
        const projectTitle = screen.getByText(
            'Task Hub | Project Management Platform',
        );
        expect(projectTitle).toHaveClass('font-extrabold');
        expect(projectTitle.parentElement).toHaveClass('sm:justify-between');
        expect(screen.getByText('Jul 2026 - Aug 2026')).toBeVisible();
        expect(
            screen.getByText('Next.js • TypeScript • Tailwind CSS • NestJS'),
        ).not.toHaveClass('font-extrabold');
        expect(container.querySelector('pre')).toBeNull();

        await userEvent.click(screen.getByRole('tab', { name: 'Văn bản thô' }));
        expect(container.querySelector('pre')?.textContent).toBe(extractedText);
    });

    it('renders backend structured content without renaming custom sections', () => {
        mocks.useCv.mockReturnValue(
            query({
                data: {
                    ...readyCv,
                    structuredContent: {
                        header: {
                            name: 'Nguyen Duc Khoa',
                            headline: 'Backend Developer',
                            contacts: ['khoa@example.com', 'Ha Noi, Vietnam'],
                        },
                        sections: [
                            {
                                title: 'MY JOURNEY',
                                items: [
                                    {
                                        title: 'Interviewly',
                                        subtitle: 'Backend Developer',
                                        dateText: '2025 - Present',
                                        lines: [
                                            {
                                                type: 'BULLET',
                                                content:
                                                    'Built secure authentication APIs.',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                },
            }),
        );

        render(<CvDetailShell cvId="cv-123" />);

        expect(
            screen.getByRole('region', { name: 'MY JOURNEY' }),
        ).toBeVisible();
        expect(screen.getByText('Interviewly')).toHaveClass('font-extrabold');
        expect(screen.getByText('2025 - Present')).toBeVisible();
        expect(screen.queryByText('EXPERIENCE')).not.toBeInTheDocument();
    });

    it('does not expose internal ownership or storage fields', () => {
        mocks.useCv.mockReturnValue(
            query({
                data: {
                    ...readyCv,
                    userId: 'private-user',
                    storageKey: 'private/storage/key',
                },
            }),
        );
        render(<CvDetailShell cvId="cv-123" />);
        expect(screen.queryByText('private-user')).not.toBeInTheDocument();
        expect(
            screen.queryByText('private/storage/key'),
        ).not.toBeInTheDocument();
    });

    it.each([
        ['UPLOADING', 'CV đang được tải lên'],
        ['PROCESSING', 'CV đang được xử lý'],
        ['FAILED', 'Không thể xử lý CV này'],
    ] as const)(
        'renders the %s lifecycle state',
        (processingStatus, message) => {
            mocks.useCv.mockReturnValue(
                query({
                    data: { ...readyCv, processingStatus, extractedText: null },
                }),
            );
            render(<CvDetailShell cvId="cv-123" />);
            expect(screen.getByText(message)).toBeVisible();
            expect(
                screen.queryByText('NGUYEN DUC KHOA'),
            ).not.toBeInTheDocument();
        },
    );

    it.each([null, '', '   \n '])(
        'handles READY with unavailable text: %s',
        (extractedText) => {
            mocks.useCv.mockReturnValue(
                query({ data: { ...readyCv, extractedText } }),
            );
            render(<CvDetailShell cvId="cv-123" />);
            expect(
                screen.getByText('Chưa có nội dung để hiển thị'),
            ).toBeVisible();
        },
    );

    it('renders a private not-found state without retry', () => {
        mocks.useCv.mockReturnValue(
            query({
                isError: true,
                data: undefined,
                error: new ApiError('raw detail', 'CV_NOT_FOUND', 404),
            }),
        );
        render(<CvDetailShell cvId="cv-123" />);
        expect(
            screen.getByRole('heading', { name: 'Không tìm thấy CV' }),
        ).toBeVisible();
        expect(screen.queryByText('raw detail')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Thử lại' }),
        ).not.toBeInTheDocument();
    });

    it('renders a safe generic error and retries', async () => {
        const refetch = vi.fn();
        mocks.useCv.mockReturnValue(
            query({
                isError: true,
                data: undefined,
                error: new Error('Axios secret'),
                refetch,
            }),
        );
        render(<CvDetailShell cvId="cv-123" />);
        expect(screen.queryByText('Axios secret')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
        expect(refetch).toHaveBeenCalledOnce();
    });

    it('opens rename using the current server CV', async () => {
        render(<CvDetailShell cvId="cv-123" />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Đổi tên test' }),
        );
        expect(screen.getByText('Đang đổi tên: ' + readyCv.name)).toBeVisible();
    });

    it('opens version history from the update-file action', async () => {
        render(<CvDetailShell cvId="cv-123" />);
        await userEvent.click(
            screen.getByRole('button', { name: /Cập nhật file/i }),
        );
        expect(screen.getByText('Lịch sử phiên bản test')).toBeVisible();
    });


    it('sets the current CV as default through the shared mutation', async () => {
        render(<CvDetailShell cvId="cv-123" />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Mặc định test' }),
        );
        await waitFor(() =>
            expect(mocks.setDefault).toHaveBeenCalledWith(readyCv.id),
        );
    });

    it('navigates to the list only after delete success callback', async () => {
        render(<CvDetailShell cvId="cv-123" />);
        await userEvent.click(screen.getByRole('button', { name: 'Xóa test' }));
        expect(mocks.replace).not.toHaveBeenCalled();
        await userEvent.click(
            screen.getByRole('button', { name: 'Xác nhận xóa test' }),
        );
        expect(mocks.replace).toHaveBeenCalledWith('/cv');
    });
});
