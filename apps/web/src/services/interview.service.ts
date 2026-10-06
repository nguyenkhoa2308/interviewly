import { deleteData, getData, postData } from '@/lib/api-client';
import { normalizeApiError } from '@/lib/api-error';
import type { ApiSuccessResponse } from '@/types/api';
import type {
    CreateInterviewPayload,
    Interview,
    InterviewOptions,
    InterviewPlanPreview,
    InterviewListResponse,
    InterviewListSort,
    InterviewStatus,
    InterviewRuntimeState,
    SubmitInterviewAnswerPayload,
} from '@/types/interview';

async function request<T>(fn: () => Promise<T>) {
    try {
        return await fn();
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export const getInterviewOptions = () =>
    request(
        async () =>
            (
                await getData<ApiSuccessResponse<InterviewOptions>>(
                    '/interviews/options',
                )
            ).data,
    );

export const getInterviews = (
    page = 1,
    status?: InterviewStatus,
    search?: string,
    sort: InterviewListSort = 'RECENTLY_UPDATED',
) =>
    request(
        async () =>
            (
                await getData<ApiSuccessResponse<InterviewListResponse>>(
                    `/interviews?page=${page}&limit=9${status ? `&status=${status}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}&sort=${sort}`,
                )
            ).data,
    );
export const previewInterviewPlan = (payload: CreateInterviewPayload) =>
    request(
        async () =>
            (
                await postData<ApiSuccessResponse<InterviewPlanPreview>>(
                    '/interviews/preview',
                    payload,
                )
            ).data,
    );

export const createInterview = (payload: CreateInterviewPayload) =>
    request(
        async () =>
            (
                await postData<ApiSuccessResponse<Interview>>(
                    '/interviews',
                    payload,
                )
            ).data,
    );

export const getInterview = (id: string) =>
    request(
        async () =>
            (await getData<ApiSuccessResponse<Interview>>(`/interviews/${id}`))
                .data,
    );

export const deleteInterview = (id: string) =>
    request(
        async () =>
            (
                await deleteData<ApiSuccessResponse<{ id: string }>>(
                    `/interviews/${id}`,
                )
            ).data,
    );

export const deleteInterviews = (ids: string[]) =>
    request(
        async () =>
            (
                await deleteData<ApiSuccessResponse<{ deletedCount: number }>>(
                    '/interviews/bulk',
                    { data: { ids } },
                )
            ).data,
    );

export const regenerateInterviewPlan = (id: string) =>
    request(
        async () =>
            (
                await postData<ApiSuccessResponse<Interview>>(
                    `/interviews/${id}/plans`,
                )
            ).data,
    );

export const getInterviewRuntime = (id: string) =>
    request(
        async () =>
            (
                await getData<ApiSuccessResponse<InterviewRuntimeState>>(
                    `/interviews/${id}/session`,
                )
            ).data,
    );

export const startInterview = (id: string) =>
    request(
        async () =>
            (
                await postData<ApiSuccessResponse<InterviewRuntimeState>>(
                    `/interviews/${id}/start`,
                )
            ).data,
    );

export const submitInterviewAnswer = (
    id: string,
    payload: SubmitInterviewAnswerPayload,
) =>
    request(
        async () =>
            (
                await postData<ApiSuccessResponse<InterviewRuntimeState>>(
                    `/interviews/${id}/session/answers`,
                    payload,
                )
            ).data,
    );
