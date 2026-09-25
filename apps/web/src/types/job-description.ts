export type JdAnalysisStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type JobDescriptionListStatus =
    'ALL' | 'ANALYZED' | 'NOT_ANALYZED' | 'FAILED';
export type JobDescriptionListSort =
    'RECENTLY_UPDATED' | 'NEWEST' | 'OLDEST' | 'TITLE';

export interface JobDescriptionListItem {
    id: string;
    title: string;
    company: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
    analyses: Array<
        Pick<
            JdAnalysis,
            'id' | 'status' | 'detectedRole' | 'seniority' | 'completedAt'
        >
    >;
}

export interface JobDescriptionDetail {
    id: string;
    title: string;
    company: string | null;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface JdAnalysis {
    id: string;
    jobDescriptionId: string;
    status: JdAnalysisStatus;
    detectedRole: string | null;
    seniority: string | null;
    summary: string | null;
    requiredSkills: string[] | null;
    preferredSkills: string[] | null;
    responsibilities: string[] | null;
    requirements: string[] | null;
    keywords: string[] | null;
    interviewFocus: string[] | null;
    insights: string[] | null;
    modelProvider: string | null;
    modelName: string | null;
    promptVersion: string | null;
    createdAt: string;
    completedAt: string | null;
}

export interface JobDescriptionPayload {
    title: string;
    company?: string | null;
    content: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
export interface JobDescriptionListResponse {
    items: JobDescriptionListItem[];
    pagination: Pagination;
}
export interface JdAnalysisHistoryParams {
    page?: number;
    limit?: number;
}
export interface JdAnalysisHistoryResponse {
    items: Array<
        Pick<
            JdAnalysis,
            | 'id'
            | 'jobDescriptionId'
            | 'status'
            | 'detectedRole'
            | 'seniority'
            | 'createdAt'
            | 'completedAt'
        >
    >;
    pagination: Pagination;
}
