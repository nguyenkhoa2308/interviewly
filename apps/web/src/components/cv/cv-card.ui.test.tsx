import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CvCard } from './cv-card';
import type { CvListItem, CvProcessingStatus } from '@/types/cv';

vi.mock('@/components/cv/cv-actions-menu', () => ({
    CvActionsMenu: () => <button>Thao tác CV</button>,
}));

const baseCv: CvListItem = {
    id: 'cv-1',
    name: 'CV Backend',
    originalFilename: 'backend.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    processingStatus: 'READY',
    isDefault: true,
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
};

function renderCard(cv: CvListItem = baseCv) {
    const onRetryUpload = vi.fn();
    render(
        <CvCard
            cv={cv}
            actionPending={false}
            onRename={vi.fn()}
            onSetDefault={vi.fn()}
            onDelete={vi.fn()}
            onRetryUpload={onRetryUpload}
        />,
    );
    return { onRetryUpload };
}

describe('CvCard', () => {
    it('renders identity, default state and primary view link', () => {
        renderCard();
        expect(screen.getByText(baseCv.name)).toBeVisible();
        expect(screen.getByText('Mặc định')).toBeVisible();
        expect(
            screen.getByRole('link', { name: /Xem chi tiết/ }),
        ).toHaveAttribute('href', '/cv/cv-1');
    });

    it.each([
        ['UPLOADING', 'Đang tải lên'],
        ['PROCESSING', 'Đang xử lý'],
        ['READY', 'Sẵn sàng'],
        ['FAILED', 'Xử lý thất bại'],
    ] as const)('renders textual %s status', (status, label) => {
        renderCard({
            ...baseCv,
            processingStatus: status as CvProcessingStatus,
        });
        expect(screen.getByText(label)).toBeVisible();
    });

    it('does not render the default badge for a non-default CV', () => {
        renderCard({ ...baseCv, isDefault: false });
        expect(screen.queryByText('Mặc định')).not.toBeInTheDocument();
    });

    it('offers file re-upload for a failed CV', async () => {
        const failedCv = {
            ...baseCv,
            processingStatus: 'FAILED' as const,
        };
        const { onRetryUpload } = renderCard(failedCv);

        await userEvent.click(
            screen.getByRole('button', { name: 'Tải lại tệp' }),
        );

        expect(onRetryUpload).toHaveBeenCalledWith(failedCv);
        expect(screen.queryByText('Xem chi tiết')).not.toBeInTheDocument();
    });
});
