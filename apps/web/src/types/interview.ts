export type InterviewType =
    'HR' | 'BEHAVIORAL' | 'TECHNICAL' | 'CODING' | 'SYSTEM_DESIGN' | 'FULL';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'ADAPTIVE';
export interface InterviewCvOption {
    id: string;
    name: string;
    originalFilename: string;
    fileSize: number | null;
    isDefault: boolean;
    updatedAt: string;
    analysis: {
        detectedRole: string | null;
        detectedLevel: string | null;
        extractedSkills: Array<{ name?: string; category?: string }> | null;
        workExperiences: unknown[] | null;
        projects: unknown[] | null;
        education: Array<{ institution?: string; degree?: string }> | null;
    };
}
export interface InterviewJobOption {
    id: string;
    title: string;
    company: string | null;
    updatedAt: string;
    analysis: {
        detectedRole: string | null;
        seniority: string | null;
        requiredSkills: string[] | null;
        preferredSkills: string[] | null;
        interviewFocus: string[] | null;
    };
}
export interface InterviewOptions {
    cvs: InterviewCvOption[];
    jobDescriptions: InterviewJobOption[];
    matches: Array<{
        id: string;
        cvId: string;
        jobDescriptionId: string;
        matchScore: number | null;
        strengths: Array<{ title?: string; description?: string }> | null;
        gaps: Array<{ title?: string; description?: string }> | null;
        createdAt: string;
    }>;
    defaults: {
        targetRole: string | null;
        targetLevel: string | null;
        interviewType: InterviewType;
        difficulty: Difficulty;
        durationMinutes: 15 | 30 | 45 | 60;
    };
}
export interface InterviewPlanData {
    summary: string;
    openingStrategy: string;
    difficultyStrategy: string;
    sections: Array<{
        title: string;
        objective: string;
        durationMinutes: number;
        questions: Array<{
            order: number;
            type:
                | 'GENERAL'
                | 'TECHNICAL'
                | 'PROJECT'
                | 'BEHAVIORAL'
                | 'CANDIDATE';
            topic: string;
            priority?: 'KEY' | 'HIGH' | 'MEDIUM' | 'LOW';
            expectedDepth?:
                'FOUNDATION' | 'PRACTICAL' | 'TRADE_OFF' | 'ARCHITECTURE';
            evidenceObjectives?: string[];
            probeAreas?: string[];
            objective: string;
            difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
            suggestedQuestion: string;
            reasonToAsk: string | null;
            sourceEvidence: Array<{ source: string; reference: string }>;
            expectedSignals: string[];
            followUpStrategy: {
                ifShallow: string | null;
                ifStrong: string | null;
                maxDepth: number;
            };
        }>;
    }>;
    strengthsToValidate: string[];
    gapsToProbe: string[];
    projectAreasToExplore: string[];
    behavioralCompetencies: string[];
    technicalCompetencies: string[];
    adaptationGuidance: string[];
}
export interface Interview {
    id: string;
    status: string;
    interviewType: InterviewType;
    difficulty: Difficulty;
    durationMinutes: number;
    questionCount: number;
    focusAreas: string[];
    targetRole: string;
    targetLevel: string | null;
    createdAt: string;
    cv: { id: string; name: string };
    jobDescription: { id: string; title: string; company: string | null };
    plans: Array<{
        id: string;
        version: number;
        status: string;
        summary: string;
        planData: InterviewPlanData;
        modelProvider: string;
        modelName: string;
        promptVersion: string;
        createdAt: string;
        completedAt: string;
    }>;
}
export interface CreateInterviewPayload {
    saveAsDraft?: boolean;
    previewToken?: string;
    cvId: string;
    jobDescriptionId: string;
    cvJdMatchId?: string;
    interviewType: InterviewType;
    difficulty: Difficulty;
    durationMinutes: 15 | 30 | 45 | 60;
    questionCount: number;
    focusAreas: string[];
    targetRole: string;
    targetLevel?: string | null;
}

export interface InterviewPlanPreview {
    planData: InterviewPlanData;
    metadata: {
        modelProvider: string;
        modelName: string;
        promptVersion: string;
    };
    previewToken: string;
}

export type InterviewStatus =
    'DRAFT' | 'PLANNING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type InterviewListSort = 'RECENTLY_UPDATED' | 'NEWEST' | 'OLDEST';

export interface InterviewListItem {
    id: string;
    status: InterviewStatus;
    interviewType: InterviewType;
    difficulty: Difficulty;
    durationMinutes: number;
    questionCount: number;
    targetRole: string;
    targetLevel: string | null;
    createdAt: string;
    updatedAt: string;
    cv: { id: string; name: string };
    jobDescription: {
        id: string;
        title: string;
        company: string | null;
    };
    plans: Array<{ summary: string | null; version: number }>;
}

export interface InterviewListResponse {
    items: InterviewListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface InterviewRuntimeState {
    interview: {
        id: string;
        status: InterviewStatus;
        interviewType: InterviewType;
        targetRole: string;
        targetLevel: string | null;
        durationMinutes: number;
    };
    session: {
        id: string;
        planId: string;
        planVersion: number;
        startedAt: string;
        completedAt: string | null;
    } | null;
    currentTurn: {
        id: string;
        ordinal: number;
        sectionIndex: number;
        sectionTitle: string;
        questionType: InterviewPlanData['sections'][number]['questions'][number]['type'];
        questionText: string;
        isAdaptive: boolean;
        transition: string | null;
    } | null;
    progress: {
        completedQuestions: number;
        totalQuestions: number;
        percentage: number;
        currentSection: string | null;
        sectionNumber: number;
        totalSections: number;
    };
    processing: boolean;
    completed: boolean;
}

export interface SubmitInterviewAnswerPayload {
    turnId: string;
    answer: string;
}
