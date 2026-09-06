'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

interface GoogleAuthButtonProps {
    onSuccess?: () => void | Promise<void>;
}

export function GoogleAuthButton({ onSuccess }: GoogleAuthButtonProps) {
    const popupRef = useRef<Window | null>(null);
    const popupTimerRef = useRef<number | null>(null);
    const hasHandledResultRef = useRef(false);
    const onSuccessRef = useRef(onSuccess);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    useEffect(() => {
        const clearPopupTimer = () => {
            if (popupTimerRef.current !== null) {
                window.clearInterval(popupTimerRef.current);
                popupTimerRef.current = null;
            }
        };

        const handleMessage = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
                if (hasHandledResultRef.current) return;

                hasHandledResultRef.current = true;
                popupRef.current = null;
                clearPopupTimer();

                try {
                    await onSuccessRef.current?.();
                } finally {
                    setIsLoading(false);
                }

                return;
            }

            if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
                if (hasHandledResultRef.current) return;

                hasHandledResultRef.current = true;
                popupRef.current = null;
                setIsLoading(false);
                clearPopupTimer();

                switch (event.data.error) {
                    case 'GOOGLE_AUTH_CANCELLED':
                        toast.info('Đăng nhập Google đã bị hủy');
                        break;

                    case 'ACCOUNT_INACTIVE':
                        toast.error('Tài khoản không thể đăng nhập', {
                            description:
                                'Tài khoản của bạn hiện đang bị vô hiệu hóa.',
                        });
                        break;

                    default:
                        toast.error('Đăng nhập Google thất bại', {
                            description:
                                'Không thể đăng nhập bằng Google. Vui lòng thử lại.',
                        });
                }

                return;
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearPopupTimer();
        };
    }, []);

    const handleGoogleAuth = () => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        if (!apiUrl) return;

        hasHandledResultRef.current = false;

        const width = 500;
        const height = 650;

        const left = window.screenX + (window.outerWidth - width) / 2;

        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            `${apiUrl}/auth/google`,
            'interviewly-google-auth',
            `width=${width},height=${height},left=${left},top=${top}`,
        );

        if (!popup) {
            toast.error('Không thể mở cửa sổ Google');
            return;
        }

        popupRef.current = popup;
        setIsLoading(true);

        popupTimerRef.current = window.setInterval(() => {
            if (popup.closed) {
                if (popupTimerRef.current !== null) {
                    window.clearInterval(popupTimerRef.current);
                    popupTimerRef.current = null;
                }
                popupRef.current = null;
                setIsLoading(false);
            }
        }, 500);

        popup.focus();
    };
    return (
        <Button
            type="button"
            variant="outline"
            className="w-full gap-2 !rounded-md bg-white font-bold"
            size="lg"
            disabled={isLoading}
            onClick={handleGoogleAuth}
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang kết nối...
                </>
            ) : (
                <>
                    <GoogleIcon />
                    Tiếp tục với Google
                </>
            )}
        </Button>
    );
}

function GoogleIcon() {
    return (
        <svg viewBox="0 0 24 24" className="!h-6 !w-6" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.509h3.232c1.891-1.741 2.981-4.304 2.981-7.35Z"
            />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 4.964-.895 6.619-2.423l-3.232-2.509c-.895.6-2.041.955-3.387.955-2.605 0-4.809-1.759-5.596-4.123H3.064v2.591A10 10 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC05"
                d="M6.404 13.9A6.02 6.02 0 0 1 6.09 12c0-.659.113-1.3.314-1.9V7.509h-3.34A10 10 0 0 0 2 12c0 1.614.386 3.141 1.064 4.491L6.404 13.9Z"
            />
            <path
                fill="#EA4335"
                d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.959 2.991 14.696 2 12 2a10 10 0 0 0-8.936 5.509L6.404 10.1C7.191 7.736 9.395 5.977 12 5.977Z"
            />
        </svg>
    );
}
