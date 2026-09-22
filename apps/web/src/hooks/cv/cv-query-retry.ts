import { ApiError } from '@/lib/api-error';

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 409, 422]);

export function shouldRetryCvQuery(
    failureCount: number,
    error: unknown,
): boolean {
    if (
        error instanceof ApiError &&
        error.statusCode !== undefined &&
        NON_RETRYABLE_STATUSES.has(error.statusCode)
    ) {
        return false;
    }

    return failureCount < 1;
}
