import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import {
    DeleteObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import { StorageException } from './exceptions/storage.exception';

@Injectable()
export class StorageService {
    private readonly client: S3Client;
    private readonly bucketName: string;
    private readonly publicUrl: string;
    private readonly logger = new Logger(StorageService.name);

    constructor(private readonly configService: ConfigService) {
        this.bucketName =
            this.configService.getOrThrow<string>('R2_BUCKET_NAME');
        this.client = new S3Client({
            region: 'auto',
            endpoint: this.configService.getOrThrow<string>('R2_ENDPOINT'),
            credentials: {
                accessKeyId:
                    this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.getOrThrow<string>(
                    'R2_SECRET_ACCESS_KEY',
                ),
            },
        });
        this.publicUrl = this.configService
            .getOrThrow<string>('R2_PUBLIC_URL')
            .replace(/\/+$/, '');
    }

    async upload(
        key: string,
        body: Buffer,
        contentType: string,
    ): Promise<void> {
        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: body,
                    ContentType: contentType,
                }),
            );
        } catch (error) {
            this.logger.error(
                `Failed to upload object "${key}" to R2`,
                error instanceof Error ? error.stack : String(error),
            );

            throw new StorageException(
                'STORAGE_UPLOAD_FAILED',
                'Không thể tải tệp lên. Vui lòng thử lại sau.',
            );
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                }),
            );
        } catch (error) {
            this.logger.error(
                `Failed to delete object "${key}" from R2`,
                error instanceof Error ? error.stack : String(error),
            );

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
                    Bucket: this.bucketName,
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

            this.logger.error(
                `Failed to check object "${key}" in R2`,
                error instanceof Error ? error.stack : String(error),
            );

            throw new StorageException(
                'STORAGE_CHECK_FAILED',
                'Không thể kiểm tra tệp. Vui lòng thử lại sau.',
            );
        }
    }

    getPublicUrl(key: string): string {
        return `${this.publicUrl}/${key}`;
    }
}
