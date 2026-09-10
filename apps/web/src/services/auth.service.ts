import { deleteData, getData, patchData, postData } from '@/lib/api-client';

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
    hasPassword: boolean;
    connectedProviders: Array<'GOOGLE'>;
}

export interface GetMeResponse {
    success: true;
    data: CurrentUser;
}

export interface AuthSession {
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string;
    isCurrent: boolean;
}

interface SessionsResponse {
    success: true;
    data: AuthSession[];
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

export const changePassword = (data: {
    currentPassword: string;
    newPassword: string;
}) => patchData<MessageResponse>('/auth/password', data);

export const getSessions = async (): Promise<AuthSession[]> => {
    const response = await getData<SessionsResponse>('/auth/sessions');
    return response.data;
};

export const revokeSession = (sessionId: string) =>
    deleteData<MessageResponse>(`/auth/sessions/${sessionId}`);

export const revokeOtherSessions = () =>
    deleteData<MessageResponse>('/auth/sessions/others');

export const deleteAccount = (data: {
    confirmation: 'DELETE';
    currentPassword: string;
}) => deleteData<MessageResponse>('/auth/account', { data });
