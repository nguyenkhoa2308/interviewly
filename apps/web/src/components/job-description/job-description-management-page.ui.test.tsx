import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JobDescriptionManagementPage } from './job-description-management-page';

const mocks = vi.hoisted(() => ({
    useList: vi.fn(),
    remove: vi.fn(),
    create: vi.fn(),
    refetch: vi.fn(),
    push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/hooks/job-description', () => ({
    useJobDescriptions: mocks.useList,
    useDeleteJobDescription: () => ({
        mutateAsync: mocks.remove,
        isPending: false,
    }),
    useCreateJobDescription: () => ({
        mutateAsync: mocks.create,
        isPending: false,
    }),
}));

const analyzedItem = {
    id: 'jd-1',
    title: 'Frontend Developer',
    company: 'Interviewly',
    content: 'Xây dựng sản phẩm web hiện đại cùng đội ngũ Interviewly.',
    createdAt: '2026-09-23T00:00:00.000Z',
    updatedAt: '2026-09-23T00:00:00.000Z',
    analyses: [
        {
            id: 'a-1',
            status: 'COMPLETED',
            detectedRole: 'Frontend Developer',
            seniority: 'Junior',
            completedAt: '2026-09-23T00:00:00.000Z',
        },
    ],
};

const plainItem = {
    ...analyzedItem,
    id: 'jd-2',
    title: 'Backend Developer',
    company: null,
    analyses: [],
};

function state(overrides = {}) {
    return {
        data: {
            items: [analyzedItem, plainItem],
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        },
        isPending: false,
        isFetching: false,
        isError: false,
        refetch: mocks.refetch,
        ...overrides,
    };
}

describe('JobDescriptionManagementPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.useList.mockReturnValue(state());
        mocks.remove.mockResolvedValue({ id: 'jd-1', deleted: true });
        mocks.create.mockResolvedValue({ id: 'jd-new' });
    });

    it('renders the Vietnamese hero and actual statuses', () => {
        render(<JobDescriptionManagementPage />);

        expect(
            screen.getByRole('heading', { name: 'Mô tả công việc' }),
        ).toBeVisible();
        expect(
            screen.getAllByRole('button', { name: 'Thêm mô tả công việc' }),
        ).toHaveLength(1);
        expect(
            screen.getByRole('link', { name: 'Mở Frontend Developer' }),
        ).toHaveAttribute('href', '/job-descriptions/jd-1');
        expect(screen.getAllByText('Đã phân tích')).toHaveLength(3);
        expect(screen.getAllByText('Chưa phân tích')).toHaveLength(3);
        expect(
            screen.queryByRole('navigation', {
                name: 'Phân trang mô tả công việc',
            }),
        ).not.toBeInTheDocument();
    });

    it('creates a JD in the dialog and navigates to its detail', async () => {
        render(<JobDescriptionManagementPage />);

        await userEvent.click(
            screen.getAllByRole('button', { name: 'Thêm mô tả công việc' })[0],
        );
        await userEvent.type(
            screen.getByLabelText(/Vị trí tuyển dụng/),
            'Backend Developer',
        );
        await userEvent.type(screen.getByLabelText('Công ty'), 'Interviewly');
        await userEvent.type(
            screen.getByLabelText(/Nội dung JD/),
            'Tuyển Backend Developer có kinh nghiệm với NestJS, PostgreSQL và thiết kế REST API an toàn.',
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Lưu mô tả công việc' }),
        );

        await waitFor(() =>
            expect(mocks.create).toHaveBeenCalledWith({
                title: 'Backend Developer',
                company: 'Interviewly',
                content:
                    'Tuyển Backend Developer có kinh nghiệm với NestJS, PostgreSQL và thiết kế REST API an toàn.',
            }),
        );
        expect(mocks.push).toHaveBeenCalledWith('/job-descriptions/jd-new');
    });

    it('debounces search and sends real pagination parameters', async () => {
        render(<JobDescriptionManagementPage />);

        await userEvent.type(
            screen.getByRole('searchbox', {
                name: 'Tìm kiếm mô tả công việc',
            }),
            'React',
        );
        await waitFor(
            () =>
                expect(mocks.useList).toHaveBeenLastCalledWith({
                    search: 'React',
                    page: 1,
                    limit: 20,
                    status: 'ALL',
                    sort: 'RECENTLY_UPDATED',
                }),
            { timeout: 1000 },
        );
    });

    it('moves to the next server page', async () => {
        mocks.useList.mockReturnValue(
            state({
                data: {
                    items: [analyzedItem],
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 21,
                        totalPages: 2,
                    },
                },
            }),
        );
        render(<JobDescriptionManagementPage />);

        await userEvent.click(screen.getByRole('button', { name: 'Sau' }));
        expect(mocks.useList).toHaveBeenLastCalledWith({
            search: undefined,
            page: 2,
            limit: 20,
            status: 'ALL',
            sort: 'RECENTLY_UPDATED',
        });
    });

    it('sends status filters to the list API', async () => {
        render(<JobDescriptionManagementPage />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Đã phân tích' }),
        );
        expect(mocks.useList).toHaveBeenLastCalledWith({
            search: undefined,
            page: 1,
            limit: 20,
            status: 'ANALYZED',
            sort: 'RECENTLY_UPDATED',
        });
    });

    it('deletes through overflow menu and confirmation', async () => {
        render(<JobDescriptionManagementPage />);

        await userEvent.click(
            screen.getByRole('button', {
                name: 'Mở thao tác cho Frontend Developer',
            }),
        );
        await userEvent.click(screen.getByRole('menuitem', { name: 'Xóa JD' }));
        await userEvent.click(screen.getByRole('button', { name: 'Xóa JD' }));
        await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('jd-1'));
    });

    it('renders loading, empty and error states', async () => {
        mocks.useList.mockReturnValue(
            state({ data: undefined, isPending: true }),
        );
        const { rerender } = render(<JobDescriptionManagementPage />);
        expect(screen.getByLabelText('Đang tải danh sách JD')).toBeVisible();

        mocks.useList.mockReturnValue(
            state({
                data: {
                    items: [],
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        totalPages: 0,
                    },
                },
            }),
        );
        rerender(<JobDescriptionManagementPage />);
        expect(screen.getByText('Chưa có mô tả công việc nào')).toBeVisible();

        mocks.useList.mockReturnValue(
            state({ data: undefined, isError: true, isPending: false }),
        );
        rerender(<JobDescriptionManagementPage />);
        await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
        expect(mocks.refetch).toHaveBeenCalledOnce();
    });
});
