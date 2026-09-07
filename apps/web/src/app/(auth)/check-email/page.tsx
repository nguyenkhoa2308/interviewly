import { Suspense } from 'react';

import { CheckEmailContent } from '@/components/auth/check-email-content';
import { PasswordRecoveryShell } from '@/components/auth/password-recovery-shell';

export default function CheckEmailPage() {
    return (
        <PasswordRecoveryShell stage="email-sent">
            <Suspense
                fallback={
                    <p className="w-full text-center font-semibold">
                        Đang tải...
                    </p>
                }
            >
                <CheckEmailContent />
            </Suspense>
        </PasswordRecoveryShell>
    );
}
