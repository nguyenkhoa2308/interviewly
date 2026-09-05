'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RotateCw, ArrowLeft, Mail } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { useVerifyEmail } from '@/hooks/auth/use-verify-email';
import { useResendVerification } from '@/hooks/auth/use-resend-verification';

// Hạn sử dụng mã OTP (10 phút) & thời gian chờ gửi lại (60s)
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function VerifyEmailForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const [otp, setOtp] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    const [expireTarget, setExpireTarget] = useState<number>(0);
    const [resendTarget, setResendTarget] = useState<number>(0);

    const [expireSeconds, setExpireSeconds] = useState(10 * 60);
    const [resendCountdown, setResendCountdown] = useState(60);

    const { mutate: verifyMutate, isPending: isVerifying } = useVerifyEmail();
    const { mutate: resendMutate, isPending: isResending } =
        useResendVerification();

    // 1. Khởi tạo mốc thời gian sau khi component mount trên client (tránh Hydration mismatch)
    useEffect(() => {
        setIsMounted(true);

        const now = Date.now();
        let targetExpire = now + OTP_EXPIRY_MS;
        let targetResend = now + RESEND_COOLDOWN_MS;

        if (email) {
            const savedExpire = sessionStorage.getItem(`otp_expire_${email}`);
            if (savedExpire) {
                targetExpire = Number(savedExpire);
            } else {
                sessionStorage.setItem(`otp_expire_${email}`, targetExpire.toString());
            }

            const savedResend = sessionStorage.getItem(`otp_resend_${email}`);
            if (savedResend) {
                targetResend = Number(savedResend);
            } else {
                sessionStorage.setItem(`otp_resend_${email}`, targetResend.toString());
            }
        }

        setExpireTarget(targetExpire);
        setResendTarget(targetResend);

        const update = () => {
            const current = Date.now();
            setExpireSeconds(Math.max(0, Math.floor((targetExpire - current) / 1000)));
            setResendCountdown(Math.max(0, Math.floor((targetResend - current) / 1000)));
        };

        update();
        const timer = setInterval(update, 1000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                update();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [email]);

    // 2. Đồng bộ khi expireTarget hoặc resendTarget được cập nhật mới (ví dụ khi bấm Gửi lại mã)
    useEffect(() => {
        if (!isMounted || !expireTarget || !resendTarget) return;

        const update = () => {
            const current = Date.now();
            setExpireSeconds(Math.max(0, Math.floor((expireTarget - current) / 1000)));
            setResendCountdown(Math.max(0, Math.floor((resendTarget - current) / 1000)));
        };

        update();
        const timer = setInterval(update, 1000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                update();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isMounted, expireTarget, resendTarget]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleVerify = () => {
        if (!email) {
            toast.error('Lỗi thông tin', {
                description: 'Không tìm thấy địa chỉ email cần xác minh.',
            });
            return;
        }

        if (otp.length < 6) {
            toast.error('Mã không hợp lệ', {
                description: 'Vui lòng nhập đầy đủ 6 chữ số mã xác minh.',
            });
            return;
        }

        verifyMutate(
            { email, otp },
            {
                onSuccess: () => {
                    toast.success('Xác minh thành công!', {
                        description:
                            'Email của bạn đã được kích hoạt. Hãy đăng nhập để bắt đầu.',
                    });
                    router.replace('/sign-in');
                },
                onError: (error) => {
                    if (!axios.isAxiosError(error)) {
                        toast.error('Xác minh thất bại', {
                            description: 'Có lỗi xảy ra, vui lòng thử lại sau.',
                        });
                        return;
                    }

                    const apiError = error.response?.data?.error;

                    switch (apiError?.code) {
                        case 'INVALID_VERIFICATION_CODE':
                            toast.error('Mã xác minh không đúng', {
                                description: apiError.message,
                            });
                            setOtp('');
                            return;

                        case 'VERIFICATION_CODE_EXPIRED':
                            toast.error('Mã xác minh đã hết hạn', {
                                description: apiError.message,
                            });
                            setExpireTarget(Date.now());
                            setExpireSeconds(0);
                            if (typeof window !== 'undefined' && email) {
                                sessionStorage.setItem(`otp_expire_${email}`, Date.now().toString());
                            }
                            setOtp('');
                            return;

                        case 'VERIFICATION_ATTEMPTS_EXCEEDED':
                            toast.error('Đã nhập sai quá nhiều lần', {
                                description: apiError.message,
                            });
                            setOtp('');
                            return;

                        case 'EMAIL_ALREADY_VERIFIED':
                            toast.info('Email đã được xác minh', {
                                description:
                                    'Bạn có thể đăng nhập vào tài khoản.',
                            });
                            router.replace('/sign-in');
                            return;

                        default:
                            toast.error('Xác minh thất bại', {
                                description:
                                    apiError?.message ||
                                    'Có lỗi xảy ra, vui lòng thử lại sau.',
                            });
                    }
                },
            },
        );
    };

    const handleResend = () => {
        if (!email) {
            toast.error('Lỗi thông tin', {
                description: 'Không tìm thấy địa chỉ email.',
            });
            return;
        }

        if (resendCountdown > 0) return;

        resendMutate(
            { email },
            {
                onSuccess: () => {
                    toast.success('Đã gửi mã mới!', {
                        description:
                            'Vui lòng kiểm tra hộp thư đến của bạn để nhận mã mới.',
                    });
                    const now = Date.now();
                    const newExpire = now + OTP_EXPIRY_MS;
                    const newResend = now + RESEND_COOLDOWN_MS;

                    setExpireTarget(newExpire);
                    setResendTarget(newResend);
                    setExpireSeconds(Math.floor(OTP_EXPIRY_MS / 1000));
                    setResendCountdown(Math.floor(RESEND_COOLDOWN_MS / 1000));

                    if (typeof window !== 'undefined' && email) {
                        sessionStorage.setItem(`otp_expire_${email}`, newExpire.toString());
                        sessionStorage.setItem(`otp_resend_${email}`, newResend.toString());
                    }

                    setOtp('');
                },
                onError: (error) => {
                    if (axios.isAxiosError(error)) {
                        const apiError = error.response?.data?.error;
                        toast.error('Không thể gửi lại mã', {
                            description:
                                apiError?.message ||
                                'Vui lòng thử lại sau ít phút.',
                        });
                        return;
                    }
                    toast.error('Không thể gửi lại mã', {
                        description: 'Có lỗi xảy ra, vui lòng thử lại sau.',
                    });
                },
            },
        );
    };

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div>
                <div className="bg-primary/10 text-primary mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
                    <Mail className="h-7 w-7" />
                </div>

                <h2 className="text-3xl font-extrabold tracking-tight">
                    Xác thực email của bạn
                </h2>
                <div className="text-muted-foreground mt-2 text-sm font-semibold">
                    Nhập mã 6 chữ số chúng tôi đã gửi tới{' '}
                    <div className="text-primary font-bold">
                        {email || 'email của bạn'}
                    </div>
                </div>
            </div>

            {/* OTP Input Slots */}
            <div className="space-y-3">
                <div className="w-full">
                    <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => setOtp(value)}
                        onComplete={handleVerify}
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>

                <p className="text-muted-foreground text-sm font-semibold">
                    Mã sẽ hết hạn sau{' '}
                    <span className="text-primary font-bold">
                        {isMounted ? (
                            formatTime(expireSeconds)
                        ) : (
                            <span className="inline-block h-4 w-10 animate-pulse rounded bg-muted align-middle" />
                        )}
                    </span>
                </p>
            </div>

            {/* Button Verify */}
            <Button
                type="button"
                size="lg"
                className="shadow-primary/25 w-full text-base font-bold shadow-lg"
                disabled={otp.length < 6 || isVerifying}
                onClick={handleVerify}
            >
                {isVerifying ? 'Đang xác minh...' : 'Xác thực email'}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-4">
                <div className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-xs font-semibold whitespace-nowrap">
                    Bạn không nhận được mã?
                </span>
                <div className="bg-border h-px flex-1" />
            </div>

            {/* Resend button */}
            <div className="flex justify-center">
                {!isMounted ? (
                    <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                ) : resendCountdown > 0 ? (
                    <div className="text-primary pointer-events-none flex items-center gap-2 text-sm font-bold select-none">
                        <RotateCw className="h-4 w-4" />
                        <span>
                            Gửi lại mã sau {formatTime(resendCountdown)}
                        </span>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
                        className="text-primary hover:text-secondary-foreground flex cursor-pointer items-center gap-1.5 text-sm font-bold transition-colors"
                    >
                        <RotateCw
                            className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`}
                        />
                        <span>
                            {isResending ? 'Đang gửi lại...' : 'Gửi lại mã'}
                        </span>
                    </button>
                )}
            </div>

            {/* Back to sign in */}
            <div className="pt-2 text-center sm:text-left">
                <Link
                    href="/sign-in"
                    className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-bold transition-colors select-none"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại đăng nhập
                </Link>
            </div>
        </div>
    );
}
