import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CvManagementPage } from './cv-management-page';
import { ApiError } from '@/lib/api-error';
import type { CvListItem, CvListParams } from '@/types/cv';

const mocks = vi.hoisted(() => ({
    useCvs: vi.fn(),
    refetch: vi.fn(),
    setDefault: vi.fn(),
}));

vi.mock('@/hooks/cv', () => ({
    useCvManagementCollection: mocks.useCvs,
    useSetDefaultCv: () => ({
        isPending: false,
        mutateAsync: mocks.setDefault,
    }),
}));
vi.mock('@/components/cv/cv-card', () => ({
    CvCard: ({
        cv,
        onRetryUpload,
    }: {
        cv: CvListItem;
        onRetryUpload: (cv: CvListItem) => void;
    }) => (
        <article>
            {cv.name} · {cv.processingStatus}
            {cv.processingStatus === 'FAILED' && (
                <button onClick={() => onRetryUpload(cv)}>Tải lại tệp</button>
            )}
        </article>
    ),
}));
vi.mock('@/components/cv/cv-dialogs', () => ({
    UploadCvDialog: ({ open }: { open: boolean }) =>
        open ? <div>Dialog tải CV</div> : null,
    RenameCvDialog: () => null,
    DeleteCvDialog: () => null,
    CvVersionsDialog: ({
        open,
        cv,
    }: {
        open: boolean;
        cv: CvListItem | null;
    }) => (open ? <div>Retry {cv?.name}</div> : null),
}));
vi.mock('@/components/cv/cv-compare-dialog', () => ({
    CvCompareDialog: () => null,
}));

const item: CvListItem = {
    id: 'cv-1',
    name: 'CV Frontend',
    originalFilename: 'frontend.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    processingStatus: 'READY',
    isDefault: true,
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
};

