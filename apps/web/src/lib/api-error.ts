import axios from 'axios';

import type { ApiErrorResponse } from '@/types/api';

export class ApiError extends Error {
    constructor(
        message: string,
        readonly code?: string,
        readonly statusCode?: number,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export function normalizeApiError(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const apiError = error.response?.data?.error;
        const message = Array.isArray(apiError?.message)
            ? apiError.message[0]
            : apiError?.message;

        return new ApiError(
            message ?? 'Không thể kết nối tới máy chủ. Vui lòng thử lại.',
            apiError?.code,
            apiError?.statusCode ?? error.response?.status,
        );
    }

    if (error instanceof Error) {
        return new ApiError('Không thể hoàn tất yêu cầu. Vui lòng thử lại.');
    }
    return new ApiError('Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
}
