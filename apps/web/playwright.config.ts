import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    globalTeardown: './e2e/global-teardown.ts',
    fullyParallel: false,
    workers: 1,
    timeout: 20_000,
    reporter: 'line',
    use: {
        baseURL: 'http://localhost:3100',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'node e2e/server.mjs',
        url: 'http://localhost:3100',
        reuseExistingServer: false,
        timeout: 120_000,
    },
    projects: [
        { name: 'mobile-320', use: { viewport: { width: 320, height: 700 } } },
        { name: 'tablet-768', use: { viewport: { width: 768, height: 900 } } },
        {
            name: 'desktop-1440',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1440, height: 1000 },
            },
        },
    ],
});
