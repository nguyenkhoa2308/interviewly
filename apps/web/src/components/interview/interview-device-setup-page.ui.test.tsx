import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InterviewDeviceSetupPage } from './interview-device-setup-page';

const replace = vi.fn();
const start = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/hooks/interview/use-interviews', () => ({
    useInterview: () => ({
        isPending: false,
        data: {
            id: 'interview-1',
            status: 'READY',
            targetRole: 'Frontend Developer',
        },
    }),
    useStartInterview: () => ({ mutateAsync: start, isPending: false }),
}));
vi.mock('@/hooks/settings/use-settings', () => ({
    useSettings: () => ({
        data: {
            voiceAndAudio: { speechSpeed: 1, volume: 1, voiceName: null },
        },
    }),
}));

describe('InterviewDeviceSetupPage', () => {
    beforeEach(() => {
        replace.mockReset();
        start.mockReset().mockResolvedValue({});
        sessionStorage.clear();
    });

    it('keeps text fallback available without passing voice checks', async () => {
        const user = userEvent.setup();
        render(<InterviewDeviceSetupPage id="interview-1" />);

        expect(
            screen.getByRole('button', { name: /vào phòng bằng giọng nói/i }),
        ).toBeDisabled();
        await user.click(screen.getByRole('button', { name: /dùng văn bản/i }));

        await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
        expect(replace).toHaveBeenCalledWith('/interviews/interview-1/session');
    });
});
