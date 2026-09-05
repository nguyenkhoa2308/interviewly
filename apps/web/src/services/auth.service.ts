import { postData } from '@/lib/api-client';

export type RegisterRequest = {
    fullName: string;
    email: string;
    password: string;
};

export type LoginRequest = {
    email: string;
    password: string;
};

export const authService = {
    register: (data: RegisterRequest) => postData('/auth/register', data),

    login: (data: LoginRequest) => postData('/auth/login', data),
};
