import assert from 'node:assert/strict';
import test from 'node:test';

import {
    MAX_CV_FILE_SIZE,
    renameCvSchema,
    uploadCvSchema,
} from './cv.schema.ts';

function fileOf(type: string, size = 10): File {
    return new File([new Uint8Array(size)], 'cv.pdf', { type });
}

test('accepts a valid PDF upload', () =>
    assert.equal(
        uploadCvSchema.safeParse({
            name: 'CV Backend',
            file: fileOf('application/pdf'),
        }).success,
        true,
    ));
test('trims a valid CV name', () =>
    assert.equal(
        uploadCvSchema.parse({
            name: '  CV Backend  ',
            file: fileOf('application/pdf'),
        }).name,
        'CV Backend',
    ));
test('rejects an empty CV name', () =>
    assert.equal(
        uploadCvSchema.safeParse({
            name: '   ',
            file: fileOf('application/pdf'),
        }).success,
        false,
    ));
test('rejects a CV name longer than 150 characters', () =>
    assert.equal(
        renameCvSchema.safeParse({ name: 'a'.repeat(151) }).success,
        false,
    ));
test('accepts a CV name exactly 150 characters long', () =>
    assert.equal(
        renameCvSchema.safeParse({ name: 'a'.repeat(150) }).success,
        true,
    ));
test('rejects a missing file', () =>
    assert.equal(
        uploadCvSchema.safeParse({ name: 'CV Backend' }).success,
        false,
    ));
test('rejects a non-File value', () =>
    assert.equal(
        uploadCvSchema.safeParse({ name: 'CV Backend', file: {} }).success,
        false,
    ));
test('rejects a non-PDF MIME type', () =>
    assert.equal(
        uploadCvSchema.safeParse({
            name: 'CV Backend',
            file: fileOf('text/plain'),
        }).success,
        false,
    ));
test('accepts a PDF exactly at the size limit', () =>
    assert.equal(
        uploadCvSchema.safeParse({
            name: 'CV Backend',
            file: fileOf('application/pdf', MAX_CV_FILE_SIZE),
        }).success,
        true,
    ));
test('rejects a PDF larger than the size limit', () =>
    assert.equal(
        uploadCvSchema.safeParse({
            name: 'CV Backend',
            file: fileOf('application/pdf', MAX_CV_FILE_SIZE + 1),
        }).success,
        false,
    ));
