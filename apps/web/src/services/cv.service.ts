import { deleteData, getData, patchData, postData } from '@/lib/api-client';
import { normalizeApiError } from '@/lib/api-error';
import { ApiError } from '@/lib/api-error';
import type { ApiSuccessResponse } from '@/types/api';
import type {
    CvDetail,
    CvAnalysis,
    CvAnalysisHistoryParams,
    CvAnalysisHistoryResponse,
    CvListParams,
    CvListResponse,
    CvListItem,
    DeleteCvResult,
    RenameCvPayload,
    UploadedCv,
    UploadCvPayload,
    CvVersion,
    CvVersionComparison,
    CvComparison,
} from '@/types/cv';

export async function getCvs(
    params: CvListParams = {},
): Promise<CvListResponse> {
    return runCvRequest(async () => {
        const response = await getData<ApiSuccessResponse<CvListResponse>>(
            '/cvs',
            { params },
        );
        return response.data;
    });
}

export async function getCvById(cvId: string): Promise<CvDetail> {
    return runCvRequest(async () => {
        const response = await getData<ApiSuccessResponse<CvDetail>>(
            `/cvs/${cvId}`,
        );
        return response.data;
    });
}

export async function uploadCv(payload: UploadCvPayload): Promise<UploadedCv> {
    return runCvRequest(async () => {
        const formData = new FormData();
        formData.append('name', payload.name);
        formData.append('file', payload.file);

        const response = await postData<ApiSuccessResponse<UploadedCv>>(
            '/cvs',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data;
    });
}

export async function getCvVersions(cvId: string): Promise<CvVersion[]> {
    return runCvRequest(async () => {
        const response = await getData<ApiSuccessResponse<CvVersion[]>>(
            `/cvs/${cvId}/versions`,
        );
        return response.data;
    });
}

export async function compareCvVersions(
    cvId: string,
    fromVersionId: string,
    toVersionId: string,
): Promise<CvVersionComparison> {
    return runCvRequest(async () => {
        const response = await getData<ApiSuccessResponse<CvVersionComparison>>(
            `/cvs/${cvId}/versions/compare`,
            { params: { fromVersionId, toVersionId } },
        );
        return response.data;
    });
}

export async function compareCvs(
    leftCvId: string,
    rightCvId: string,
): Promise<CvComparison> {
    return runCvRequest(async () => {
        const response = await getData<ApiSuccessResponse<CvComparison>>(
            '/cvs/compare',
            {
                params: { leftCvId, rightCvId },
            },
        );
        return response.data;
    });
}

export async function uploadCvVersion(
    cvId: string,
    file: File,
): Promise<CvDetail> {
    return runCvRequest(async () => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await postData<ApiSuccessResponse<CvDetail>>(
            `/cvs/${cvId}/versions`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data;
    });
}

export async function setCurrentCvVersion(
    cvId: string,
    versionId: string,
): Promise<CvDetail> {
    return runCvRequest(async () => {
        const response = await patchData<ApiSuccessResponse<CvDetail>>(
            `/cvs/${cvId}/versions/${versionId}/current`,
            {},
        );
        return response.data;
    });
}

export async function renameCv(
    cvId: string,
    payload: RenameCvPayload,
): Promise<CvListItem> {
    return runCvRequest(async () => {
        const response = await patchData<ApiSuccessResponse<CvListItem>>(
            `/cvs/${cvId}`,
            payload,
        );
        return response.data;
    });
}

export async function setDefaultCv(cvId: string): Promise<CvListItem> {
    return runCvRequest(async () => {
        const response = await patchData<ApiSuccessResponse<CvListItem>>(
            `/cvs/${cvId}/default`,
        );
        return response.data;
    });
}

export async function deleteCv(cvId: string): Promise<DeleteCvResult> {
    return runCvRequest(async () => {
        const response = await deleteData<ApiSuccessResponse<DeleteCvResult>>(
            `/cvs/${cvId}`,
        );
        return response.data;
    });
}

export async function analyzeCv(cvId: string): Promise<CvAnalysis> {
    return runCvRequest(async () => {
        const response = await postData<ApiSuccessResponse<CvAnalysis>>(
            `/cvs/${cvId}/analyze`,
        );
        return response.data;
    });
}

export async function getLatestCvAnalysis(
    cvId: string,
): Promise<CvAnalysis | null> {
    try {
        return await runCvRequest(async () => {
            const response = await getData<ApiSuccessResponse<CvAnalysis>>(
                `/cvs/${cvId}/analyses/latest`,
            );
            return response.data;
        });
    } catch (error) {
        if (
            error instanceof ApiError &&
            error.statusCode === 404 &&
            error.code === 'CV_ANALYSIS_NOT_FOUND'
        ) {
            return null;
        }
        throw error;
    }
}

export async function getCvAnalysisHistory(
    cvId: string,
    params: CvAnalysisHistoryParams = {},
): Promise<CvAnalysisHistoryResponse> {
    return runCvRequest(async () => {
        const response = await getData<
            ApiSuccessResponse<CvAnalysisHistoryResponse>
        >(`/cvs/${cvId}/analyses`, { params });
        return response.data;
    });
}

async function runCvRequest<T>(request: () => Promise<T>): Promise<T> {
    try {
        return await request();
    } catch (error) {
        throw normalizeApiError(error);
    }
}
