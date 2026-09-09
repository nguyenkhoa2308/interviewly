import {
    Logger,
    UnauthorizedException,
    type CanActivate,
    type ExecutionContext,
    type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import sharp from 'sharp';
import request from 'supertest';

import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { StorageException } from '../storage/exceptions/storage.exception';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
    AVATAR_PRESETS,
    getAvatarObjectKey,
    getDiceBearAvatarUrl,
} from './constants/avatar.constant';
import { ProfileController } from './profile.controller';
import { AvatarImageService } from './services/avatar-image.service';
import { UsersService } from './users.service';

const USER_ID = '00000000-0000-0000-0000-000000000001';
const AVATAR_ENDPOINT = '/api/v1/profile/avatar';
const PRESET_ENDPOINT = '/api/v1/profile/avatar/preset';
const TWO_MB = 2 * 1024 * 1024;
const PUBLIC_URL = 'https://cdn.interviewly.test';

class TestAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest().user = {
            id: USER_ID,
            email: 'avatar-test@example.com',
            role: 'USER',
        };
        return true;
    }
}

class UnauthenticatedGuard implements CanActivate {
    canActivate(): never {
        throw new UnauthorizedException('Chưa đăng nhập.');
    }
}

type ImageFixture = {
    label: string;
    buffer: Buffer;
    filename: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
};

const usersService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    updateAvatar:
        jest.fn<
            (
                userId: string,
                avatarUrl: string | null,
            ) => Promise<{ avatarUrl: string | null }>
        >(),
};

const storageService = {
    upload: jest.fn<
        (key: string, body: Buffer, contentType: string) => Promise<void>
    >(),
    delete: jest.fn<(key: string) => Promise<void>>(),
    exists: jest.fn<(key: string) => Promise<boolean>>(),
    getPublicUrl: jest.fn<(key: string) => string>(),
};

function configureApp(app: INestApplication) {
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
}

