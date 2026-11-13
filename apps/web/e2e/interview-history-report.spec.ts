import { expect, test, type Page, type Route } from '@playwright/test';

const interviewId = '223f229d-0294-43c1-a77f-be16ce77b3d2';
const turnId = 'd71fb937-afdc-4005-b9dc-5bbdc0060d91';
const corsHeaders = {
    'access-control-allow-origin': 'http://localhost:3100',
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'Content-Type',
};

function json(route: Route, data: unknown) {
    return route.fulfill({
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data }),
    });
}

async function mockAuthenticatedHistory(page: Page) {
    await page.context().addCookies([
        {
            name: 'access_token',
            value: 'playwright-session',
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
        },
    ]);

    await page.route('http://localhost:2308/api/v1/**', async (route) => {
        if (route.request().method() === 'OPTIONS') {
            await route.fulfill({ status: 204, headers: corsHeaders });
            return;
        }

        const url = new URL(route.request().url());
        const pathname = url.pathname;

        if (pathname.endsWith('/auth/me')) {
            await json(route, {
                id: 'user-1',
                email: 'khoa@example.com',
                fullName: 'Nguyễn Đức Khoa',
                avatarUrl: null,
                emailVerifiedAt: '2026-09-01T00:00:00.000Z',
                status: 'ACTIVE',
                role: 'USER',
                onboardingCompletedAt: '2026-09-01T00:00:00.000Z',
                createdAt: '2026-09-01T00:00:00.000Z',
                hasPassword: true,
                connectedProviders: [],
            });
            return;
        }

        if (pathname.endsWith('/interviews/history')) {
            await json(route, {
                items: [historyItem()],
                pagination: {
                    page: Number(url.searchParams.get('page') ?? 1),
                    limit: 9,
                    total: 1,
                    totalPages: 1,
                },
            });
            return;
        }

        if (pathname.endsWith(`/interviews/${interviewId}/evaluation`)) {
            await json(route, evaluationResponse());
            return;
        }

        if (pathname.endsWith(`/interviews/${interviewId}/question-reviews`)) {
            await json(route, {
                interviewId,
                status: 'COMPLETED',
                reviews: {
                    schemaVersion: 1,
                    answerReviews: evaluationResponse().report.answerReviews,
                },
                canRetry: false,
                attemptCount: 1,
            });
            return;
        }

        if (pathname.endsWith(`/interviews/${interviewId}/transcript`)) {
            await json(route, transcriptResponse());
            return;
        }

        if (pathname.endsWith(`/interviews/${interviewId}`)) {
            await json(route, {
                id: interviewId,
                targetRole: 'Frontend Developer',
                targetLevel: 'JUNIOR',
                interviewType: 'TECHNICAL',
                durationMinutes: 60,
                questionCount: 1,
                status: 'COMPLETED',
            });
            return;
        }

        await route.fulfill({
            status: 404,
            contentType: 'application/json',
            headers: corsHeaders,
            body: '{}',
        });
    });
}

function historyItem() {
    return {
        id: interviewId,
        status: 'COMPLETED',
        interviewType: 'TECHNICAL',
        difficulty: 'MEDIUM',
        durationMinutes: 60,
        questionCount: 1,
        targetRole: 'Frontend Developer',
        targetLevel: 'JUNIOR',
        createdAt: '2026-10-23T01:00:00.000Z',
        updatedAt: '2026-10-23T02:00:00.000Z',
        cv: { id: 'cv-1', name: 'CV Frontend Developer' },
        jobDescription: {
            id: 'jd-1',
            title: 'Frontend Developer',
            company: 'Interviewly',
        },
        session: {
            id: 'session-1',
            startedAt: '2026-10-23T01:00:00.000Z',
            completedAt: '2026-10-23T02:00:00.000Z',
            turnCount: 1,
        },
        evaluation: {
            status: 'COMPLETED',
            overallScore: 7.5,
            coverage: 1,
            confidence: 'HIGH',
            levelAssessment: 'MEETS_EXPECTATIONS',
            rubricVersion: 'evaluation-v1',
            completedAt: '2026-10-23T02:05:00.000Z',
        },
    };
}

function transcriptResponse() {
    return {
        interview: {
            id: interviewId,
            status: 'COMPLETED',
            targetRole: 'Frontend Developer',
            targetLevel: 'JUNIOR',
            interviewType: 'TECHNICAL',
            durationMinutes: 60,
            createdAt: '2026-10-23T01:00:00.000Z',
        },
        session: {
            id: 'session-1',
            startedAt: '2026-10-23T01:00:00.000Z',
            completedAt: '2026-10-23T02:00:00.000Z',
        },
        evaluation: {
            status: 'COMPLETED',
            completedAt: '2026-10-23T02:05:00.000Z',
        },
        turns: [],
    };
}

