import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    type S3Client,
} from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';

import { StorageService } from './storage.service';
import type { R2UrlSigner } from './storage.tokens';

const PUBLIC_BUCKET = 'interviewly-public';
const PRIVATE_BUCKET = 'interviewly-private';

describe('StorageService', () => {
    const send = jest.fn<S3Client['send']>();
    const client = { send } as unknown as S3Client;
    const urlSigner = jest.fn<R2UrlSigner>();
    const configValues: Record<string, string> = {
        R2_BUCKET_NAME: PUBLIC_BUCKET,
        R2_PRIVATE_BUCKET_NAME: PRIVATE_BUCKET,
        R2_PUBLIC_URL: 'https://assets.example.com/',
    };
    const configService = {
        getOrThrow: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;
    let service: StorageService;
    let loggerErrorSpy: jest.SpiedFunction<Logger['error']>;

    beforeAll(() => {
        loggerErrorSpy = jest
            .spyOn(Logger.prototype, 'error')
            .mockImplementation(() => undefined);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        send.mockResolvedValue({} as never);
        urlSigner.mockResolvedValue('https://signed.example.com/cv');
        service = new StorageService(configService, client, urlSigner);
    });

    afterAll(() => loggerErrorSpy.mockRestore());

    it('uploads private CV bytes to the private bucket unchanged', async () => {
        const buffer = Buffer.from('%PDF-1.7\ncontent');

        await service.uploadPrivate(
            'cvs/user-id/cv-id/original.pdf',
            buffer,
            'application/pdf',
        );

        const command = send.mock.calls[0][0];
        expect(command).toBeInstanceOf(PutObjectCommand);
        expect((command as PutObjectCommand).input).toEqual({
            Bucket: PRIVATE_BUCKET,
            Key: 'cvs/user-id/cv-id/original.pdf',
            Body: buffer,
            ContentType: 'application/pdf',
        });
        expect((command as PutObjectCommand).input.Body).toBe(buffer);
    });

    it('keeps the existing avatar upload on the public bucket', async () => {
        const buffer = Buffer.from('webp');

        await service.upload(
            'avatars/user-id/avatar.webp',
            buffer,
            'image/webp',
        );

        const command = send.mock.calls[0][0] as PutObjectCommand;
        expect(command.input).toMatchObject({
            Bucket: PUBLIC_BUCKET,
            Key: 'avatars/user-id/avatar.webp',
            Body: buffer,
            ContentType: 'image/webp',
        });
        expect(service.getPublicUrl('avatars/user-id/avatar.webp')).toBe(
            'https://assets.example.com/avatars/user-id/avatar.webp',
        );
    });

    it('maps an SDK upload error without exposing its raw details', async () => {
        send.mockRejectedValue(new Error('secret SDK detail'));

        await expect(
            service.uploadPrivate(
                'cvs/user/cv/original.pdf',
                Buffer.from('pdf'),
                'application/pdf',
            ),
        ).rejects.toMatchObject({
            response: {
                code: 'STORAGE_UPLOAD_FAILED',
            },
        });
        const logged = JSON.stringify(loggerErrorSpy.mock.calls);
        expect(logged).not.toContain('secret SDK detail');
        expect(logged).not.toContain('cvs/user/cv/original.pdf');
        expect(logged).toContain('R2 operation failed');
    });

    it('deletes a CV object from the private bucket using its exact key', async () => {
        const key = 'cvs/user/cv/original.pdf';

        await service.deletePrivate(key);

        const command = send.mock.calls[0][0];
        expect(command).toBeInstanceOf(DeleteObjectCommand);
        expect((command as DeleteObjectCommand).input).toEqual({
            Bucket: PRIVATE_BUCKET,
            Key: key,
        });
    });

    it('maps a private delete SDK error', async () => {
        send.mockRejectedValue(new Error('R2 delete failed'));

        await expect(
            service.deletePrivate('cvs/user/cv/original.pdf'),
        ).rejects.toMatchObject({
            response: { code: 'STORAGE_DELETE_FAILED' },
        });
    });

    it('keeps avatar existence checks on the public bucket', async () => {
        await expect(service.exists('avatars/user/avatar.webp')).resolves.toBe(
            true,
        );

        const command = send.mock.calls[0][0];
        expect(command).toBeInstanceOf(HeadObjectCommand);
        expect((command as HeadObjectCommand).input.Bucket).toBe(PUBLIC_BUCKET);
    });

    it('creates a short-lived GET URL for the private bucket and exact key', async () => {
        const key = 'cvs/user/cv/original.pdf';

        await expect(service.createPresignedGetUrl(key, 300)).resolves.toBe(
            'https://signed.example.com/cv',
        );

        expect(urlSigner).toHaveBeenCalledTimes(1);
        const [, command, options] = urlSigner.mock.calls[0];
        expect(command).toBeInstanceOf(GetObjectCommand);
        expect((command as GetObjectCommand).input).toEqual({
            Bucket: PRIVATE_BUCKET,
            Key: key,
        });
        expect(options).toEqual({ expiresIn: 300 });
    });

    it.each([0, 3601, 1.5])(
        'rejects unsafe presigned URL expiry %s',
        async (expiry) => {
            await expect(
                service.createPresignedGetUrl(
                    'cvs/user/cv/original.pdf',
                    expiry,
                ),
            ).rejects.toMatchObject({
                response: { code: 'STORAGE_INVALID_EXPIRY' },
            });
            expect(urlSigner).not.toHaveBeenCalled();
        },
    );

    it('maps presigner errors without returning its raw details', async () => {
        urlSigner.mockRejectedValue(new Error('credential internals'));

        await expect(
            service.createPresignedGetUrl('cvs/user/cv/original.pdf', 300),
        ).rejects.toMatchObject({
            response: { code: 'STORAGE_SIGN_URL_FAILED' },
        });
    });
});
