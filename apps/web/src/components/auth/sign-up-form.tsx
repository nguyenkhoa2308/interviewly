'use client';

import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Mail, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

import { signUpSchema, type SignUpFormValues } from '@/schemas/auth.schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { cn } from '@/lib/utils';
import { useRegister } from '@/hooks/auth/use-auth-mutations';
import Link from 'next/link';
import { GoogleAuthButton } from './google-auth-button';
import { useGoogleAuthSuccess } from '@/hooks/auth/use-google-auth-success';

export function SignUpForm() {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
        control,
    } = useForm<SignUpFormValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            termsAccepted: false,
        },
    });

    const { mutate, isPending } = useRegister();
    const { handleGoogleSuccess } = useGoogleAuthSuccess();

    const password = useWatch({ control, name: 'password' });

    const onSubmit = (values: SignUpFormValues) => {
        const registerData = {
            fullName: values.fullName,
            email: values.email,
            password: values.password,
        };

        mutate(registerData, {
            onSuccess: () => {
                toast.success('Đăng ký thành công!', {
                    description:
                        'Vui lòng kiểm tra email để xác thực tài khoản.',
                });

                router.replace(
                    `/verify-email?email=${encodeURIComponent(registerData.email)}`,
                );
            },

            onError: (error) => {
                if (axios.isAxiosError(error)) {
                    const apiError = error.response?.data?.error;

                    if (apiError?.code === 'EMAIL_ALREADY_USED') {
                        setError('email', {
                            type: 'server',
                            message: apiError.message,
                        });

                        return;
                    }
                }

                toast.error('Không thể tạo tài khoản', {
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
                {/* Họ và tên */}
                <div className="space-y-3">
                    <Label htmlFor="fullName">Họ và tên</Label>
                    <div className="relative">
                        <User className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-3 h-4.5 w-4.5 -translate-y-1/2" />
                        <Input
                            id="fullName"
                            placeholder="Nhập họ và tên"
                            className="mt-2 h-12 !rounded-md bg-white pl-11 font-semibold"
                            aria-invalid={!!errors.fullName}
                            {...register('fullName')}
                        />
                    </div>
                    {errors.fullName && (
                        <p className="text-destructive text-[13px] font-semibold">
                            {errors.fullName.message}
                        </p>
                    )}
                </div>

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
                    <Label htmlFor="password">Mật khẩu</Label>
                    <div className="relative">
                        <Lock className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-3 z-10 h-4.5 w-4.5 -translate-y-1/2" />
                        <PasswordInput
                            id="password"
                            placeholder="Tạo mật khẩu"
                            className="mt-2 h-12 !rounded-md bg-white pl-11 font-semibold"
                            aria-invalid={!!errors.password}
                            {...register('password')}
                            value={password}
                            // showStrength={true}
                        />
                    </div>
                    <p className="text-muted-foreground/70 text-[13px] font-semibold">
                        Mật khẩu phải có ít nhất 8 ký tự
                    </p>

                    {errors.password && (
                        <p className="text-destructive text-[13px] font-semibold">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                {/* Điều khoản */}
                <div className="flex items-center justify-start gap-3">
                    <input
                        id="termsAccepted"
                        type="checkbox"
                        className={cn(
                            'border-input mt-0.5 h-4 w-4 shrink-0 rounded',
                            'accent-primary cursor-pointer',
                        )}
                        aria-invalid={!!errors.termsAccepted}
                        {...register('termsAccepted')}
                    />
                    <Label
                        htmlFor="termsAccepted"
                        className="mt-1 cursor-pointer leading-snug font-semibold"
                    >
                        Tôi đồng ý với{' '}
                        <a
                            href="/terms"
                            className="text-primary font-semibold hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Điều khoản dịch vụ
                        </a>{' '}
                        và{' '}
                        <a
                            href="/privacy"
                            className="text-primary font-semibold hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Chính sách quyền riêng tư
                        </a>
                    </Label>
                </div>
                {errors.termsAccepted && (
                    <p className="text-destructive -mt-3 text-xs font-medium">
                        {errors.termsAccepted.message}
                    </p>
                )}

                {/* Nút đăng ký */}
                <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isPending}
                >
                    {isPending ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
                </Button>
            </form>

            <p className="text-muted-foreground text-center text-sm font-semibold">
                Đã có tài khoản?{' '}
                <Link
                    href="/sign-in"
                    className="text-primary hover:text-secondary-foreground ml-1 transition-colors duration-300"
                >
                    Đăng nhập
                </Link>
            </p>
        </div>
    );
}
