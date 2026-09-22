import type { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const R2_S3_CLIENT = Symbol('R2_S3_CLIENT');
export const R2_URL_SIGNER = Symbol('R2_URL_SIGNER');

export type R2UrlSigner = typeof getSignedUrl;
