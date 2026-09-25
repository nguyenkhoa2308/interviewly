import type { CvAnalysisHistoryParams, CvListParams } from '@/types/cv';

export const cvKeys = {
    all: ['cvs'] as const,
    lists: () => [...cvKeys.all, 'list'] as const,
    list: (params: CvListParams = {}) =>
        [...cvKeys.lists(), normalizeCvListParams(params)] as const,
    details: () => [...cvKeys.all, 'detail'] as const,
    detail: (cvId: string) => [...cvKeys.details(), cvId] as const,
    versions: (cvId: string) => [...cvKeys.detail(cvId), 'versions'] as const,
    versionComparison: (
        cvId: string,
        fromVersionId: string,
        toVersionId: string,
    ) =>
        [
            ...cvKeys.versions(cvId),
            'compare',
            fromVersionId,
            toVersionId,
        ] as const,
    comparison: (leftCvId: string, rightCvId: string) =>
        [...cvKeys.all, 'compare', leftCvId, rightCvId] as const,
    analyses: (cvId: string) => [...cvKeys.detail(cvId), 'analysis'] as const,
    analysisLatest: (cvId: string) =>
        [...cvKeys.analyses(cvId), 'latest'] as const,
    analysisHistories: (cvId: string) =>
        [...cvKeys.analyses(cvId), 'history'] as const,
    analysisHistory: (cvId: string, params: CvAnalysisHistoryParams = {}) =>
        [
            ...cvKeys.analysisHistories(cvId),
            { page: params.page ?? 1, limit: params.limit ?? 20 },
        ] as const,
};

export function normalizeCvListParams(
    params: CvListParams = {},
): Required<Pick<CvListParams, 'page' | 'limit'>> &
    Pick<CvListParams, 'status' | 'search' | 'sort'> {
    return {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { search: params.search } : {}),
        ...(params.sort ? { sort: params.sort } : {}),
    };
}
