import { Suspense } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { VerifyEmailSidebar } from '@/components/auth/verify-email-sidebar';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';

export default function VerifyEmailPage() {
    return (
        <AuthShell
            sidebar={
                <Suspense fallback={<div className="p-10">Đang tải...</div>}>
                    <VerifyEmailSidebar />
                </Suspense>
            }
        >
            <div className="bg-card flex h-full w-full flex-col items-center justify-center rounded-2xl px-8 py-12 shadow-2xl sm:px-14 sm:py-16 lg:block lg:h-auto lg:max-w-xl">
                <Suspense fallback={<div className="p-8">Đang tải...</div>}>
                    <VerifyEmailForm />
                </Suspense>
            </div>
        </AuthShell>
    );
}
