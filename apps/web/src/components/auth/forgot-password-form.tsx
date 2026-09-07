'use client';

import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForgotPassword } from '@/hooks/auth/use-auth-mutations';
import { useGoogleAuthSuccess } from '@/hooks/auth/use-google-auth-success';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import {
    forgotPasswordSchema,
    type ForgotPasswordFormValues,
} from '@/schemas/auth.schema';

export function ForgotPasswordForm() {
    const router = useRouter();
    const { mutate, isPending } = useForgotPassword();
    const { handleGoogleSuccess } = useGoogleAuthSuccess();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: '' },
    });

    const onSubmit = (values: ForgotPasswordFormValues) => {
        mutate(values, {
            onSuccess: () => {
                toast.success('Yêu cầu đã được tiếp nhận', {
                    description:
                        'Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.',
                });
                router.push(
                    '/check-email?email=' +
                        encodeURIComponent(values.email.trim().toLowerCase()),
                );
            },
            onError: (error) => {
                const message = axios.isAxiosError(error)
                    ? error.response?.data?.error?.message
                    : undefined;
                toast.error('Không thể gửi yêu cầu', {
                    description:
                        message ||
                        'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
                });
            },
        });
    };

    return (
        <div className="w-full max-w-xl">
            <div className="bg-primary/10 text-primary mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
                <LockKeyhole className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Quên mật khẩu?
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl leading-7 font-semibold">
                Nhập địa chỉ email và chúng tôi sẽ gửi cho bạn hướng dẫn đặt lại
                mật khẩu.
            </p>
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="mt-10 space-y-6"
            >
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <Mail className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-3 h-4.5 w-4.5 -translate-y-1/2" />
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="Nhập địa chỉ email"
                            className="h-14 rounded-xl border-slate-200 bg-white pl-11 font-semibold shadow-sm"
                            aria-invalid={Boolean(errors.email)}
                            {...register('email')}
                        />
                    </div>
                    {errors.email && (
                        <p className="text-destructive text-sm font-semibold">
                            {errors.email.message}
                        </p>
                    )}
                </div>
                <Button
                    type="submit"
                    size="lg"
                    className="h-14 w-full rounded-xl text-base font-bold shadow-[0_12px_28px_rgba(109,40,217,0.22)] active:translate-y-px"
                    disabled={isPending}
                >
                    {isPending ? 'Đang gửi...' : 'Gửi hướng dẫn'}
                </Button>
            </form>

            <div className="my-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-muted-foreground text-sm font-semibold">
                    hoặc
                </span>
                <span className="h-px flex-1 bg-slate-200" />
            </div>

            <GoogleAuthButton
                onSuccess={handleGoogleSuccess}
                className="h-14 rounded-xl! border-slate-200 text-base shadow-none"
            />

            <div className="text-muted-foreground mt-10 flex items-center justify-center gap-2 text-center text-sm font-semibold">
                <ShieldCheck className="h-4.5 w-4.5 shrink-0" />
                <span>
                    Vì lý do bảo mật, liên kết sẽ hết hạn sau{' '}
                    <strong className="text-primary">30 phút</strong>.
                </span>
            </div>
        </div>
    );
}
