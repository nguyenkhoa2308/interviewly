import { PasswordRecoveryShell } from '@/components/auth/password-recovery-shell';
import { ResetLinkStatus } from '@/components/auth/reset-link-status';

export default function ResetPasswordUnavailablePage() {
    return (
        <PasswordRecoveryShell stage="unavailable">
            <ResetLinkStatus variant="unavailable" />
        </PasswordRecoveryShell>
    );
}
