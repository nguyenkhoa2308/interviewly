import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { StorageService } from './storage.service';
import { R2_S3_CLIENT, R2_URL_SIGNER } from './storage.tokens';

@Module({
    providers: [
        {
            provide: R2_S3_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                new S3Client({
                    region: 'auto',
                    endpoint: configService.getOrThrow<string>('R2_ENDPOINT'),
                    credentials: {
                        accessKeyId:
                            configService.getOrThrow<string>(
                                'R2_ACCESS_KEY_ID',
                            ),
                        secretAccessKey: configService.getOrThrow<string>(
                            'R2_SECRET_ACCESS_KEY',
                        ),
                    },
                }),
        },
        { provide: R2_URL_SIGNER, useValue: getSignedUrl },
        StorageService,
    ],
    exports: [StorageService],
})
export class StorageModule {}
