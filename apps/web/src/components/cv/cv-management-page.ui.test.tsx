import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CvManagementPage, sortCvs } from './cv-management-page';
import { ApiError } from '@/lib/api-error';
import type { CvListItem } from '@/types/cv';

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
    CvCard: ({ cv }: { cv: CvListItem }) => (
        <article>
            {cv.name} · {cv.processingStatus}
        </article>
    ),
}));
vi.mock('@/components/cv/cv-dialogs', () => ({
    UploadCvDialog: ({ open }: { open: boolean }) =>
        open ? <div>Dialog tải CV</div> : null,
    RenameCvDialog: () => null,
    DeleteCvDialog: () => null,
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
        mocks.useCvs.mockReturnValue(
            state({
                data: {
                    items: [item, processing, failed],
                    pagination: {
                        page: 1,
                        limit: 3,
                        total: 3,
                        totalPages: 1,
                    },
                },
            }),
        );
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
        mocks.useCvs.mockReturnValue(
            state({
                data: {
                    items: [item, failed],
                    pagination: {
                        page: 1,
                        limit: 2,
                        total: 2,
                        totalPages: 1,
                    },
                },
            }),
        );
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

    it('sorts the collection by name', () => {
        const cvA = {
            ...item,
            id: 'cv-a',
            name: 'CV Alpha',
            isDefault: false,
        };
        const cvZ = {
            ...item,
            id: 'cv-z',
            name: 'CV Zeta',
            isDefault: false,
        };
        expect(sortCvs([cvZ, cvA], 'NAME_ASC').map((cv) => cv.name)).toEqual([
            'CV Alpha',
            'CV Zeta',
        ]);
    });

    it('always keeps the default CV first before applying the selected sort', () => {
        const newest = {
            ...item,
            id: 'cv-new',
            name: 'CV mới',
            isDefault: false,
            createdAt: '2026-09-20T00:00:00.000Z',
        };
        const defaultCv = {
            ...item,
            id: 'cv-default',
            name: 'CV mặc định',
            createdAt: '2026-09-01T00:00:00.000Z',
        };

        expect(sortCvs([newest, defaultCv], 'NEWEST')[0]?.id).toBe(
            'cv-default',
        );
        expect(sortCvs([newest, defaultCv], 'OLDEST')[0]?.id).toBe(
            'cv-default',
        );
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
