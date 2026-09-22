import assert from 'node:assert/strict';
import test from 'node:test';

import { getCvContentState } from './cv-detail-state.ts';

test('keeps the uploading lifecycle state', () => {
    assert.equal(
        getCvContentState({
            processingStatus: 'UPLOADING',
            extractedText: null,
        }),
        'UPLOADING',
    );
});
test('keeps the processing lifecycle state', () => {
    assert.equal(
        getCvContentState({
            processingStatus: 'PROCESSING',
            extractedText: null,
        }),
        'PROCESSING',
    );
});
test('keeps the failed lifecycle state without inspecting internal errors', () => {
    assert.equal(
        getCvContentState({ processingStatus: 'FAILED', extractedText: null }),
        'FAILED',
    );
});
test('returns ready when parsed text is usable', () => {
    assert.equal(
        getCvContentState({
            processingStatus: 'READY',
            extractedText: 'Nguyen Duc Khoa\nBackend Developer',
        }),
        'READY',
    );
});
test('handles null parsed text defensively', () => {
    assert.equal(
        getCvContentState({ processingStatus: 'READY', extractedText: null }),
        'READY_EMPTY',
    );
});
test('handles whitespace-only parsed text defensively', () => {
    assert.equal(
        getCvContentState({
            processingStatus: 'READY',
            extractedText: '  \n  ',
        }),
        'READY_EMPTY',
    );
});
