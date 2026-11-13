import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Sparkles } from 'lucide-react';

import { DataState, EmptyDataState } from './data-state';

describe('DataState', () => {
    it('provides one canonical preset for true empty states', () => {
        render(
            <EmptyDataState
                title="ChÆ°a cÃ³ dá»¯ liá»‡u"
                description="HÃ£y táº¡o ná»™i dung Ä‘áº§u tiÃªn."
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'ChÆ°a cÃ³ dá»¯ liá»‡u',
        );
    });

    it('renders an accessible empty state with its default illustration', () => {
        render(
            <DataState
                variant="empty"
                title="Chưa có dữ liệu"
                description="Hãy tạo nội dung đầu tiên để bắt đầu."
                illustrationTestId="empty-illustration"
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent('Chưa có dữ liệu');
        expect(screen.getByTestId('empty-illustration')).toHaveAttribute(
            'src',
            expect.stringContaining('cv-empty-state.png'),
        );
    });

    it('renders no-results copy and a custom illustration hook', () => {
        render(
            <DataState
                variant="no-results"
                title="Không tìm thấy kết quả"
                description="Hãy thử điều chỉnh bộ lọc."
                illustrationTestId="no-results-illustration"
            />,
        );

        expect(screen.getByRole('status')).toHaveTextContent(
            'Không tìm thấy kết quả',
        );
        expect(screen.getByTestId('no-results-illustration')).toHaveAttribute(
            'src',
            expect.stringContaining('cv-no-results.png'),
        );
    });

    it('renders feature-specific benefits in the shared empty layout', () => {
        render(
            <DataState
                variant="empty"
                title="Chưa có dữ liệu"
                description="Hãy tạo nội dung đầu tiên."
                benefits={[
                    {
                        icon: Sparkles,
                        title: 'Phân tích bằng AI',
                        description: 'Nhận gợi ý cải thiện',
                    },
                ]}
            />,
        );

        expect(screen.getByLabelText('Lợi ích')).toHaveTextContent(
            'Phân tích bằng AI',
        );
        expect(screen.getByText('Nhận gợi ý cải thiện')).toBeInTheDocument();
    });

    it('announces errors assertively and runs the retry action', async () => {
        const onRetry = vi.fn();

        render(
            <DataState
                variant="error"
                title="Không thể tải dữ liệu"
                description="Vui lòng thử lại."
                action={<button onClick={onRetry}>Thử lại</button>}
            />,
        );

        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
        await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
        expect(onRetry).toHaveBeenCalledOnce();
    });
});
