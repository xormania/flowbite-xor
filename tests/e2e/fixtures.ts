import { fileURLToPath } from 'node:url';
import { test as base, expect, type Page } from '@playwright/test';

const PLACEHOLDER_IMAGE = fileURLToPath(new URL('./examples/placeholder.png', import.meta.url));

type CollectedError = { message: string; httpStatus?: number; url?: string };

/**
 * Records every Content Security Policy violation of the page and its frames. The demo enforces a strict policy
 * (demo/src/EventListener/SecurityHeadersListener.php): a violation means some markup needs `'unsafe-inline'`.
 * Chromium also logs each one as a console error.
 */
export async function recordCspViolations(page: Page): Promise<string[]> {
    const violations: string[] = [];
    await page.exposeBinding('__recordCspViolation', (_source, violation: string) => void violations.push(violation));
    await page.addInitScript(() => {
        document.addEventListener(
            'securitypolicyviolation',
            (event) => {
                const blocked = event.blockedURI || 'inline';
                const sample = event.sample ? `: ${event.sample}` : '';
                (window as any).__recordCspViolation(`${event.effectiveDirective} blocked ${blocked} on ${event.documentURI}${sample}`);
            },
            true,
        );
    });

    return violations;
}

/**
 * Every test fails on a console error, an uncaught page error, a Content Security Policy violation, or a failed
 * (>= 400) request. Requests leaving the demo are blocked (images get a local placeholder), as in the examples suite.
 *
 * A test expecting an HTTP error (e.g. a 404 page) allows exactly that response with
 * `allowHttpError(/url regexp/, status)`: the response itself and Chromium's matching
 * "Failed to load resource" console message are dropped, nothing else.
 */
export const test = base.extend<{ allowHttpError: (url: RegExp, status: number) => void }>({
    allowHttpError: [
        async ({ page, baseURL }, use) => {
            const errors: CollectedError[] = [];
            const allowed: { url: RegExp; status: number }[] = [];
            const isLocal = (url: string) => url.startsWith(`${baseURL}/`);
            const cspViolations = await recordCspViolations(page);

            await page.route(
                (url) => !isLocal(url.href),
                (route) => ('image' === route.request().resourceType() ? route.fulfill({ path: PLACEHOLDER_IMAGE }) : route.abort()),
            );

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
            page.on('requestfailed', (request) => {
                // Turbo 8 prefetches a link on hover and cancels the request when the pointer leaves it
                const cancelledPrefetch = 'prefetch' === request.headers()['x-sec-purpose'] && 'net::ERR_ABORTED' === request.failure()?.errorText;
                if (isLocal(request.url()) && !cancelledPrefetch) {
                    errors.push({ message: `requestfailed: ${request.url()} ${request.failure()?.errorText}` });
                }
            });

            await use((url, status) => allowed.push({ url, status }));

            const isAllowed = ({ httpStatus, url }: CollectedError) =>
                undefined !== httpStatus && undefined !== url && allowed.some((a) => a.status === httpStatus && a.url.test(url));
            const unexpected = [
                ...errors.filter((error) => !isAllowed(error)).map(({ message }) => message),
                ...cspViolations.map((violation) => `csp: ${violation}`),
            ];
            expect(unexpected, 'console errors, page errors, CSP violations or failed requests').toEqual([]);
        },
        { auto: true },
    ],
});

export { expect };

/**
 * Waits until the current Turbo visit has rendered the server's response. A visit to a page Turbo has cached first
 * shows that snapshot as a preview (`data-turbo-preview` on <html>), so the new page's content is visible while its
 * request is still running, and going Back or away then cancels the request. Turbo marks <html> `aria-busy` from
 * the start of a visit to its end.
 */
export async function turboVisitDone(page: Page): Promise<void> {
    const html = page.locator('html');
    await expect(html).not.toHaveAttribute('aria-busy');
    await expect(html).not.toHaveAttribute('data-turbo-preview');
}
