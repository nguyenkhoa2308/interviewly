import assert from 'node:assert/strict';
import test from 'node:test';

import { cvKeys, normalizeCvListParams } from './cv-keys.ts';

test('uses stable root, list and detail key namespaces', () => {
    assert.deepEqual(cvKeys.all, ['cvs']);
    assert.deepEqual(cvKeys.lists(), ['cvs', 'list']);
    assert.deepEqual(cvKeys.details(), ['cvs', 'detail']);
});
test('normalizes default pagination values', () =>
    assert.deepEqual(normalizeCvListParams(), { page: 1, limit: 20 }));
test('preserves explicit pagination and status', () =>
    assert.deepEqual(
        normalizeCvListParams({ page: 2, limit: 10, status: 'READY' }),
        { page: 2, limit: 10, status: 'READY' },
    ));
test('omits an absent status from the normalized key object', () =>
    assert.equal('status' in normalizeCvListParams({ page: 1 }), false));
test('generates the same list key for omitted and default pagination', () =>
    assert.deepEqual(cvKeys.list(), cvKeys.list({ page: 1, limit: 20 })));
test('generates different list keys for different pages', () =>
    assert.notDeepEqual(cvKeys.list({ page: 1 }), cvKeys.list({ page: 2 })));
test('generates different list keys for different statuses', () =>
    assert.notDeepEqual(
        cvKeys.list({ status: 'READY' }),
        cvKeys.list({ status: 'FAILED' }),
    ));
test('includes server search and sort in the list cache key', () =>
    assert.deepEqual(
        normalizeCvListParams({
            page: 2,
            limit: 8,
            search: 'frontend',
            sort: 'NAME_ASC',
        }),
        {
            page: 2,
            limit: 8,
            search: 'frontend',
            sort: 'NAME_ASC',
        },
    ));
test('scopes a detail key to its CV id', () =>
    assert.deepEqual(cvKeys.detail('cv-123'), ['cvs', 'detail', 'cv-123']));
test('scopes latest analysis beneath its CV detail', () =>
    assert.deepEqual(cvKeys.analysisLatest('cv-123'), [
        'cvs',
        'detail',
        'cv-123',
        'analysis',
        'latest',
    ]));
test('normalizes analysis history pagination', () =>
    assert.deepEqual(cvKeys.analysisHistory('cv-123', { page: 2 }), [
        'cvs',
        'detail',
        'cv-123',
        'analysis',
        'history',
        { page: 2, limit: 20 },
    ]));
