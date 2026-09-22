import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import { StorageException } from './exceptions/storage.exception';
import {
    R2_S3_CLIENT,
    R2_URL_SIGNER,
    type R2UrlSigner,
} from './storage.tokens';

@Injectable()
export class StorageService {
    private readonly publicBucketName: string;
    private readonly privateBucketName: string;
    private readonly publicUrl: string;
    private readonly logger = new Logger(StorageService.name);

    constructor(
        configService: ConfigService,
        @Inject(R2_S3_CLIENT) private readonly client: S3Client,
        @Inject(R2_URL_SIGNER) private readonly urlSigner: R2UrlSigner,
    ) {
        this.publicBucketName =
            configService.getOrThrow<string>('R2_BUCKET_NAME');
        this.privateBucketName = configService.getOrThrow<string>(
            'R2_PRIVATE_BUCKET_NAME',
        );
        this.publicUrl = configService
            .getOrThrow<string>('R2_PUBLIC_URL')
            .replace(/\/+$/, '');
    }

    async upload(
        key: string,
        body: Buffer,
        contentType: string,
    ): Promise<void> {
        return this.uploadToBucket(
            this.publicBucketName,
            key,
            body,
            contentType,
        );
    }

    async uploadPrivate(
        key: string,
        body: Buffer,
        contentType: string,
    ): Promise<void> {
        return this.uploadToBucket(
            this.privateBucketName,
            key,
            body,
            contentType,
        );
    }

    private async uploadToBucket(
        bucket: string,
        key: string,
        body: Buffer,
        contentType: string,
    ): Promise<void> {
        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: body,
                    ContentType: contentType,
                }),
            );
        } catch (error) {
            this.logStorageFailure('upload', error);

            throw new StorageException(
                'STORAGE_UPLOAD_FAILED',
                'Không thể tải tệp lên. Vui lòng thử lại sau.',
            );
        }
    }

    async delete(key: string): Promise<void> {
        return this.deleteFromBucket(this.publicBucketName, key);
    }

    async deletePrivate(key: string): Promise<void> {
        return this.deleteFromBucket(this.privateBucketName, key);
    }

    private async deleteFromBucket(bucket: string, key: string): Promise<void> {
        try {
            await this.client.send(
                new DeleteObjectCommand({
                    Bucket: bucket,
                    Key: key,
                }),
            );
        } catch (error) {
            this.logStorageFailure('delete', error);

            throw new StorageException(
                'STORAGE_DELETE_FAILED',
                'Không thể xóa tệp. Vui lòng thử lại sau.',
            );
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.publicBucketName,
                    Key: key,
                }),
            );

            return true;
        } catch (error) {
            if (
                error instanceof S3ServiceException &&
                error.$metadata.httpStatusCode === 404
            ) {
                return false;
            }

            this.logStorageFailure('head', error);

            throw new StorageException(
                'STORAGE_CHECK_FAILED',
                'Không thể kiểm tra tệp. Vui lòng thử lại sau.',
            );
        }
    }

    getPublicUrl(key: string): string {
        return `${this.publicUrl}/${key}`;
    }

    async createPresignedGetUrl(
        key: string,
        expiresInSeconds: number,
    ): Promise<string> {
        if (
            !Number.isInteger(expiresInSeconds) ||
            expiresInSeconds < 1 ||
            expiresInSeconds > 3600
        ) {
            throw new StorageException(
                'STORAGE_INVALID_EXPIRY',
                'Thời hạn liên kết tải tệp phải từ 1 đến 3600 giây.',
            );
        }

        try {
            return await this.urlSigner(
                this.client,
                new GetObjectCommand({
                    Bucket: this.privateBucketName,
                    Key: key,
                }),
                { expiresIn: expiresInSeconds },
            );
        } catch (error) {
            this.logStorageFailure('presign', error);

            throw new StorageException(
                'STORAGE_SIGN_URL_FAILED',
                'Không thể tạo liên kết tải tệp. Vui lòng thử lại sau.',
            );
        }
    }

    private logStorageFailure(operation: string, error: unknown): void {
        this.logger.error({
            message: 'R2 operation failed.',
            operation,
            category:
                error instanceof S3ServiceException
                    ? 'S3_SERVICE_ERROR'
                    : error instanceof Error
                      ? error.name
                      : 'UNKNOWN_STORAGE_ERROR',
            statusCode:
                error instanceof S3ServiceException
                    ? error.$metadata.httpStatusCode
                    : undefined,
        });
    }
}
