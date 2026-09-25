import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { CvJdMatchSetupPage } from './cv-jd-match-setup-page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/cv-jd-match/use-cv-jd-matches', () => ({
    useMatchOptions: () => ({ isPending: false, isError: false, data: { cvs: [{ id: 'cv', name: 'Frontend CV', originalFilename: 'cv.pdf', isDefault: true, updatedAt: '2026-09-20T00:00:00.000Z', eligible: true, reason: null }, { id: 'bad', name: 'CV chưa phân tích', originalFilename: 'bad.pdf', isDefault: false, updatedAt: '2026-09-19T00:00:00.000Z', eligible: false, reason: 'Cần phân tích CV trước.' }], jobDescriptions: [{ id: 'jd', title: 'Frontend Developer', company: 'Interviewly', updatedAt: '2026-09-18T00:00:00.000Z', eligible: true, reason: null }] } }),
    useCvJdMatches: () => ({ isPending: false, data: { items: [], pagination: { page: 1, limit: 6, total: 0, totalPages: 0 } } }),
    useCreateCvJdMatch: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

describe('CvJdMatchSetupPage', () => {
    it('renders real selectable sources and explains ineligible sources', () => {
        render(<QueryClientProvider client={new QueryClient()}><CvJdMatchSetupPage /></QueryClientProvider>);
        expect(screen.getByText('Frontend CV')).toBeInTheDocument();
        expect(screen.getByText('Chọn mô tả công việc')).toBeInTheDocument();
        expect(screen.getByText('CV đã được phân tích')).toBeInTheDocument();
    });
    it('explains score is not hiring probability', () => {
        render(<QueryClientProvider client={new QueryClient()}><CvJdMatchSetupPage /></QueryClientProvider>);
        expect(screen.getByText(/không phải xác suất được tuyển/i)).toBeInTheDocument();
    });
});