describe('Avatar API', () => {
    let app: INestApplication;
    let avatarImageService: AvatarImageService;
    let validImages: ImageFixture[];
    let loggerWarnSpy: jest.SpiedFunction<Logger['warn']>;

    beforeAll(async () => {
        const source = {
            create: {
                width: 480,
                height: 320,
                channels: 3 as const,
                background: { r: 90, g: 70, b: 220 },
            },
        };
        validImages = [
            {
                label: 'JPEG',
                buffer: await sharp(source).jpeg({ quality: 90 }).toBuffer(),
                filename: 'avatar.jpg',
                mimeType: 'image/jpeg',
            },
            {
                label: 'PNG',
                buffer: await sharp(source).png().toBuffer(),
                filename: 'avatar.png',
                mimeType: 'image/png',
            },
            {
                label: 'WebP',
                buffer: await sharp(source).webp({ quality: 90 }).toBuffer(),
                filename: 'avatar.webp',
                mimeType: 'image/webp',
            },
        ];

        const moduleRef = await Test.createTestingModule({
            controllers: [ProfileController],
            providers: [
                AvatarImageService,
                { provide: UsersService, useValue: usersService },
                { provide: StorageService, useValue: storageService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useClass(TestAuthGuard)
            .compile();

        avatarImageService = moduleRef.get(AvatarImageService);
        app = moduleRef.createNestApplication();
        configureApp(app);
        await app.init();
        loggerWarnSpy = jest
            .spyOn(Logger.prototype, 'warn')
            .mockImplementation(() => undefined);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        storageService.upload.mockResolvedValue(undefined);
        storageService.delete.mockResolvedValue(undefined);
        storageService.exists.mockResolvedValue(false);
        storageService.getPublicUrl.mockImplementation(
            (key: string) => `${PUBLIC_URL}/${key}`,
        );
        usersService.updateAvatar.mockImplementation(
            async (_userId: string, avatarUrl: string | null) => ({
                avatarUrl,
            }),
        );
    });

    afterAll(async () => {
        loggerWarnSpy.mockRestore();
        await app.close();
    });

    describe('POST /profile/avatar', () => {
        it.each(['JPEG', 'PNG', 'WebP'])(
            'uploads a valid %s, processed as WebP 256x256',
            async (label) => {
                const image = validImages.find((item) => item.label === label)!;
                const key = getAvatarObjectKey(USER_ID);

                const response = await request(app.getHttpServer())
                    .post(AVATAR_ENDPOINT)
                    .attach('avatar', image.buffer, {
                        filename: image.filename,
                        contentType: image.mimeType,
                    });

                expect(response.status).toBe(201);
                expect(storageService.upload).toHaveBeenCalledTimes(1);
                const [uploadedKey, uploadedBuffer, contentType] =
                    storageService.upload.mock.calls[0];
                const metadata = await sharp(uploadedBuffer).metadata();

                expect(uploadedKey).toBe(key);
                expect(contentType).toBe('image/webp');
                expect(uploadedBuffer).not.toBe(image.buffer);
                expect(uploadedBuffer.equals(image.buffer)).toBe(false);
                expect(metadata).toMatchObject({
                    format: 'webp',
                    width: 256,
                    height: 256,
                });
                expect(storageService.getPublicUrl).toHaveBeenCalledWith(key);

                const savedUrl = usersService.updateAvatar.mock.calls[0][1];
                expect(savedUrl).toMatch(
                    new RegExp(
                        `^${PUBLIC_URL}/${key.replaceAll('/', '\\/')}\\?v=`,
                    ),
                );
                expect(usersService.updateAvatar).toHaveBeenCalledWith(
                    USER_ID,
                    savedUrl,
                );
                expect(response.body).toEqual({
                    success: true,
                    data: { avatarUrl: savedUrl },
                });
            },
        );

        it.each(['JPEG', 'PNG', 'WebP'])(
            'AvatarImageService converts %s to WebP 256x256',
            async (label) => {
                const image = validImages.find((item) => item.label === label)!;
                const output = await avatarImageService.process(image.buffer);
                const metadata = await sharp(output).metadata();

                expect(metadata.format).toBe('webp');
                expect(metadata.width).toBe(256);
                expect(metadata.height).toBe(256);
            },
        );

        it.each([
            ['PDF', Buffer.from('%PDF-1.7'), 'document.pdf', 'application/pdf'],
            [
                'DOCX',
                Buffer.from('PK\u0003\u0004fake-docx'),
                'document.docx',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
            [
                'Markdown',
                Buffer.from('# markdown'),
                'notes.md',
                'text/markdown',
            ],
            ['GIF', Buffer.from('GIF89a'), 'animation.gif', 'image/gif'],
        ])('rejects %s', async (_label, buffer, filename, contentType) => {
            const response = await request(app.getHttpServer())
                .post(AVATAR_ENDPOINT)
                .attach('avatar', buffer, { filename, contentType });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AVATAR_FILE_TYPE_INVALID');
            expect(storageService.upload).not.toHaveBeenCalled();
            expect(usersService.updateAvatar).not.toHaveBeenCalled();
        });

        it('rejects a fake .jpg whose content is not an image', async () => {
            const response = await request(app.getHttpServer())
                .post(AVATAR_ENDPOINT)
                .attach('avatar', Buffer.from('not an image'), {
                    filename: 'fake.jpg',
                    contentType: 'application/octet-stream',
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AVATAR_FILE_TYPE_INVALID');
        });

        it('rejects image/jpeg MIME when magic bytes are not JPEG', async () => {
            const response = await request(app.getHttpServer())
                .post(AVATAR_ENDPOINT)
                .attach('avatar', Buffer.from('%PDF-1.7 fake jpeg'), {
                    filename: 'spoofed.jpg',
                    contentType: 'image/jpeg',
                });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AVATAR_FILE_TYPE_INVALID');
        });

        it.each(['JPEG', 'PNG', 'WebP'])(
            'rejects %s over 2 MB before storage',
            async (label) => {
                const image = validImages.find((item) => item.label === label)!;
                const oversized = Buffer.concat([
                    image.buffer,
                    Buffer.alloc(TWO_MB + 1 - image.buffer.length),
                ]);
                const response = await request(app.getHttpServer())
                    .post(AVATAR_ENDPOINT)
                    .attach('avatar', oversized, {
                        filename: image.filename,
                        contentType: image.mimeType,
                    });

                expect(response.status).toBe(400);
                expect(response.body.error.code).toBe('AVATAR_FILE_TOO_LARGE');
                expect(storageService.upload).not.toHaveBeenCalled();
            },
        );

        it('rejects a request without avatar field', async () => {
            const response = await request(app.getHttpServer()).post(
                AVATAR_ENDPOINT,
            );

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AVATAR_FILE_REQUIRED');
        });

        it('sanitizes a Sharp failure for a truncated JPEG', async () => {
            const truncatedJpeg = Buffer.from([
                0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
                0x00,
            ]);
            const response = await request(app.getHttpServer())
                .post(AVATAR_ENDPOINT)
                .attach('avatar', truncatedJpeg, {
                    filename: 'corrupt.jpg',
                    contentType: 'image/jpeg',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toEqual({
                statusCode: 400,
                code: 'INVALID_AVATAR_IMAGE',
                message: 'Ảnh không hợp lệ hoặc không thể xử lý.',
            });
            const body = JSON.stringify(response.body).toLowerCase();
            expect(body).not.toContain('sharp');
            expect(body).not.toContain('vips');
            expect(body).not.toContain('input buffer');
            expect(storageService.upload).not.toHaveBeenCalled();
        });

        it('does not update DB when storage upload fails', async () => {
            storageService.upload.mockRejectedValueOnce(
                new StorageException(
                    'STORAGE_UPLOAD_FAILED',
                    'Không thể tải tệp lên. Vui lòng thử lại sau.',
                ),
            );

            const response = await request(app.getHttpServer())
                .post(AVATAR_ENDPOINT)
                .attach('avatar', validImages[0].buffer, {
                    filename: validImages[0].filename,
                    contentType: validImages[0].mimeType,
                });

            expect(response.status).toBe(503);
            expect(response.body.error.code).toBe('STORAGE_UPLOAD_FAILED');
            expect(usersService.updateAvatar).not.toHaveBeenCalled();
        });

        it('does not delete the fixed object when DB update fails', async () => {
            usersService.updateAvatar.mockRejectedValueOnce(
                new Error('simulated database failure'),
            );

            const response = await request(app.getHttpServer())
                .post(AVATAR_ENDPOINT)
                .attach('avatar', validImages[0].buffer, {
                    filename: validImages[0].filename,
                    contentType: validImages[0].mimeType,
                });

            expect(response.status).toBe(500);
            expect(storageService.upload).toHaveBeenCalledTimes(1);
            expect(storageService.delete).not.toHaveBeenCalled();
            expect(JSON.stringify(response.body)).not.toContain(
                'simulated database failure',
            );
        });

        it('overwrites the same R2 key and changes cache version on upload 2', async () => {
            const image = validImages[0];
            const first = await request(app.getHttpServer())
                .post(AVATAR_ENDPOINT)
                .attach('avatar', image.buffer, {
                    filename: image.filename,
                    contentType: image.mimeType,
                });
            const second = await request(app.getHttpServer())
                .post(AVATAR_ENDPOINT)
                .attach('avatar', image.buffer, {
                    filename: image.filename,
                    contentType: image.mimeType,
                });

            const expectedKey = getAvatarObjectKey(USER_ID);
            expect(storageService.upload.mock.calls[0][0]).toBe(expectedKey);
            expect(storageService.upload.mock.calls[1][0]).toBe(expectedKey);
            expect(first.body.data.avatarUrl).not.toBe(
                second.body.data.avatarUrl,
            );
        });
    });

    describe('PATCH /profile/avatar/preset', () => {
        it.each(AVATAR_PRESETS)('accepts preset %s', async (preset) => {
            const response = await request(app.getHttpServer())
                .patch(PRESET_ENDPOINT)
                .send({ preset });
            const expectedUrl = getDiceBearAvatarUrl(preset);

            expect(response.status).toBe(200);
            expect(usersService.updateAvatar).toHaveBeenCalledWith(
                USER_ID,
                expectedUrl,
            );
            expect(storageService.upload).not.toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                data: { avatarUrl: expectedUrl },
            });
        });

        it.each([
            ['empty preset', ''],
            ['arbitrary URL', 'https://api.dicebear.com/10.x/bottts/svg'],
            ['arbitrary string', 'not-an-interviewly-preset'],
        ])('rejects %s', async (_label, preset) => {
            const response = await request(app.getHttpServer())
                .patch(PRESET_ENDPOINT)
                .send({ preset });

            expect(response.status).toBe(400);
            expect(response.body.error).toEqual({
                statusCode: 400,
                code: 'AVATAR_PRESET_INVALID',
                message: 'Avatar preset không hợp lệ.',
            });
            expect(usersService.updateAvatar).not.toHaveBeenCalled();
        });

        it('rejects a missing preset', async () => {
            const response = await request(app.getHttpServer())
                .patch(PRESET_ENDPOINT)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AVATAR_PRESET_INVALID');
        });

        it('updates DB before cleaning an existing uploaded avatar', async () => {
            storageService.exists.mockResolvedValueOnce(true);

            const response = await request(app.getHttpServer())
                .patch(PRESET_ENDPOINT)
                .send({ preset: AVATAR_PRESETS[0] });

            expect(response.status).toBe(200);
            expect(storageService.exists).toHaveBeenCalledWith(
                getAvatarObjectKey(USER_ID),
            );
            expect(storageService.delete).toHaveBeenCalledWith(
                getAvatarObjectKey(USER_ID),
            );
            expect(
                usersService.updateAvatar.mock.invocationCallOrder[0],
            ).toBeLessThan(storageService.exists.mock.invocationCallOrder[0]);
        });

        it('keeps preset success when R2 cleanup fails', async () => {
            storageService.exists.mockRejectedValueOnce(
                new StorageException(
                    'STORAGE_CHECK_FAILED',
                    'Không thể kiểm tra tệp. Vui lòng thử lại sau.',
                ),
            );

            const response = await request(app.getHttpServer())
                .patch(PRESET_ENDPOINT)
                .send({ preset: AVATAR_PRESETS[0] });

            expect(response.status).toBe(200);
            expect(response.body.data.avatarUrl).toBe(
                getDiceBearAvatarUrl(AVATAR_PRESETS[0]),
            );
            expect(loggerWarnSpy).toHaveBeenCalled();
        });

        it('does not clean R2 when DB update fails', async () => {
            usersService.updateAvatar.mockRejectedValueOnce(
                new Error('simulated database failure'),
            );

            const response = await request(app.getHttpServer())
                .patch(PRESET_ENDPOINT)
                .send({ preset: AVATAR_PRESETS[0] });

            expect(response.status).toBe(500);
            expect(storageService.exists).not.toHaveBeenCalled();
            expect(storageService.delete).not.toHaveBeenCalled();
        });
    });

    describe('DELETE /profile/avatar', () => {
        it('sets DB to null then deletes an existing R2 avatar', async () => {
            storageService.exists.mockResolvedValueOnce(true);

            const response = await request(app.getHttpServer()).delete(
                AVATAR_ENDPOINT,
            );

            expect(response.status).toBe(200);
            expect(usersService.updateAvatar).toHaveBeenCalledWith(
                USER_ID,
                null,
            );
            expect(storageService.delete).toHaveBeenCalledWith(
                getAvatarObjectKey(USER_ID),
            );
            expect(response.body).toEqual({
                success: true,
                data: { avatarUrl: null },
            });
        });

        it.each(['DiceBear avatar', 'already null avatar'])(
            'is idempotent for %s when no R2 object exists',
            async () => {
                const response = await request(app.getHttpServer()).delete(
                    AVATAR_ENDPOINT,
                );

                expect(response.status).toBe(200);
                expect(storageService.exists).toHaveBeenCalledWith(
                    getAvatarObjectKey(USER_ID),
                );
                expect(storageService.delete).not.toHaveBeenCalled();
                expect(response.body.data.avatarUrl).toBeNull();
            },
        );

        it('remains idempotent when called repeatedly', async () => {
            await request(app.getHttpServer()).delete(AVATAR_ENDPOINT);
            const response = await request(app.getHttpServer()).delete(
                AVATAR_ENDPOINT,
            );

            expect(response.status).toBe(200);
            expect(usersService.updateAvatar).toHaveBeenCalledTimes(2);
            expect(response.body.data.avatarUrl).toBeNull();
        });

        it('keeps DB success when R2 delete fails', async () => {
            storageService.exists.mockResolvedValueOnce(true);
            storageService.delete.mockRejectedValueOnce(
                new StorageException(
                    'STORAGE_DELETE_FAILED',
                    'Không thể xóa tệp. Vui lòng thử lại sau.',
                ),
            );

            const response = await request(app.getHttpServer()).delete(
                AVATAR_ENDPOINT,
            );

            expect(response.status).toBe(200);
            expect(response.body.data.avatarUrl).toBeNull();
            expect(loggerWarnSpy).toHaveBeenCalled();
        });

        it('keeps DB success when R2 existence check fails', async () => {
            storageService.exists.mockRejectedValueOnce(
                new StorageException(
                    'STORAGE_CHECK_FAILED',
                    'Không thể kiểm tra tệp. Vui lòng thử lại sau.',
                ),
            );

            const response = await request(app.getHttpServer()).delete(
                AVATAR_ENDPOINT,
            );

            expect(response.status).toBe(200);
            expect(response.body.data.avatarUrl).toBeNull();
            expect(loggerWarnSpy).toHaveBeenCalled();
        });

        it('does not touch R2 when DB update fails', async () => {
            usersService.updateAvatar.mockRejectedValueOnce(
                new Error('simulated database failure'),
            );

            const response = await request(app.getHttpServer()).delete(
                AVATAR_ENDPOINT,
            );

            expect(response.status).toBe(500);
            expect(storageService.exists).not.toHaveBeenCalled();
            expect(storageService.delete).not.toHaveBeenCalled();
        });
    });
});

describe('Avatar API authentication', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [ProfileController],
            providers: [
                AvatarImageService,
                { provide: UsersService, useValue: usersService },
                { provide: StorageService, useValue: storageService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useClass(UnauthenticatedGuard)
            .compile();

        app = moduleRef.createNestApplication();
        configureApp(app);
        await app.init();
    });

    afterAll(async () => app.close());

    it.each([
        ['POST', () => request(app.getHttpServer()).post(AVATAR_ENDPOINT)],
        ['PATCH', () => request(app.getHttpServer()).patch(PRESET_ENDPOINT)],
        ['DELETE', () => request(app.getHttpServer()).delete(AVATAR_ENDPOINT)],
    ])(
        'requires authentication for %s avatar endpoint',
        async (_method, call) => {
            const response = await call();

            expect(response.status).toBe(401);
        },
    );
});
