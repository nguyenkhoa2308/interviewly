export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
}

export interface ApiErrorBody {
    statusCode: number;
    code?: string;
    message: string | string[];
}

export interface ApiErrorResponse {
    success: false;
    error: ApiErrorBody;
}
