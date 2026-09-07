'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
    PasswordRecoverySidebar,
    type RecoveryStage,
} from '@/components/auth/password-recovery-sidebar';
import {
    PASSWORD_RECOVERY_CHANNEL,
    PASSWORD_RESET_SUCCESS,
    type PasswordResetSuccessMessage,
} from '@/lib/password-recovery-channel';

export function PasswordRecoveryShell({
    stage,
    children,
}: {
    stage: RecoveryStage;
    children: React.ReactNode;
}) {
    const [effectiveStage, setEffectiveStage] = useState(stage);

    useEffect(() => {
        if (stage !== 'email-sent' || !('BroadcastChannel' in window)) {
            return;
        }

        const channel = new BroadcastChannel(PASSWORD_RECOVERY_CHANNEL);
        channel.onmessage = (
            event: MessageEvent<PasswordResetSuccessMessage>,
        ) => {
            if (event.data?.type === PASSWORD_RESET_SUCCESS) {
                setEffectiveStage('done');
            }
        };

        return () => channel.close();
    }, [stage]);

    return (
        <main className="grid min-h-[100dvh] w-full overflow-hidden bg-white lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
            <PasswordRecoverySidebar stage={effectiveStage} />
            <section className="relative flex min-w-0 flex-col px-5 py-6 sm:px-10 lg:px-14 lg:py-9 xl:px-20">
                {effectiveStage !== 'done' &&
                    effectiveStage !== 'expired' &&
                    effectiveStage !== 'unavailable' && (
                        <div className="flex min-h-8 items-center justify-end gap-3 text-sm font-semibold">
                            <div className="flex items-center gap-3">
                                <span className="text-muted-foreground hidden sm:inline">
                                    Bạn đã nhớ mật khẩu?
                                </span>
                                <Link
                                    href="/sign-in"
                                    className="text-primary hover:text-primary/75 font-bold transition-colors"
                                >
                                    Quay lại đăng nhập
                                </Link>
                            </div>
                        </div>
                    )}
                <div className="flex flex-1 items-center justify-center py-8">
                    {children}
                </div>
            </section>
        </main>
    );
}
