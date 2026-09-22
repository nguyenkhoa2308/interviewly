import assert from 'node:assert/strict';
import test from 'node:test';

import { formatCvDate, formatFileSize } from './cv-formatters.ts';

test('formats unknown file size', () =>
    assert.equal(formatFileSize(null), 'Không rõ dung lượng'));
test('formats bytes without decimals', () =>
    assert.equal(formatFileSize(512), '512 B'));
test('formats kilobytes', () => {
    assert.equal(formatFileSize(1024), '1 KB');
    assert.equal(formatFileSize(1536), '1.5 KB');
});
test('formats megabytes', () => {
    assert.equal(formatFileSize(5 * 1024 * 1024), '5 MB');
    assert.equal(formatFileSize(12.5 * 1024 * 1024), '13 MB');
});
test('formats gigabytes', () =>
    assert.equal(formatFileSize(2 * 1024 * 1024 * 1024), '2 GB'));
test('formats an ISO date using Vietnamese day-month-year order', () =>
    assert.equal(formatCvDate('2026-09-13T10:00:00.000Z'), '13/09/2026'));
