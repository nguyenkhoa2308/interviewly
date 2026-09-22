import { expect, test } from '@playwright/test';

const cvId = '550e8400-e29b-41d4-a716-446655440000';
const parsedText = `<script>alert('xss')</script>\nBackend Developer\nhttps://example.com/${'long-path-'.repeat(30)}`;

test.beforeEach(async ({ page }) => {
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
        const corsHeaders = {
            'access-control-allow-origin': 'http://localhost:3100',
            'access-control-allow-credentials': 'true',
            'access-control-allow-methods': 'GET,PATCH,DELETE,OPTIONS',
            'access-control-allow-headers': 'Content-Type',
        };
        if (route.request().method() === 'OPTIONS') {
            await route.fulfill({ status: 204, headers: corsHeaders });
            return;
        }
        const pathname = new URL(route.request().url()).pathname;
        if (pathname.endsWith('/auth/me')) {
            await route.fulfill({
                contentType: 'application/json',
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    data: {
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
                    },
                }),
            });
            return;
        }
        if (pathname.endsWith('/cvs/' + cvId)) {
            await route.fulfill({
                contentType: 'application/json',
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    data: {
                        id: cvId,
                        name: 'CV Backend Developer',
                        originalFilename: 'Nguyen_Duc_Khoa_Backend_CV.pdf',
                        mimeType: 'application/pdf',
                        fileSize: 245760,
                        processingStatus: 'READY',
                        isDefault: true,
                        createdAt: '2026-09-15T02:00:00.000Z',
                        updatedAt: '2026-09-15T03:00:00.000Z',
                        extractedText: parsedText,
                    },
                }),
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
});

test('renders secure parsed content without horizontal page overflow', async ({
    page,
}) => {
    await page.goto('/cv/' + cvId);
    await expect(
        page.getByRole('heading', { level: 1, name: 'CV Backend Developer' }),
    ).toBeVisible();
    await expect(page.getByText('Sẵn sàng')).toBeVisible();
    await expect(page.getByText(`<script>alert('xss')</script>`)).toBeVisible();
    await expect(
        page.locator('script').filter({ hasText: "alert('xss')" }),
    ).toHaveCount(0);
    const dimensions = await page.evaluate(() => ({
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
});
