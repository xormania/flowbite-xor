import { test as base, expect } from '@playwright/test';

type CollectedError = { message: string; httpStatus?: number; url?: string };

/**
 * Every test fails on a console error, an uncaught page error, or a failed (>= 400) request.
 *
 * A test expecting an HTTP error (e.g. a 404 page) allows exactly that response with
 * `allowHttpError(/url regexp/, status)`: the response itself and Chromium's matching
 * "Failed to load resource" console message are dropped, nothing else.
 */
export const test = base.extend<{ allowHttpError: (url: RegExp, status: number) => void }>({
    allowHttpError: [
        async ({ page }, use) => {
            const errors: CollectedError[] = [];
            const allowed: { url: RegExp; status: number }[] = [];

            page.on('console', (message) => {
                if (message.type() !== 'error') {
                    return;
                }
                const failedLoad = message.text().match(/^Failed to load resource: the server responded with a status of (\d+)/);
                errors.push({
                    message: `console: ${message.text()}`,
                    httpStatus: failedLoad ? Number(failedLoad[1]) : undefined,
                    url: failedLoad ? message.location().url : undefined,
                });
            });
            page.on('pageerror', (error) => errors.push({ message: `pageerror: ${error.message}` }));
            page.on('response', (response) => {
                if (response.status() >= 400) {
                    errors.push({ message: `http ${response.status()}: ${response.url()}`, httpStatus: response.status(), url: response.url() });
                }
            });
            page.on('requestfailed', (request) => errors.push({ message: `requestfailed: ${request.url()} ${request.failure()?.errorText}` }));

            await use((url, status) => allowed.push({ url, status }));

            const isAllowed = ({ httpStatus, url }: CollectedError) =>
                undefined !== httpStatus && undefined !== url && allowed.some((a) => a.status === httpStatus && a.url.test(url));
            const unexpected = errors.filter((error) => !isAllowed(error)).map(({ message }) => message);
            expect(unexpected, 'console errors, page errors or failed requests').toEqual([]);
        },
        { auto: true },
    ],
});

export { expect };
