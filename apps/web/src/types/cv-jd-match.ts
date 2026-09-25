export type CvJdMatchStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';
export interface MatchScoreDimension { earned: number; maximum: number; reason: string }
export interface MatchScoreBreakdown {
    requiredSkills: MatchScoreDimension;
    preferredSkills: MatchScoreDimension;
    experienceAndRole: MatchScoreDimension;
    responsibilityEvidence: MatchScoreDimension;
    educationAndDomain: MatchScoreDimension;
}
export interface MatchEvidence { name: string; evidence: string }
export interface MatchGap { name: string; importance: 'REQUIRED' | 'PREFERRED'; explanation: string }
export interface MatchInsight { title: string; description: string; evidence: string | null }
export interface MatchRecommendation { title: string; description: string; type: 'CV_CLARITY' | 'PREPARE_KNOWLEDGE' | 'GAIN_EXPERIENCE'; priority: 'HIGH' | 'MEDIUM' | 'LOW' }
export interface CvJdMatchSummary {
    id: string; cvId: string; jobDescriptionId: string; status: CvJdMatchStatus;
    cvNameSnapshot: string; cvVersionNumber: number; jdTitleSnapshot: string;
    jdCompanySnapshot: string | null; cvUpdatedAtSnapshot: string;
    jdUpdatedAtSnapshot: string; matchScore: number | null;
    createdAt: string; completedAt: string | null;
}
export interface CvJdMatch extends CvJdMatchSummary {
    cvVersionId: string; cvAnalysisId: string; jdAnalysisId: string;
    matchSummary: string | null; scoreBreakdown: MatchScoreBreakdown | null; matchedSkills: MatchEvidence[] | null;
    skillGaps: MatchGap[] | null; strengths: MatchInsight[] | null;
    gaps: MatchInsight[] | null;
    experienceAlignment: { summary: string; jdExpectation: string | null; cvEvidence: string | null } | null;
    recommendations: MatchRecommendation[] | null;
    modelProvider: string | null; modelName: string | null; promptVersion: string | null;
    errorCode: string | null;
}
export interface MatchOptions {
    cvs: Array<{ id: string; name: string; originalFilename: string; isDefault: boolean; updatedAt: string; eligible: boolean; reason: string | null }>;
    jobDescriptions: Array<{ id: string; title: string; company: string | null; updatedAt: string; eligible: boolean; reason: string | null }>;
}
export interface MatchListResponse { items: CvJdMatchSummary[]; pagination: { page: number; limit: number; total: number; totalPages: number } }