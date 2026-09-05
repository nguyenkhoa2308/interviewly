import axios, { type AxiosRequestConfig } from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

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
