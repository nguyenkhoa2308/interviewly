'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { cvKeys, normalizeCvListParams } from '@/hooks/cv/cv-keys';
import {
    compareCvs,
    compareCvVersions,
    getCvById,
    getCvs,
    getCvVersions,
} from '@/services/cv.service';
import type {
    CvDetail,
    CvListParams,
    CvListResponse,
    CvVersion,
    CvVersionComparison,
    CvComparison,
} from '@/types/cv';
import { ApiError } from '@/lib/api-error';
import { shouldRetryCvQuery } from './cv-query-retry';

export function useCvs(params: CvListParams = {}) {
    const normalizedParams = normalizeCvListParams(params);

    return useQuery<CvListResponse, ApiError>({
        queryKey: cvKeys.list(normalizedParams),
        queryFn: () => getCvs(normalizedParams),
        retry: shouldRetryCvQuery,
        meta: { requiresAuth: true },
    });
}

export function useCvVersions(cvId?: string) {
    return useQuery<CvVersion[], ApiError>({
        queryKey: cvKeys.versions(cvId ?? ''),
        queryFn: () => getCvVersions(cvId!),
        enabled: Boolean(cvId),
        retry: shouldRetryCvQuery,
        meta: { requiresAuth: true },
    });
}

export function useCvVersionComparison(
    cvId?: string,
    fromVersionId?: string,
    toVersionId?: string,
) {
    return useQuery<CvVersionComparison, ApiError>({
        queryKey: cvKeys.versionComparison(
            cvId ?? '',
            fromVersionId ?? '',
            toVersionId ?? '',
        ),
        queryFn: () => compareCvVersions(cvId!, fromVersionId!, toVersionId!),
        enabled: Boolean(
            cvId &&
            fromVersionId &&
            toVersionId &&
            fromVersionId !== toVersionId,
        ),
        retry: shouldRetryCvQuery,
        meta: { requiresAuth: true },
    });
}

export function useCvComparison(leftCvId?: string, rightCvId?: string) {
    return useQuery<CvComparison, ApiError>({
        queryKey: cvKeys.comparison(leftCvId ?? '', rightCvId ?? ''),
        queryFn: () => compareCvs(leftCvId!, rightCvId!),
        enabled: Boolean(leftCvId && rightCvId && leftCvId !== rightCvId),
        retry: shouldRetryCvQuery,
        meta: { requiresAuth: true },
    });
}

export function useCvManagementCollection(params: CvListParams) {
    const normalizedParams = normalizeCvListParams(params);
    return useQuery<CvListResponse, ApiError>({
        queryKey: cvKeys.list(normalizedParams),
        queryFn: () => getCvs(normalizedParams),
        placeholderData: keepPreviousData,
        retry: shouldRetryCvQuery,
        meta: { requiresAuth: true },
    });
}

export function useCv(cvId?: string) {
    return useQuery<CvDetail, ApiError>({
        queryKey: cvKeys.detail(cvId ?? ''),
        queryFn: () => getCvById(cvId!),
        enabled: Boolean(cvId),
        retry: shouldRetryCvQuery,
        meta: { requiresAuth: true },
    });
}
