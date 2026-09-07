import { z } from 'zod';

export const passwordSchema = z
    .string()
    .min(1, 'Vui lòng nhập mật khẩu.')
    .min(8, 'Mật khẩu cần có ít nhất 8 ký tự');
// .regex(/[^A-Za-z0-9]/, 'Mật khẩu cần có ít nhất một ký tự đặc biệt.');

export const signUpSchema = z.object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên'),

    email: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập địa chỉ email')
        .email('Địa chỉ email chưa đúng định dạng'),

    password: passwordSchema,

    termsAccepted: z.boolean().refine((value) => value, {
        message:
            'Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư',
    }),
});

export const signInSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập địa chỉ email')
        .email('Địa chỉ email chưa đúng định dạng'),

    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),

    rememberMe: z.boolean(),
});

export const forgotPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập email.')
        .email('Email không đúng định dạng.'),
});

export const resetPasswordSchema = z
    .object({
        password: passwordSchema,
        confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
    })
    .refine((values) => values.password === values.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Mật khẩu xác nhận không khớp.',
    });

export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type SignInFormValues = z.infer<typeof signInSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
