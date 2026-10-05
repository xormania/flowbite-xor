import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.DEMO_PORT ?? 8000);
const baseURL = process.env.DEMO_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
    testDir: './tests/e2e',
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL,
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Lets a sandbox with a preinstalled Chromium run the suite without downloading one.
                launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
            },
        },
    ],
    // Serves the demo with PHP's built-in server; reuses one already listening (e.g. started by CI or by hand).
    webServer: {
        command: `php -S 127.0.0.1:${port} -t demo/public`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 30_000,
    },
});
