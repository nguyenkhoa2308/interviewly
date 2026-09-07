'use client';

import axios from 'axios';
import { ArrowLeft, Clock3, Mail, RotateCw, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useForgotPassword } from '@/hooks/auth/use-auth-mutations';
import {
    PASSWORD_RECOVERY_CHANNEL,
    PASSWORD_RESET_SUCCESS,
    type PasswordResetSuccessMessage,
} from '@/lib/password-recovery-channel';

export function CheckEmailContent() {
    const router = useRouter();
    const email = useSearchParams().get('email')?.trim() || '';
    const [resendCountdown, setResendCountdown] = useState(60);
    const { mutate, isPending } = useForgotPassword();

    useEffect(() => {
        if (!('BroadcastChannel' in window)) return;

        const channel = new BroadcastChannel(PASSWORD_RECOVERY_CHANNEL);
        channel.onmessage = (
            event: MessageEvent<PasswordResetSuccessMessage>,
        ) => {
            if (event.data?.type === PASSWORD_RESET_SUCCESS) {
                router.replace('/reset-password/success');
            }
        };

        return () => channel.close();
    }, [router]);

    useEffect(() => {
        if (resendCountdown <= 0) return;

        const timer = window.setInterval(
            () => setResendCountdown((value) => Math.max(0, value - 1)),
            1000,
        );

        return () => window.clearInterval(timer);
    }, [resendCountdown]);
    const resend = () => {
        if (!email || isPending || resendCountdown > 0) return;
        mutate(
            { email },
            {
                onSuccess: () => {
                    setResendCountdown(60);
                    toast.success('Đã gửi lại hướng dẫn', {
                        description:
                            'Nếu tài khoản tồn tại, vui lòng kiểm tra hộp thư của bạn.',
                    });
                },
                onError: (error) => {
                    const message = axios.isAxiosError(error)
                        ? error.response?.data?.error?.message
                        : undefined;
                    toast.error('Không thể gửi lại', {
                        description:
                            message ||
                            'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
                    });
                },
            },
        );
    };

    return (
        <div className="w-full max-w-[1600px] text-center">
            <div className="relative mx-auto mb-8 h-64 w-100">
                <Image
                    src="/images/auth/check-email.png"
                    alt="Kiểm tra email"
                    fill
                    className="object-contain"
                    priority
                />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Kiểm tra email của bạn
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-7 font-semibold">
                Nếu tài khoản tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật
                khẩu
                {email ? (
                    <>
                        {' '}
                        đến: <br />
                        <span className="bg-primary/8 text-primary mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold">
                            <Mail className="size-5 stroke-2" />
                            {email}
                        </span>
                    </>
                ) : null}
            </p>
            <p className="text-muted-foreground mx-auto mt-5 max-w-lg leading-7 font-medium">
                Nhấp vào liên kết trong email để tạo mật khẩu mới và quay lại
                tài khoản của bạn.
            </p>
            {/* <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm font-medium">
                Liên kết có thể mở trong tab mới. Sau khi hoàn tất, trạng thái
                tại đây sẽ tự cập nhật.
            </p> */}
            <div className="mx-auto mt-7 max-w-xl rounded-xl border border-violet-100 bg-violet-50/55 px-5 py-1 text-left shadow-[0_8px_24px_rgba(109,40,217,0.04)] sm:px-6">
                <div className="flex items-center gap-4 border-b border-violet-100/90 py-4">
                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                        <Clock3 className="size-6" strokeWidth={2} />
                    </span>
                    <p className="text-muted-foreground text-sm leading-6 font-semibold">
                        Liên kết sẽ hết hạn sau{' '}
                        <span className="text-primary font-bold">30 phút</span>
                        <br className="hidden sm:block" /> vì lý do bảo mật.
                    </p>
                </div>
                <div className="flex items-center gap-4 py-4">
                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
                        <ShieldCheck className="size-6" strokeWidth={2} />
                    </span>
                    <p className="text-muted-foreground text-sm leading-6 font-semibold">
                        Nếu bạn không yêu cầu đặt lại mật khẩu,
                        <br className="hidden sm:block" /> hãy bỏ qua email này.
                    </p>
                </div>
            </div>
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-6">
                <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-lg px-5"
                >
                    <Link href="/sign-in" className="!font-bold">
                        <ArrowLeft className="size-5" />
                        Quay lại đăng nhập
                    </Link>
                </Button>
                {email && (
                    <button
                        type="button"
                        className="text-primary inline-flex cursor-pointer items-center gap-2 text-[15px] font-bold transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={isPending || resendCountdown > 0}
                        onClick={resend}
                    >
                        <RotateCw
                            className={
                                isPending ? 'size-5 animate-spin' : 'size-5'
                            }
                        />
                        <span className="mt-0.5">
                            {isPending ? 'Đang gửi...' : 'Gửi lại email'}
                            {resendCountdown > 0 && (
                                <span className="text-muted-foreground ml-1 font-semibold">
                                    ({resendCountdown}s)
                                </span>
                            )}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}
