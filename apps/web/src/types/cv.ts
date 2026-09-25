export type CvProcessingStatus =
    'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface CvListItem {
    id: string;
    name: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number | null;
    processingStatus: CvProcessingStatus;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CvDetail extends CvListItem {
    extractedText: string | null;
    structuredContent?: CvStructuredContent | null;
}

export interface CvStructuredLine {
    type: 'TEXT' | 'BULLET' | 'TECHNOLOGIES' | 'LINKS';
    content: string;
}

export interface CvStructuredItem {
    title: string | null;
    subtitle: string | null;
    dateText: string | null;
    lines: CvStructuredLine[];
}

export interface CvStructuredSection {
    title: string;
    items: CvStructuredItem[];
}

export interface CvStructuredContent {
    header: {
        name: string | null;
        headline: string | null;
        contacts: string[];
    };
    sections: CvStructuredSection[];
}

export interface UploadedCv {
    id: string;
    name: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number | null;
    processingStatus: CvProcessingStatus;
    isDefault: boolean;
    createdAt: string;
}

export interface CvListParams {
    status?: CvProcessingStatus;
    search?: string;
    sort?: 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'NAME_DESC';
    page?: number;
    limit?: number;
}

export interface CvPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface CvListResponse {
    items: CvListItem[];
    counts?: {
        ALL: number;
        READY: number;
        PROCESSING: number;
        FAILED: number;
    };
    pagination: CvPagination;
}

export interface UploadCvPayload {
    name: string;
    file: File;
}

export interface CvVersion {
    id: string;
    cvId: string;
    versionNumber: number;
    originalFilename: string;
    mimeType: string;
    fileSize: number | null;
    processingStatus: CvProcessingStatus;
    isCurrent: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CvVersionComparisonSide {
    id: string;
    versionNumber: number;
    originalFilename: string;
    createdAt: string;
    analysis: Pick<
        CvAnalysis,
        'id' | 'overallScore' | 'detectedRole' | 'detectedLevel' | 'completedAt'
    > | null;
}

export interface CvVersionComparison {
    from: CvVersionComparisonSide;
    to: CvVersionComparisonSide;
    comparison: {
        scoreDelta: number | null;
        skills: { added: string[]; removed: string[]; retained: string[] };
        strengthCountDelta: number;
        weaknessCountDelta: number;
        riskCountDelta: number;
    } | null;
}

export interface CvComparison {
    left: {
        id: string;
        name: string;
        analysis: CvVersionComparisonSide['analysis'];
    };
    right: {
        id: string;
        name: string;
        analysis: CvVersionComparisonSide['analysis'];
    };
    comparison: CvVersionComparison['comparison'];
}

export interface RenameCvPayload {
    name: string;
}

export interface DeleteCvResult {
    id: string;
    deletedAt: string;
}

export type CvAnalysisStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ExperienceLevel =
    'INTERN' | 'FRESHER' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD';

export interface CvAnalysisSkill {
    name: string;
    category: string | null;
    evidence: string | null;
}

export interface CvAnalysisWorkExperience {
    company: string | null;
    role: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
    technologies: string[];
}

export interface CvAnalysisProject {
    name: string | null;
    description: string | null;
    technologies: string[];
}

export interface CvAnalysisEducation {
    institution: string | null;
    degree: string | null;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
}

export interface CvAnalysisInsight {
    title: string;
    description: string;
    evidence: string | null;
}

export interface CvAnalysisQuestion {
    question: string;
    reason: string | null;
    basedOn: string | null;
}

export interface CvAnalysisSuggestion {
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CvAnalysis {
    id: string;
    cvId: string;
    status: CvAnalysisStatus;
    overallScore: number | null;
    detectedRole: string | null;
    detectedLevel: ExperienceLevel | null;
    extractedSkills: CvAnalysisSkill[] | null;
    workExperiences: CvAnalysisWorkExperience[] | null;
    projects: CvAnalysisProject[] | null;
    education: CvAnalysisEducation[] | null;
    strengths: CvAnalysisInsight[] | null;
    weaknesses: CvAnalysisInsight[] | null;
    interviewRisks: CvAnalysisInsight[] | null;
    potentialQuestions: CvAnalysisQuestion[] | null;
    suggestions: CvAnalysisSuggestion[] | null;
    modelProvider: string | null;
    modelName: string | null;
    promptVersion: string | null;
    createdAt: string;
    completedAt: string | null;
}

export interface CvAnalysisHistoryParams {
    page?: number;
    limit?: number;
}

export interface CvAnalysisSummary {
    id: string;
    cvId: string;
    status: CvAnalysisStatus;
    overallScore: number | null;
    detectedRole: string | null;
    detectedLevel: ExperienceLevel | null;
    createdAt: string;
    completedAt: string | null;
}

export interface CvAnalysisHistoryResponse {
    items: CvAnalysisSummary[];
    pagination: CvPagination;
}