function state(overrides: Record<string, unknown> = {}) {
    return {
        data: {
            items: [item],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
        isPending: false,
        isFetching: false,
        isError: false,
        error: null,
        refetch: mocks.refetch,
        ...overrides,
    };
}

describe('CvManagementPage', () => {
    beforeEach(() => mocks.useCvs.mockReturnValue(state()));

    it('renders the CV collection and opens upload dialog', async () => {
        render(<CvManagementPage />);
        expect(screen.getByText(/CV Frontend · READY/)).toBeVisible();
        await userEvent.click(
            screen.getByRole('button', { name: /Tải CV lên/ }),
        );
        expect(screen.getByText('Dialog tải CV')).toBeVisible();
    });

    it('does not render pagination for a single page', () => {
        render(<CvManagementPage />);
        expect(
            screen.queryByRole('navigation', {
                name: /Phân trang danh sách CV/,
            }),
        ).not.toBeInTheDocument();
    });

    it('paginates the filtered collection with eight CVs per page', async () => {
        const items = Array.from({ length: 9 }, (_, index) => ({
            ...item,
            id: 'cv-' + (index + 1),
            name: 'CV ' + String(index + 1).padStart(2, '0'),
            isDefault: false,
            createdAt: new Date(
                Date.UTC(2026, 8, 19, 0, 0, index),
            ).toISOString(),
        }));
        mocks.useCvs.mockImplementation((params: CvListParams = {}) =>
            state({
                data: {
                    items:
                        params.page === 2 ? items.slice(8) : items.slice(0, 8),
                    counts: {
                        ALL: 9,
                        READY: 9,
                        PROCESSING: 0,
                        FAILED: 0,
                    },
                    pagination: {
                        page: params.page ?? 1,
                        limit: 8,
                        total: 9,
                        totalPages: 2,
                    },
                },
            }),
        );

        render(<CvManagementPage />);

        expect(
            screen.getByRole('navigation', {
                name: /Phân trang danh sách CV/,
            }),
        ).toBeVisible();
        expect(screen.getByText(/CV 01/)).toBeVisible();
        expect(screen.queryByText(/CV 09/)).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /Sau/ }));

        expect(screen.getByText(/CV 09/)).toBeVisible();
        expect(screen.queryByText(/CV 01/)).not.toBeInTheDocument();
        expect(screen.getByText('2/2')).toBeVisible();
        expect(
            screen.getByRole('button', { name: /Tải lên CV mới/ }),
        ).toBeVisible();
    });

    it('renders a layout skeleton while loading', () => {
        mocks.useCvs.mockReturnValue(
            state({ data: undefined, isPending: true }),
        );
        render(<CvManagementPage />);
        expect(screen.getByLabelText('Đang tải danh sách CV')).toBeVisible();
    });

    it('renders the empty state', () => {
        mocks.useCvs.mockReturnValue(
            state({
                data: {
                    items: [],
                    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
                },
            }),
        );
        render(<CvManagementPage />);
        expect(screen.getByText('Bạn chưa có CV nào')).toBeVisible();
    });

    it('renders the decorative CV illustration without an accessible name', () => {
        const { container } = render(<CvManagementPage />);
        const illustration = container.querySelector(
            'img[src*="cv-header-illustration.png"]',
        );
        expect(illustration).not.toBeNull();
        expect(illustration).toHaveAttribute('alt', '');
        expect(illustration?.parentElement).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });

    it('derives status counts and filters the real collection', async () => {
        const processing = {
            ...item,
            id: 'cv-2',
            name: 'CV Fullstack',
            processingStatus: 'PROCESSING' as const,
            isDefault: false,
        };
        const failed = {
            ...item,
            id: 'cv-3',
            name: 'CV Data',
            processingStatus: 'FAILED' as const,
            isDefault: false,
        };
        mocks.useCvs.mockImplementation((params: CvListParams = {}) => {
            const allItems = [item, processing, failed];
            const items = params.status
                ? allItems.filter((cv) => cv.processingStatus === params.status)
                : allItems;
            return state({
                data: {
                    items,
                    counts: {
                        ALL: 3,
                        READY: 1,
                        PROCESSING: 1,
                        FAILED: 1,
                    },
                    pagination: {
                        page: 1,
                        limit: 8,
                        total: items.length,
                        totalPages: 1,
                    },
                },
            });
        });
        render(<CvManagementPage />);

        expect(
            screen.getByRole('button', { name: 'Tất cả (3)' }),
        ).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Sẵn sàng (1)' }),
        ).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Đang xử lý (1)' }),
        ).toBeVisible();
        expect(
            screen.getByRole('button', { name: 'Thất bại (1)' }),
        ).toBeVisible();

        await userEvent.click(
            screen.getByRole('button', { name: 'Đang xử lý (1)' }),
        );
        expect(screen.getByText(/CV Fullstack · PROCESSING/)).toBeVisible();
        expect(
            screen.queryByText(/CV Frontend · READY/),
        ).not.toBeInTheDocument();
    });

    it('searches by CV name and opens upload from the grid card', async () => {
        const failed = {
            ...item,
            id: 'cv-3',
            name: 'CV Data',
            originalFilename: 'data-engineer.pdf',
            processingStatus: 'FAILED' as const,
            isDefault: false,
        };
        mocks.useCvs.mockImplementation((params: CvListParams = {}) => {
            const allItems = [item, failed];
            const normalizedSearch = params.search?.toLowerCase() ?? '';
            const items = normalizedSearch
                ? allItems.filter(
                      (cv) =>
                          cv.name.toLowerCase().includes(normalizedSearch) ||
                          cv.originalFilename
                              .toLowerCase()
                              .includes(normalizedSearch),
                  )
                : allItems;
            return state({
                data: {
                    items,
                    counts: {
                        ALL: 2,
                        READY: 1,
                        PROCESSING: 0,
                        FAILED: 1,
                    },
                    pagination: {
                        page: 1,
                        limit: 8,
                        total: items.length,
                        totalPages: 1,
                    },
                },
            });
        });
        render(<CvManagementPage />);

        await userEvent.type(
            screen.getByRole('textbox', { name: 'Tìm kiếm CV theo tên' }),
            'data',
        );
        await waitFor(() => {
            expect(screen.getByText(/CV Data · FAILED/)).toBeVisible();
            expect(
                screen.queryByText(/CV Frontend · READY/),
            ).not.toBeInTheDocument();
        });

        await userEvent.click(
            screen.getByRole('button', { name: /Tải lên CV mới/ }),
        );
        expect(screen.getByText('Dialog tải CV')).toBeVisible();
    });

    it('opens the version upload dialog from a failed CV', async () => {
        const failed = {
            ...item,
            id: 'cv-failed',
            name: 'CV lỗi',
            processingStatus: 'FAILED' as const,
            isDefault: false,
        };
        mocks.useCvs.mockReturnValue(
            state({
                data: {
                    items: [failed],
                    counts: {
                        ALL: 1,
                        READY: 0,
                        PROCESSING: 0,
                        FAILED: 1,
                    },
                    pagination: {
                        page: 1,
                        limit: 8,
                        total: 1,
                        totalPages: 1,
                    },
                },
            }),
        );

        render(<CvManagementPage />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Tải lại tệp' }),
        );

        expect(screen.getByText('Retry CV lỗi')).toBeVisible();
    });

    it('renders a safe error and retries', async () => {
        mocks.useCvs.mockReturnValue(
            state({
                data: undefined,
                isError: true,
                error: new ApiError('Không thể kết nối', 'NETWORK', 0),
            }),
        );
        render(<CvManagementPage />);
        await userEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
        expect(mocks.refetch).toHaveBeenCalledOnce();
    });
});
