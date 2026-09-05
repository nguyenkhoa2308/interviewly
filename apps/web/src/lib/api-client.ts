import axios, {
    type AxiosError,
    type AxiosRequestConfig,
    type InternalAxiosRequestConfig,
} from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Biến quản lý trạng thái refresh token để tránh gọi nhiều request refresh đồng thời
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve();
        }
    });
    failedQueue = [];
};

// Response interceptor: Tự động refresh token khi gặp lỗi 401
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        const status = error.response?.status;
        const requestUrl = originalRequest?.url || '';

        // Không retry nếu chính request refresh hoặc login/logout bị 401
        const isAuthEndpoint =
            requestUrl.includes('/auth/refresh') ||
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/register');

        if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                // Nếu đang trong tiến trình refresh, đẩy request này vào hàng đợi
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => api(originalRequest))
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Gọi API refresh token (cookie refresh_token được tự động gửi kèm với withCredentials: true)
                await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
                    {},
                    { withCredentials: true },
                );

                processQueue(null);
                // Thực hiện lại request ban đầu với cookie mới
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as AxiosError);

                // Nếu refresh thất bại (hết hạn refresh_token), chuyển hướng về sign-in nếu đang ở client
                if (typeof window !== 'undefined') {
                    const currentPath = window.location.pathname;
                    if (
                        !currentPath.startsWith('/sign-in') &&
                        !currentPath.startsWith('/sign-up')
                    ) {
                        window.location.href = `/sign-in?redirect=${encodeURIComponent(currentPath)}`;
                    }
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
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
