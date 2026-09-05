import { z } from 'zod';

export const signUpSchema = z.object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên'),

    email: z
        .string()
        .trim()
        .min(1, 'Vui lòng nhập địa chỉ email')
        .email('Địa chỉ email chưa đúng định dạng'),

    password: z.string().min(8, 'Mật khẩu cần có ít nhất 8 ký tự'),

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

export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type SignInFormValues = z.infer<typeof signInSchema>;
