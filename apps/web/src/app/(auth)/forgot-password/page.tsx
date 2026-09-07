import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { PasswordRecoveryShell } from '@/components/auth/password-recovery-shell';

export default function ForgotPasswordPage() {
    return (
        <PasswordRecoveryShell stage="request">
            <ForgotPasswordForm />
        </PasswordRecoveryShell>
    );
}
