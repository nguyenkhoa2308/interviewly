import { deleteData, getData, patchData, postData } from '@/lib/api-client';
import { normalizeApiError, ApiError } from '@/lib/api-error';
import type { ApiSuccessResponse } from '@/types/api';
import type {
    JdAnalysis,
    JdAnalysisHistoryParams,
    JdAnalysisHistoryResponse,
    JobDescriptionDetail,
    JobDescriptionListResponse,
    JobDescriptionPayload,
    JobDescriptionListSort,
    JobDescriptionListStatus,
} from '@/types/job-description';

async function request<T>(callback: () => Promise<T>): Promise<T> {
    try {
        return await callback();
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export const getJobDescriptions = (
    params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: JobDescriptionListStatus;
        sort?: JobDescriptionListSort;
    } = {},
) =>
    request(async () => {
        const response = await getData<
            ApiSuccessResponse<JobDescriptionListResponse>
        >('/job-descriptions', { params });
        return response.data;
    });
export const getJobDescription = (id: string) =>
    request(async () => {
        const response = await getData<
            ApiSuccessResponse<JobDescriptionDetail>
        >(`/job-descriptions/${id}`);
        return response.data;
    });
export const createJobDescription = (payload: JobDescriptionPayload) =>
    request(async () => {
        const response = await postData<
            ApiSuccessResponse<JobDescriptionDetail>
        >('/job-descriptions', payload);
        return response.data;
    });
export const updateJobDescription = (
    id: string,
    payload: Partial<JobDescriptionPayload>,
) =>
    request(async () => {
        const response = await patchData<
            ApiSuccessResponse<JobDescriptionDetail>
        >(`/job-descriptions/${id}`, payload);
        return response.data;
    });
export const deleteJobDescription = (id: string) =>
    request(async () => {
        const response = await deleteData<
            ApiSuccessResponse<{ id: string; deleted: boolean }>
        >(`/job-descriptions/${id}`);
        return response.data;
    });
export const analyzeJobDescription = (id: string) =>
    request(async () => {
        const response = await postData<ApiSuccessResponse<JdAnalysis>>(
            `/job-descriptions/${id}/analyze`,
        );
        return response.data;
    });
export const getLatestJdAnalysis = (id: string) =>
    request(async () => {
        try {
            const response = await getData<ApiSuccessResponse<JdAnalysis>>(
                `/job-descriptions/${id}/analyses/latest`,
            );
            return response.data;
        } catch (error) {
            const normalized = normalizeApiError(error);
            if (
                normalized instanceof ApiError &&
                normalized.statusCode === 404 &&
                normalized.code === 'JD_ANALYSIS_NOT_FOUND'
            )
                return null;
            throw normalized;
        }
    });
export const getJdAnalysisHistory = (
    id: string,
    params: JdAnalysisHistoryParams = {},
) =>
    request(async () => {
        const response = await getData<
            ApiSuccessResponse<JdAnalysisHistoryResponse>
        >('/job-descriptions/' + id + '/analyses', { params });
        return response.data;
    });
