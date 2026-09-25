import { getData, postData } from '@/lib/api-client';
import { normalizeApiError } from '@/lib/api-error';
import type { ApiSuccessResponse } from '@/types/api';
import type { CvJdMatch, MatchListResponse, MatchOptions } from '@/types/cv-jd-match';

async function request<T>(fn: () => Promise<T>): Promise<T> {
    try { return await fn(); } catch (error) { throw normalizeApiError(error); }
}
export const getMatchOptions = () => request(async () => (await getData<ApiSuccessResponse<MatchOptions>>('/cv-jd-matches/options')).data);
export const createCvJdMatch = (payload: { cvId: string; jobDescriptionId: string }) => request(async () => (await postData<ApiSuccessResponse<CvJdMatch>>('/cv-jd-matches', payload)).data);
export const getCvJdMatch = (id: string) => request(async () => (await getData<ApiSuccessResponse<CvJdMatch>>(`/cv-jd-matches/${id}`)).data);
export const getCvJdMatches = (params: { page?: number; limit?: number; cvId?: string; jobDescriptionId?: string } = {}) => request(async () => (await getData<ApiSuccessResponse<MatchListResponse>>('/cv-jd-matches', { params })).data);