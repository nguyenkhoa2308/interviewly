# Phase 10.2 — Dashboard data contract

## Endpoint boundary

- Endpoint: `GET /api/v1/dashboard/summary?range=7d|30d|90d` (`30d` by default).
- Authentication is required. The authenticated principal is the only source of ownership; the request accepts no `userId`.
- The controller will return `DashboardSummary`. The existing global response interceptor wraps it as `{ success: true, data: DashboardSummary }`.
- The selected range applies to headline counts, averages, performance history, recent lists, and activities. Trends compare that range with the immediately preceding range of equal length.

The executable schema lives in `dashboard-summary.contract.ts`.

## Exact response shape

```ts
type DashboardSummary = {
    overview: {
        cvs: { total: number; ready: number };
        jobDescriptions: { total: number; analyzed: number };
        matches: {
            total: number;
            completed: number;
            averageScore: number | null; // 0..100
        };
    };
    interviewSummary: {
        total: number;
        draft: number;
        ready: number;
        inProgress: number;
        completed: number;
        averageScore: number | null; // 0..10
    };
    performanceHistory: DashboardPerformancePoint[];
    recentInterviews: DashboardRecentInterview[];
    recentActivity: DashboardActivityItem[];
};
```

## Metric semantics

Every query is scoped to the authenticated user's ownership relation and selected time range. Soft-deleted resources are excluded wherever a `deletedAt` field exists.

| Metric                                         | Source                              | Exact rule                                                                                                                                                |
| ---------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cvs.total`                                    | `CV`                                | Owned, non-deleted CVs created in the selected range                                                                                                      |
| `cvs.ready`                                    | `CV`                                | Total rule plus `processingStatus = READY`                                                                                                                |
| `jobDescriptions.total`                        | `JobDescription`                    | Owned, non-deleted JDs created in the selected range                                                                                                      |
| `jobDescriptions.analyzed`                     | `JobDescription` + `JDAnalysis`     | Count distinct non-deleted owned JDs for which at least one related analysis has `status = COMPLETED`. Re-analysis never increments the JD twice.         |
| `matches.total`                                | `CVJDMatch`                         | Owned matches created in the selected range, regardless of lifecycle status                                                                               |
| `matches.completed`                            | `CVJDMatch`                         | Owned match with `status = COMPLETED`                                                                                                                     |
| `matches.averageScore`                         | `CVJDMatch`                         | Arithmetic mean of `matchScore` only for owned `COMPLETED` matches with a non-null score in the database-valid `0..100` range                             |
| `interviewSummary.total`                       | `Interview`                         | Owned interviews created in the selected range, including every persisted lifecycle status                                                               |
| `draft` / `ready` / `inProgress` / `completed` | `Interview`                         | Exact status equality with `DRAFT`, `READY`, `IN_PROGRESS`, and `COMPLETED`. `PLANNING` and `CANCELLED` remain in `total` but not in those named buckets. |
| `interviewSummary.averageScore`                | `Interview` + `InterviewEvaluation` | Arithmetic mean of `overallScore` where the owned interview is `COMPLETED`, its evaluation is `COMPLETED`, and score is non-null and within `0..10`       |

All averages are rounded to two decimal places at the serialization boundary. `0` is a legitimate score and must not be converted to `null`. When no eligible rows exist, the average is `null`, never `0`.

## Performance history

`performanceHistory` contains every completed, valid `0..10` interview evaluation whose completion timestamp falls inside the selected range. It is ordered by `completedAt ASC`, then `id ASC`, and is separate from the explicitly limited recent-interview presentation list.

### Interview versus evaluation completion

- `Interview.status = COMPLETED` means the interview session finished.
- `InterviewEvaluation.status = COMPLETED` means the evaluation report finished.
- A completed interview with a missing, pending, processing, or failed evaluation contributes to `interviewSummary.completed`, but not to its average score.
- A completed evaluation attached to a non-completed interview is excluded from the dashboard average as an inconsistent lifecycle pair.
- The current schema makes both `InterviewEvaluation.interviewId` and `sessionId` unique. Therefore an interview has at most one evaluation and no latest-evaluation tie-break is needed. A future schema that permits evaluation history must explicitly revise this contract.

## Recent interviews

```ts
type DashboardRecentInterview = {
    id: string;
    targetRole: string;
    interviewType: InterviewType;
    status: InterviewStatus;
    score: number | null;
    createdAt: string;
    completedAt: string | null;
    href: string;
};
```

- Scope: owned interviews only.
- Score follows the same eligibility rule as the interview average.
- Sort: `Interview.createdAt DESC`, then `Interview.id DESC`.
- The service applies an explicit limit; the contract does not encode a presentation count.
- `completedAt` comes from `InterviewSession.completedAt`; `Interview` has no completion timestamp.

## Recent activity

No audit/activity model exists, so activity is a read projection of reliable persisted events only.

| Type                                 | Record and timestamp                                      |
| ------------------------------------ | --------------------------------------------------------- |
| `CV_CREATED`                         | `CV.createdAt`                                            |
| `CV_ANALYSIS_COMPLETED`              | `CVAnalysis.completedAt` with status `COMPLETED`          |
| `JOB_DESCRIPTION_CREATED`            | `JobDescription.createdAt`                                |
| `JOB_DESCRIPTION_ANALYSIS_COMPLETED` | `JDAnalysis.completedAt` with status `COMPLETED`          |
| `CV_JD_MATCH_COMPLETED`              | `CVJDMatch.completedAt` with status `COMPLETED`           |
| `INTERVIEW_CREATED`                  | `Interview.createdAt`                                     |
| `INTERVIEW_COMPLETED`                | `InterviewSession.completedAt`                            |
| `INTERVIEW_EVALUATION_COMPLETED`     | `InterviewEvaluation.completedAt` with status `COMPLETED` |

```ts
type DashboardActivityItem = {
    id: string; // `${type}:${sourceRecordId}`
    type: DashboardActivityType;
    title: string;
    description: string | null;
    occurredAt: string;
    href: string | null;
};
```

- Creation activities for a subsequently soft-deleted CV/JD are excluded.
- Child analysis activities are included only when their parent CV/JD is currently owned and not soft deleted.
- Match, interview, session, and evaluation activities are scoped through their persisted ownership relation.
- Rows without the required event timestamp are not fabricated.
- Merge all eligible projections, sort by `occurredAt DESC`, then `id ASC` as deterministic tie-breaker, and only then apply the explicit limit.
- Titles and descriptions are server-owned display strings; AI does not create dashboard activity.

## Empty, null, duplicate, and ownership rules

- Counts are non-negative integers and return `0` when empty.
- Collections return `[]`, never `null`.
- Missing averages and scores return `null`.
- A real score of `0` remains `0`.
- JD analysis count is distinct by parent JD.
- Ownership identifiers and token/session data are never serialized.
- Strict runtime schemas reject unknown fields such as `userId`.
- ISO timestamps include an offset, normally UTC `Z`.