function evaluationResponse() {
    return {
        interviewId,
        status: 'COMPLETED',
        canRetry: false,
        attemptCount: 1,
        completedAt: '2026-10-23T02:05:00.000Z',
        report: {
            overallSummary:
                'Ứng viên đáp ứng phần lớn kỳ vọng của vị trí Frontend Developer.',
            overallScore: 7.5,
            coverage: 1,
            confidence: 'HIGH',
            levelAssessment: 'MEETS_EXPECTATIONS',
            demonstratedStrengths: ['Giải thích đúng cơ chế dependency array.'],
            competencies: [
                {
                    competencyKey: 'reactjs-core',
                    name: 'ReactJS Core',
                    priority: 'KEY',
                    score: 7.5,
                    coverageStatus: 'SUFFICIENT',
                    confidence: 'HIGH',
                    summary:
                        'Nắm được mục đích và các trường hợp sử dụng chính.',
                    strengths: ['Hiểu dependency array.'],
                    weaknesses: ['Cần bổ sung cleanup function.'],
                    evidenceTurnIds: [turnId],
                },
            ],
            diagnosticFindings: [],
            answerReviews: [answerReview()],
            recommendations: [
                {
                    competencyKey: 'reactjs-core',
                    priority: 'KEY',
                    topic: 'useEffect',
                    reason: 'Củng cố phần cleanup còn thiếu.',
                    learningObjectives: ['Hiểu vòng đời cleanup.'],
                    suggestedExercises: [
                        'Viết effect đăng ký và hủy event listener.',
                    ],
                    expectedOutcome: 'Giải thích đầy đủ effect lifecycle.',
                    relatedFindingIds: [],
                },
            ],
            unassessedAreas: [],
            stretchAchievements: [],
            generatedAt: '2026-10-23T02:05:00.000Z',
            rubricVersion: 'evaluation-v1',
        },
    };
}

function answerReview() {
    return {
        turnId,
        questionText: 'Dependency array trong useEffect có tác dụng gì?',
        answerText:
            'Dependency array kiểm soát thời điểm effect chạy lại khi giá trị phụ thuộc thay đổi.',
        probeType: 'MAIN_TARGET_LEVEL',
        scoringImpact: 'TARGET_LEVEL',
        competencyKey: 'reactjs-core',
        answerStatus: 'ANSWERED',
        questionObjective: 'Đánh giá hiểu biết về useEffect.',
        evidenceQuotes: ['kiểm soát thời điểm effect chạy lại'],
        learningObjectives: ['Giải thích cleanup function.'],
        sectionIndex: 1,
        sectionTitle: 'Kiến thức kỹ thuật chuyên môn',
        questionType: 'TECHNICAL',
        topic: 'ReactJS Core',
        correctAspects: ['Nêu đúng mục đích tổng quát.'],
        missingAspects: ['Chưa đề cập cleanup function.'],
        incorrectAspects: [],
        whyItMatters: 'Giúp kiểm soát side effect trong React.',
        improvement: 'Bổ sung các trường hợp dependency array và cleanup.',
        exampleImprovedAnswer:
            'Dependency array quyết định khi nào effect được chạy lại và cleanup trước lần chạy tiếp theo.',
        exampleImprovedAnswerType: 'ILLUSTRATIVE',
        reviewSections: [
            {
                type: 'KNOWLEDGE_EXPLANATION',
                title: 'Giải thích và kiến thức',
                order: 1,
                data: {
                    explanation:
                        'React so sánh từng dependency bằng Object.is để quyết định chạy lại effect.',
                    keyPoints: [
                        'Không truyền mảng',
                        'Mảng rỗng',
                        'Có dependency',
                    ],
                    commonMisconception: null,
                },
            },
        ],
    };
}

test.beforeEach(async ({ page }) => {
    await mockAuthenticatedHistory(page);
});

test('opens a completed interview report from persisted history', async ({
    page,
}) => {
    await page.goto('/interviews');

    await expect(
        page.getByRole('heading', { level: 1, name: 'Phỏng vấn của bạn' }),
    ).toBeVisible();
    await expect(page.getByText('Frontend Developer').first()).toBeVisible();

    await page.getByRole('link', { name: 'Xem báo cáo' }).click();
    await expect(page).toHaveURL(`/interviews/${interviewId}/report`);
    await expect(
        page.getByRole('heading', {
            level: 1,
            name: /Báo cáo năng lực.*Frontend Developer/,
        }),
    ).toBeVisible();
    await expect(page.getByText('ReactJS Core').first()).toBeVisible();
});

test('renders persisted question evidence without requesting AI', async ({
    page,
}) => {
    const mutationRequests: string[] = [];
    page.on('request', (request) => {
        if (
            request.method() !== 'GET' &&
            request.url().includes(`/interviews/${interviewId}`)
        ) {
            mutationRequests.push(request.url());
        }
    });

    await page.goto(`/interviews/${interviewId}/report#question-review`);

    await expect(
        page.getByRole('heading', {
            name: 'Dependency array trong useEffect có tác dụng gì?',
        }),
    ).toBeVisible();
    await expect(page.getByText('Nêu đúng mục đích tổng quát.')).toBeVisible();
    await expect(page.getByText('Giải thích và kiến thức')).toBeVisible();
    expect(mutationRequests).toEqual([]);
});
