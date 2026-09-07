'use client';

import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, LoaderCircle, ShieldX } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { useResetPassword } from '@/hooks/auth/use-auth-mutations';
import { useValidateResetToken } from '@/hooks/auth/use-validate-reset-token';
import {
    resetPasswordSchema,
    type ResetPasswordFormValues,
} from '@/schemas/auth.schema';
import { broadcastPasswordResetSuccess } from '@/lib/password-recovery-channel';

type ResetErrorCode =
    'INVALID_RESET_TOKEN' | 'RESET_TOKEN_EXPIRED' | 'RESET_TOKEN_USED';
interface ApiErrorResponse {
    error?: { code?: ResetErrorCode; message?: string };
}

const resetErrorCopy: Record<ResetErrorCode, string> = {
    INVALID_RESET_TOKEN:
        'Liên kết đặt lại mật khẩu không hợp lệ hoặc không còn khả dụng.',
    RESET_TOKEN_EXPIRED:
        'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới.',
    RESET_TOKEN_USED: 'Liên kết đặt lại mật khẩu này đã được sử dụng.',
};

function getResetErrorCode(error: unknown): ResetErrorCode | null {
    if (!axios.isAxiosError<ApiErrorResponse>(error)) return null;
    const code = error.response?.data?.error?.code;
    return code && code in resetErrorCopy ? code : null;
}

function getResetError(error: unknown) {
    const code = getResetErrorCode(error);
    return code ? resetErrorCopy[code] : null;
}

export function ResetPasswordForm() {
    const token = useSearchParams().get('token')?.trim() || null;
    const router = useRouter();
    const validation = useValidateResetToken(token);
    const reset = useResetPassword();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: '', confirmPassword: '' },
    });
    const validationErrorCode = validation.isError
        ? getResetErrorCode(validation.error)
        : null;

    useEffect(() => {
        if (!token) {
            router.replace('/reset-password/unavailable');
            return;
        }
        if (validationErrorCode === 'RESET_TOKEN_EXPIRED') {
            router.replace('/reset-password/expired');
            return;
        }
        if (
            validationErrorCode === 'INVALID_RESET_TOKEN' ||
            validationErrorCode === 'RESET_TOKEN_USED'
        ) {
            router.replace('/reset-password/unavailable');
        }
    }, [router, token, validationErrorCode]);

    if (!token)
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <LoaderCircle className="text-primary size-9 animate-spin" />
                <p className="font-semibold">Đang chuyển trang...</p>
            </div>
        );
    if (validation.isPending)
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <LoaderCircle className="text-primary h-9 w-9 animate-spin" />
                <p className="font-semibold">Đang kiểm tra liên kết...</p>
            </div>
        );
    if (
        validationErrorCode === 'RESET_TOKEN_EXPIRED' ||
        validationErrorCode === 'INVALID_RESET_TOKEN' ||
        validationErrorCode === 'RESET_TOKEN_USED'
    )
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <LoaderCircle className="text-primary size-9 animate-spin" />
                <p className="font-semibold">Đang chuyển trang...</p>
            </div>
        );
    if (validation.isError)
        return (
            <ResetTokenError
                message={
                    getResetError(validation.error) ||
                    'Không thể kiểm tra liên kết. Vui lòng thử lại sau.'
                }
            />
        );

    const onSubmit = (values: ResetPasswordFormValues) => {
        if (reset.isPending) return;
        reset.mutate(
            { token, password: values.password },
            {
                onSuccess: () => {
                    broadcastPasswordResetSuccess();
                    toast.success('Đặt lại mật khẩu thành công.');
                    router.replace('/reset-password/success');
                },
                onError: (error) => {
                    const knownMessage = getResetError(error);
                    if (knownMessage) {
                        toast.error('Không thể đặt lại mật khẩu', {
                            description: knownMessage,
                        });
                        void validation.refetch();
                        return;
                    }
                    const message = axios.isAxiosError<ApiErrorResponse>(error)
                        ? error.response?.data?.error?.message
                        : undefined;
                    toast.error('Không thể đặt lại mật khẩu', {
                        description:
                            message ||
                            'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
                    });
                },
            },
        );
    };

    return (
        <div className="w-full max-w-xl">
            <div className="bg-primary/10 text-primary mx-auto mb-6 flex size-20 items-center justify-center rounded-full">
                <KeyRound className="size-9" />
            </div>
            <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
                Tạo mật khẩu mới
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-md text-center leading-7 font-semibold">
                Nhập và xác nhận mật khẩu mới để tiếp tục sử dụng tài khoản.
            </p>
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="mt-10 space-y-6"
            >
                <div className="space-y-2">
                    <Label htmlFor="password">Mật khẩu mới</Label>
                    <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        placeholder="Nhập mật khẩu mới"
                        className="mt-2 h-14 rounded-xl border-slate-200 bg-white font-semibold shadow-sm"
                        aria-invalid={Boolean(errors.password)}
                        showStrength
                        {...register('password')}
                    />
                    {errors.password && (
                        <p className="text-destructive text-sm font-semibold">
                            {errors.password.message}
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                    <PasswordInput
                        id="confirmPassword"
                        autoComplete="new-password"
                        placeholder="Nhập lại mật khẩu mới"
                        className="mt-2 h-14 rounded-xl border-slate-200 bg-white font-semibold shadow-sm"
                        aria-invalid={Boolean(errors.confirmPassword)}
                        {...register('confirmPassword')}
                    />
                    {errors.confirmPassword && (
                        <p className="text-destructive text-sm font-semibold">
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>
                <Button
                    type="submit"
                    size="lg"
                    className="h-14 w-full rounded-xl text-base font-bold shadow-[0_12px_28px_rgba(109,40,217,0.22)] active:translate-y-px"
                    disabled={reset.isPending}
                >
                    {reset.isPending ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
                </Button>
            </form>
            <Link
                href="/sign-in"
                className="text-primary mx-auto mt-6 block w-fit text-sm font-bold transition-opacity hover:opacity-75"
            >
                Quay lại đăng nhập
            </Link>
        </div>
    );
}

function ResetTokenError({ message }: { message: string }) {
    return (
        <div className="w-full text-center">
            <div className="bg-destructive/10 text-destructive mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
                <ShieldX className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-extrabold">Liên kết không khả dụng</h2>
            <p className="text-muted-foreground mt-3 font-semibold">
                {message}
            </p>
            <Button asChild className="mt-8 max-w-2xl">
                <Link href="/forgot-password">Yêu cầu liên kết mới</Link>
            </Button>
            <Link
                href="/sign-in"
                className="text-muted-foreground hover:text-primary mt-5 block text-sm font-bold"
            >
                Quay lại đăng nhập
            </Link>
        </div>
    );
}
