'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function GoogleCallbackPage() {
    return (
        <Suspense fallback={<GoogleCallbackLoading />}>
            <GoogleCallbackHandler />
        </Suspense>
    );
}

function GoogleCallbackHandler() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    useEffect(() => {
        if (!window.opener) return;

        if (error) {
            window.opener.postMessage(
                {
                    type: 'GOOGLE_AUTH_ERROR',
                    error,
                },
                window.location.origin,
            );
        } else {
            window.opener.postMessage(
                {
                    type: 'GOOGLE_AUTH_SUCCESS',
                },
                window.location.origin,
            );
        }

        window.close();
    }, [error]);

    return <GoogleCallbackLoading />;
}

function GoogleCallbackLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />

                <p className="text-muted-foreground mt-4 text-sm font-medium">
                    Đang hoàn tất đăng nhập...
                </p>
            </div>
        </div>
    );
}
