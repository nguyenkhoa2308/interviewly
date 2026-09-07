import { getData, postData } from '@/lib/api-client';

export interface RegisterRequest {
    fullName: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface VerifyEmailRequest {
    email: string;
    otp: string;
}

export interface ResendVerificationRequest {
    email: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    password: string;
}

export interface MessageResponse {
    success: true;
    data: {
        message: string;
    };
}

export interface ValidateResetTokenResponse {
    success: true;
    data: {
        valid: true;
    };
}

export interface CurrentUser {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    emailVerifiedAt: string | null;
    status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
    role: 'USER' | 'ADMIN';
    onboardingCompletedAt: string | null;
    createdAt: string;
}

export interface GetMeResponse {
    success: true;
    data: CurrentUser;
}

export const register = (data: RegisterRequest) =>
    postData('/auth/register', data);

export const login = (data: LoginRequest) => postData('/auth/login', data);

export const verifyEmail = (data: VerifyEmailRequest) =>
    postData('/auth/verify-email', data);

export const resendVerification = (data: ResendVerificationRequest) =>
    postData('/auth/resend-verification', data);

export const forgotPassword = (data: ForgotPasswordRequest) =>
    postData<MessageResponse>('/auth/forgot-password', data);

export const validateResetToken = (token: string) =>
    getData<ValidateResetTokenResponse>('/auth/reset-password/validate', {
        params: { token },
    });

export const resetPassword = (data: ResetPasswordRequest) =>
    postData<MessageResponse>('/auth/reset-password', data);

export const getMe = async (): Promise<CurrentUser> => {
    const response = await getData<GetMeResponse>('/auth/me');
    return response.data;
};

export const logout = () => postData<MessageResponse>('/auth/logout');
