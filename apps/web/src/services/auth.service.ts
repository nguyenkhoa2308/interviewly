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

export const getMe = () => getData<GetMeResponse>('/auth/me');
