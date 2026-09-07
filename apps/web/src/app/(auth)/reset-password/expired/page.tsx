import { PasswordRecoveryShell } from '@/components/auth/password-recovery-shell';
import { ResetLinkStatus } from '@/components/auth/reset-link-status';

export default function ResetPasswordExpiredPage() {
    return (
        <PasswordRecoveryShell stage="expired">
            <ResetLinkStatus variant="expired" />
        </PasswordRecoveryShell>
    );
}
