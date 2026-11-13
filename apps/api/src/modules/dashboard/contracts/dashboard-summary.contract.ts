import { z } from 'zod';

const nonNegativeCountSchema = z.number().int().nonnegative();
const isoTimestampSchema = z.string().datetime({ offset: true });

const dashboardTrendSchema = z
    .object({
        currentPeriod: nonNegativeCountSchema,
        previousPeriod: nonNegativeCountSchema,
        percentageChange: z.number().int(),
        direction: z.enum(['UP', 'DOWN', 'UNCHANGED']),
    })
    .strict();

export const dashboardInterviewStatuses = [
    'DRAFT',
    'PLANNING',
    'READY',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
] as const;

export const dashboardInterviewTypes = [
    'HR',
    'BEHAVIORAL',
    'TECHNICAL',
    'CODING',
    'SYSTEM_DESIGN',
    'FULL',
] as const;

export const dashboardActivityTypes = [
    'CV_CREATED',
    'CV_ANALYSIS_COMPLETED',
    'JOB_DESCRIPTION_CREATED',
    'JOB_DESCRIPTION_ANALYSIS_COMPLETED',
    'CV_JD_MATCH_COMPLETED',
    'INTERVIEW_CREATED',
    'INTERVIEW_COMPLETED',
    'INTERVIEW_EVALUATION_COMPLETED',
] as const;

export const dashboardOverviewSchema = z
    .object({
        cvs: z
            .object({
                total: nonNegativeCountSchema,
                ready: nonNegativeCountSchema,
                trend: dashboardTrendSchema,
            })
            .strict(),
        jobDescriptions: z
            .object({
                total: nonNegativeCountSchema,
                analyzed: nonNegativeCountSchema,
                trend: dashboardTrendSchema,
            })
            .strict(),
        matches: z
            .object({
                total: nonNegativeCountSchema,
                completed: nonNegativeCountSchema,
                averageScore: z.number().min(0).max(100).nullable(),
                trend: dashboardTrendSchema,
            })
            .strict(),
    })
    .strict();

export const dashboardInterviewSummarySchema = z
    .object({
        total: nonNegativeCountSchema,
        draft: nonNegativeCountSchema,
        ready: nonNegativeCountSchema,
        inProgress: nonNegativeCountSchema,
        completed: nonNegativeCountSchema,
        averageScore: z.number().min(0).max(10).nullable(),
        trend: dashboardTrendSchema,
    })
    .strict();

export const dashboardRecentInterviewSchema = z
    .object({
        id: z.string().uuid(),
        targetRole: z.string().trim().min(1),
        interviewType: z.enum(dashboardInterviewTypes),
        status: z.enum(dashboardInterviewStatuses),
        score: z.number().min(0).max(10).nullable(),
        createdAt: isoTimestampSchema,
        completedAt: isoTimestampSchema.nullable(),
        href: z.string().startsWith('/interviews/'),
    })
    .strict();

export const dashboardPerformancePointSchema = z
    .object({
        id: z.string().uuid(),
        targetRole: z.string().trim().min(1),
        score: z.number().min(0).max(10),
        completedAt: isoTimestampSchema,
    })
    .strict();

export const dashboardActivityItemSchema = z
    .object({
        id: z.string().trim().min(1),
        type: z.enum(dashboardActivityTypes),
        title: z.string().trim().min(1),
        description: z.string().trim().min(1).nullable(),
        occurredAt: isoTimestampSchema,
        href: z.string().startsWith('/').nullable(),
    })
    .strict();

export const dashboardSummarySchema = z
    .object({
        overview: dashboardOverviewSchema,
        interviewSummary: dashboardInterviewSummarySchema,
        performanceHistory: z.array(dashboardPerformancePointSchema),
        recentInterviews: z.array(dashboardRecentInterviewSchema),
        recentActivity: z.array(dashboardActivityItemSchema),
    })
    .strict();

export const dashboardSummaryResponseSchema = z
    .object({
        success: z.literal(true),
        data: dashboardSummarySchema,
    })
    .strict();

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
export type DashboardInterviewSummary = z.infer<
    typeof dashboardInterviewSummarySchema
>;
export type DashboardRecentInterview = z.infer<
    typeof dashboardRecentInterviewSchema
>;
export type DashboardPerformancePoint = z.infer<
    typeof dashboardPerformancePointSchema
>;
export type DashboardActivityItem = z.infer<typeof dashboardActivityItemSchema>;
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type DashboardSummaryResponse = z.infer<
    typeof dashboardSummaryResponseSchema
>;
