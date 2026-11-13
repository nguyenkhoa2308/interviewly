// Mirrors apps/api/src/modules/dashboard/contracts/dashboard-summary.contract.ts.
export type DashboardInterviewStatus =
    'DRAFT' | 'PLANNING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type DashboardInterviewType =
    'HR' | 'BEHAVIORAL' | 'TECHNICAL' | 'CODING' | 'SYSTEM_DESIGN' | 'FULL';

export type DashboardActivityType =
    | 'CV_CREATED'
    | 'CV_ANALYSIS_COMPLETED'
    | 'JOB_DESCRIPTION_CREATED'
    | 'JOB_DESCRIPTION_ANALYSIS_COMPLETED'
    | 'CV_JD_MATCH_COMPLETED'
    | 'INTERVIEW_CREATED'
    | 'INTERVIEW_COMPLETED'
    | 'INTERVIEW_EVALUATION_COMPLETED';

export type DashboardRange = '7d' | '30d' | '90d';

export interface DashboardTrend {
    currentPeriod: number;
    previousPeriod: number;
    percentageChange: number;
    direction: 'UP' | 'DOWN' | 'UNCHANGED';
}

export interface DashboardSummary {
    overview: {
        cvs: { total: number; ready: number; trend: DashboardTrend };
        jobDescriptions: {
            total: number;
            analyzed: number;
            trend: DashboardTrend;
        };
        matches: {
            total: number;
            completed: number;
            averageScore: number | null;
            trend: DashboardTrend;
        };
    };
    interviewSummary: {
        total: number;
        draft: number;
        ready: number;
        inProgress: number;
        completed: number;
        averageScore: number | null;
        trend: DashboardTrend;
    };
    performanceHistory: DashboardPerformancePoint[];
    recentInterviews: DashboardRecentInterview[];
    recentActivity: DashboardActivityItem[];
}

export interface DashboardPerformancePoint {
    id: string;
    targetRole: string;
    score: number;
    completedAt: string;
}

export interface DashboardRecentInterview {
    id: string;
    targetRole: string;
    interviewType: DashboardInterviewType;
    status: DashboardInterviewStatus;
    score: number | null;
    createdAt: string;
    completedAt: string | null;
    href: string;
}

export interface DashboardActivityItem {
    id: string;
    type: DashboardActivityType;
    title: string;
    description: string | null;
    occurredAt: string;
    href: string | null;
}
