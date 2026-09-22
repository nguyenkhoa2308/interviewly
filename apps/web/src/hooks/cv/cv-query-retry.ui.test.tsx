import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api-error';
import { shouldRetryCvQuery } from './cv-query-retry';

describe('shouldRetryCvQuery', () => {
    it.each([400, 401, 403, 404, 409, 422])(
        'does not retry non-transient HTTP %s',
        (statusCode) => {
            expect(
                shouldRetryCvQuery(
                    0,
                    new ApiError('safe', 'CV_ERROR', statusCode),
                ),
            ).toBe(false);
        },
    );

    it('allows one retry for a network or transient server failure', () => {
        expect(shouldRetryCvQuery(0, new ApiError('network'))).toBe(true);
        expect(
            shouldRetryCvQuery(0, new ApiError('server', undefined, 503)),
        ).toBe(true);
        expect(shouldRetryCvQuery(1, new ApiError('network'))).toBe(false);
    });
});
