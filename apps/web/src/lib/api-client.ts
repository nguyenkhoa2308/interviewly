import axios, {
    type AxiosError,
    type AxiosRequestConfig,
    type InternalAxiosRequestConfig,
} from 'axios';

import { notifySessionExpired } from '@/lib/auth-session';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

const REFRESH_EXCLUDED_ENDPOINTS = [
    '/auth/refresh',
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/google',
];

let isRefreshing = false;
let failedQueue: Array<{
    resolve: () => void;
    reject: (reason: unknown) => void;
}> = [];

function processQueue(error?: unknown): void {
    for (const request of failedQueue) {
        if (error) request.reject(error);
        else request.resolve();
    }
    failedQueue = [];
}

function shouldAttemptRefresh(url: string): boolean {
    return !REFRESH_EXCLUDED_ENDPOINTS.some((endpoint) =>
        url.includes(endpoint),
    );
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as
            RetryableRequestConfig | undefined;
        const status = error.response?.status;
        const requestUrl = originalRequest?.url ?? '';

        if (
            status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            !shouldAttemptRefresh(requestUrl)
        ) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise<void>((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then(() => api(originalRequest));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
                {},
                { withCredentials: true },
            );
            processQueue();
            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError);
            notifySessionExpired();
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    },
);

export const getData = async <T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<T> => {
    const response = await api.get<T>(url, config);
    return response.data;
};

export const postData = async <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
): Promise<T> => {
    const response = await api.post<T>(url, data, config);
    return response.data;
};

export const putData = async <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
): Promise<T> => {
    const response = await api.put<T>(url, data, config);
    return response.data;
};

export const patchData = async <T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
): Promise<T> => {
    const response = await api.patch<T>(url, data, config);
    return response.data;
};

export const deleteData = async <T>(
    url: string,
    config?: AxiosRequestConfig,
): Promise<T> => {
    const response = await api.delete<T>(url, config);
    return response.data;
};

export { api };
