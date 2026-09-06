'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import Link from 'next/link';

import { signInSchema, type SignInFormValues } from '@/schemas/auth.schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { cn } from '@/lib/utils';
import { useLogin } from '@/hooks/auth/use-login';
import { GoogleAuthButton } from './google-auth-button';
import { useGoogleAuthSuccess } from '@/hooks/auth/use-google-auth-success';
import { useAuthRouting } from '@/hooks/auth/use-auth-routing';

export function SignInForm() {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
        watch,
    } = useForm<SignInFormValues>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false,
        },
    });

    const { mutate, isPending } = useLogin();
    const { handleGoogleSuccess } = useGoogleAuthSuccess();
    const { routeAuthenticatedUser } = useAuthRouting();

    const password = watch('password');

    const onSubmit = (values: SignInFormValues) => {
        const { rememberMe, ...loginData } = values;

        mutate(loginData, {
            onSuccess: async () => {
                try {
                    await routeAuthenticatedUser();
                    toast.success('Đăng nhập thành công!', {
                        description:
                            'Chào mừng bạn quay trở lại với Interviewly.',
                    });
                } catch {
                    toast.error('Không thể kiểm tra tài khoản', {
                        description:
                            'Bạn đã đăng nhập nhưng hệ thống chưa thể tải thông tin tài khoản. Vui lòng thử lại.',
                    });
                }
            },

            onError: (error) => {
                if (axios.isAxiosError(error)) {
                    const apiError = error.response?.data?.error;

                    switch (apiError?.code) {
                        case 'INVALID_CREDENTIALS':
                        case 'USER_NOT_FOUND':
                            toast.error('Đăng nhập thất bại', {
                                description:
                                    apiError?.message ||
                                    'Email hoặc mật khẩu không chính xác.',
                            });
                            return;

                        case 'EMAIL_NOT_VERIFIED':
                            toast.warning('Email chưa được xác minh', {
                                description:
                                    'Vui lòng xác minh email trước khi đăng nhập.',
                            });

                            router.replace(
                                `/verify-email?email=${encodeURIComponent(values.email)}`,
                            );
                            return;

                        case 'ACCOUNT_INACTIVE':
                            toast.error('Tài khoản bị khóa', {
                                description:
                                    apiError?.message ||
                                    'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.',
                            });
                            return;

                        default:
                            if (apiError?.message) {
                                toast.error('Đăng nhập thất bại', {
                                    description: apiError.message,
                                });
                                return;
                            }
                    }
                }

                toast.error('Không thể đăng nhập', {
                    description:
                        'Có chút trục trặc xảy ra. Vui lòng thử lại sau.',
                });
            },
        });
    };

    return (
        <div className="w-full space-y-5">
            <GoogleAuthButton onSuccess={handleGoogleSuccess} />

            {/* Divider */}
            <div className="flex items-center gap-4">
                <div className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-sm font-semibold">
                    hoặc
                </span>
                <div className="bg-border h-px flex-1" />
            </div>

            {/* Form */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-5"
            >
                {/* Email */}
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                        <Mail className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-3 h-4.5 w-4.5 -translate-y-1/2" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="Nhập địa chỉ email"
                            className="mt-2 h-12 !rounded-md bg-white pl-11 font-semibold"
                            aria-invalid={!!errors.email}
                            {...register('email')}
                            tabIndex={1}
                        />
                    </div>
                    {errors.email && (
                        <p className="text-destructive text-[13px] font-semibold">
                            {errors.email.message}
                        </p>
                    )}
                </div>

                {/* Mật khẩu */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Link
                            href="/forgot-password"
                            className="text-primary hover:text-secondary-foreground text-sm font-bold transition-colors"
                            tabIndex={-1}
                        >
                            Quên mật khẩu?
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-3 z-10 h-4.5 w-4.5 -translate-y-1/2" />
                        <PasswordInput
                            id="password"
                            placeholder="Nhập mật khẩu"
                            className="mt-2 h-12 !rounded-md bg-white pl-11 font-semibold"
                            aria-invalid={!!errors.password}
                            {...register('password')}
                            value={password}
                            tabIndex={2}
                        />
                    </div>

                    {errors.password && (
                        <p className="text-destructive text-[13px] font-semibold">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                {/* Ghi nhớ đăng nhập */}
                <div className="flex items-center justify-start gap-3">
                    <input
                        id="rememberMe"
                        type="checkbox"
                        className={cn(
                            'border-input mt-0.5 h-4 w-4 shrink-0 rounded',
                            'accent-primary cursor-pointer',
                        )}
                        {...register('rememberMe')}
                        tabIndex={3}
                    />
                    <Label
                        htmlFor="rememberMe"
                        className="mt-1 cursor-pointer leading-snug font-semibold"
                    >
                        Ghi nhớ đăng nhập
                    </Label>
                </div>

                {/* Nút đăng nhập */}
                <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isPending}
                >
                    {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
            </form>

            <p className="text-muted-foreground text-center text-sm font-semibold">
                Bạn chưa có tài khoản?{' '}
                <Link
                    href="/sign-up"
                    className="text-primary hover:text-secondary-foreground ml-1 transition-colors duration-300"
                >
                    Đăng ký ngay
                </Link>
            </p>
        </div>
    );
}
