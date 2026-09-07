import { Suspense } from 'react';

import { PasswordRecoveryShell } from '@/components/auth/password-recovery-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage() {
    return (
        <PasswordRecoveryShell stage="reset">
            <Suspense
                fallback={
                    <p className="w-full text-center font-semibold">
                        Đang kiểm tra liên kết...
                    </p>
                }
            >
                <ResetPasswordForm />
            </Suspense>
        </PasswordRecoveryShell>
    );
}
