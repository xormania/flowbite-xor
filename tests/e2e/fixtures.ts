import { test as base, expect } from '@playwright/test';

/**
 * Every test fails on a console error, an uncaught page error, or a failed (>= 400) request.
 */
export const test = base.extend<{ pageErrors: string[] }>({
    pageErrors: [
        async ({ page }, use) => {
            const errors: string[] = [];
            page.on('console', (message) => {
                if (message.type() === 'error') {
                    errors.push(`console: ${message.text()}`);
                }
            });
            page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
            page.on('response', (response) => {
                if (response.status() >= 400) {
                    errors.push(`http ${response.status()}: ${response.url()}`);
                }
            });
            page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`));

            await use(errors);

            expect(errors, 'console errors, page errors or failed requests').toEqual([]);
        },
        { auto: true },
    ],
});

export { expect };
