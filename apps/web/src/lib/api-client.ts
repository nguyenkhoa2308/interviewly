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

const AUTH_REFRESH_LOCK = 'interviewly:auth-refresh';
const AUTH_REFRESH_MARKER = 'interviewly:auth-refresh-at';

let refreshPromise: Promise<void> | null = null;

function readRefreshMarker(): number {
    if (typeof window === 'undefined') return 0;
    const value = Number(window.localStorage.getItem(AUTH_REFRESH_MARKER));
    return Number.isFinite(value) ? value : 0;
}

function writeRefreshMarker(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AUTH_REFRESH_MARKER, String(Date.now()));
}

async function requestNewTokens(): Promise<void> {
    await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
    );
    writeRefreshMarker();
}

async function refreshAcrossTabs(observedMarker: number): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.locks) {
        await requestNewTokens();
        return;
    }

    await navigator.locks.request(AUTH_REFRESH_LOCK, async () => {
        if (readRefreshMarker() > observedMarker) return;
        await requestNewTokens();
    });
}

function shouldAttemptRefresh(url: string): boolean {
    return !REFRESH_EXCLUDED_ENDPOINTS.some((endpoint) =>
        url.includes(endpoint),
    );
}

function refreshSession(): Promise<void> {
    if (refreshPromise) return refreshPromise;

    const observedMarker = readRefreshMarker();
    refreshPromise = refreshAcrossTabs(observedMarker)
        .catch((error: unknown) => {
            notifySessionExpired();
            throw error;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as
            RetryableRequestConfig | undefined;
        const requestUrl = originalRequest?.url ?? '';

        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            !shouldAttemptRefresh(requestUrl)
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            await refreshSession();
            return api(originalRequest);
        } catch (refreshError) {
            return Promise.reject(refreshError);
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
