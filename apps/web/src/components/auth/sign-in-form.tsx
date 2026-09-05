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

    const password = watch('password');

    const onSubmit = (values: SignInFormValues) => {
        const { rememberMe, ...loginData } = values;

        mutate(loginData, {
            onSuccess: () => {
                toast.success('Đăng nhập thành công!', {
                    description: 'Chào mừng bạn quay trở lại với Interviewly.',
                });

                router.replace('/dashboard');
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
            <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full gap-2 !rounded-md bg-white font-bold"
                onClick={() => {}}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="!h-6 !w-6"
                >
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                Tiếp tục với Google
            </Button>

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
