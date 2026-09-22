export default async function globalTeardown() {
    try {
        const response = await fetch('http://localhost:3100/__e2e__/pid');
        const payload: unknown = await response.json();

        if (
            typeof payload === 'object' &&
            payload !== null &&
            'pid' in payload &&
            typeof payload.pid === 'number'
        ) {
            process.kill(payload.pid);
        }
    } catch {
        // The server may already have been stopped by Playwright.
    }
}
