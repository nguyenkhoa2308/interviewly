import { describe, expect, it } from 'vitest';

import { normalizeApiError } from './api-error';

describe('normalizeApiError', () => {
    it('does not expose arbitrary Error messages to the UI', () => {
        const error = normalizeApiError(
            new Error('secret provider or internal stack detail'),
        );

        expect(error.message).toBe(
            'Không thể hoàn tất yêu cầu. Vui lòng thử lại.',
        );
        expect(error.message).not.toContain('secret');
    });
});
