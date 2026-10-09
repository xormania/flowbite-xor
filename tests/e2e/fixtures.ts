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
 * The checks every test of both projects runs. Requests leaving the demo are blocked (images get a local placeholder),
 * and the test fails on a console error, an uncaught page error, a Content Security Policy violation, or a local
 * request that fails or answers >= 400.
 *
 * `allowHttpError(url, status)` accepts exactly that response, `url` being a RegExp or 'document' (the page's own
 * document, in the main frame): the response itself and Chromium's matching "Failed to load resource" console message
 * are dropped, nothing else.
 */
export async function guardPage(page: Page, baseURL: string | undefined) {
    const errors: CollectedError[] = [];
    const allowed: { url: RegExp | 'document'; status: number }[] = [];
    const documents = new Set<string>(); // the URLs the main frame navigated to
    const isLocal = (url: string) => url.startsWith(`${baseURL}/`);
    const cspViolations = await recordCspViolations(page);

    await page.route(
        (url) => !isLocal(url.href),
        (route) => ('image' === route.request().resourceType() ? route.fulfill({ path: PLACEHOLDER_IMAGE }) : route.abort()),
    );

    page.on('request', (request) => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
            documents.add(request.url());
        }
    });
    page.on('console', (message) => {
        const url = message.location().url;
        // a blocked request leaving the demo logs its failure at its own URL
        if ('error' !== message.type() || (url && !isLocal(url))) {
            return;
        }
        const failedLoad = message.text().match(/^Failed to load resource: the server responded with a status of (\d+)/);
        errors.push({
            message: `console: ${message.text()}`,
            httpStatus: failedLoad ? Number(failedLoad[1]) : undefined,
            url: failedLoad ? url : undefined,
        });
    });
    page.on('pageerror', (error) => errors.push({ message: `pageerror: ${error.message}` }));
    page.on('response', (response) => {
        if (response.status() >= 400 && isLocal(response.url())) {
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

    const isAllowed = ({ httpStatus, url }: CollectedError) =>
        undefined !== httpStatus &&
        undefined !== url &&
        allowed.some((a) => a.status === httpStatus && ('document' === a.url ? documents.has(url) : a.url.test(url)));

    return {
        allowHttpError: (url: RegExp | 'document', status: number) => void allowed.push({ url, status }),
        check: () => {
            const unexpected = [
                ...errors.filter((error) => !isAllowed(error)).map(({ message }) => message),
                ...cspViolations.map((violation) => `csp: ${violation}`),
            ];
            expect(unexpected, 'console errors, page errors, CSP violations or failed requests').toEqual([]);
        },
    };
}

/** The checks of guardPage() on every test; a test expecting an HTTP error allows it with `allowHttpError`. */
export const test = base.extend<{ allowHttpError: (url: RegExp, status: number) => void }>({
    allowHttpError: [
        async ({ page, baseURL }, use) => {
            const guard = await guardPage(page, baseURL);
            await use(guard.allowHttpError);
            guard.check();
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

/**
 * The connected Stimulus controllers of `identifier`, and the elements carrying it: after repeated Turbo visits, each
 * element must have exactly one. Reads the demo's application (`window.Stimulus`, set in
 * demo/assets/stimulus_bootstrap.js).
 */
export async function stimulusControllers(page: Page, identifier: string): Promise<{ controllers: number; elements: number; distinctElements: number }> {
    return page.evaluate((id) => {
        const controllers = ((window as any).Stimulus.controllers as { identifier: string; element: Element }[]).filter((controller) => controller.identifier === id);
        return {
            controllers: controllers.length,
            elements: document.querySelectorAll(`[data-controller~="${id}"]`).length,
            distinctElements: new Set(controllers.map((controller) => controller.element)).size,
        };
    }, identifier);
}

/**
 * Counts the listeners the page's scripts put on `document` and `window`, by `<target> <type>` (`document click`,
 * `window resize capture`): those added minus those removed, from the start of each page. Playwright's own listeners
 * (added by scripts without a URL) are left out. Call it before the first `goto`, take a baseline once the page has
 * done each kind of step once (Turbo adds some of its listeners on the first click or submit), and compare after more
 * Turbo visits, Streams or re-renders: a controller that leaves a listener behind shows as a count above the baseline.
 */
export async function trackGlobalListeners(page: Page): Promise<() => Promise<Record<string, number>>> {
    await page.addInitScript(() => {
        const add = EventTarget.prototype.addEventListener;
        const remove = EventTarget.prototype.removeEventListener;
        const listeners = new Map<string, Set<unknown>>();
        const key = (target: EventTarget, type: string, options?: boolean | EventListenerOptions) => {
            const name = target === document ? 'document' : target === window ? 'window' : null;
            if (!name || !/\bhttps?:\/\//.test(new Error().stack ?? '')) {
                return null;
            }
            const capture = 'boolean' === typeof options ? options : Boolean(options?.capture);
            return `${name} ${type}${capture ? ' capture' : ''}`;
        };
        (window as any).__globalListeners = () =>
            Object.fromEntries([...listeners].filter(([, set]) => set.size > 0).map(([name, set]) => [name, set.size]));
        EventTarget.prototype.addEventListener = function (type: string, listener: any, options?: any) {
            const name = key(this, type, options);
            if (name && listener) {
                listeners.set(name, (listeners.get(name) ?? new Set()).add(listener));
            }
            return add.call(this, type, listener, options);
        };
        EventTarget.prototype.removeEventListener = function (type: string, listener: any, options?: any) {
            const name = key(this, type, options);
            if (name) {
                listeners.get(name)?.delete(listener);
            }
            return remove.call(this, type, listener, options);
        };
    });

    return () => page.evaluate(() => (window as any).__globalListeners() as Record<string, number>);
}

/**
 * The connected Stimulus controllers of `identifier`, and the elements carrying it: after repeated Turbo visits, each
 * element must have exactly one. Reads the demo's application (`window.Stimulus`, set in
 * demo/assets/stimulus_bootstrap.js).
 */
export async function stimulusControllers(page: Page, identifier: string): Promise<{ controllers: number; elements: number; distinctElements: number }> {
    return page.evaluate((id) => {
        const controllers = ((window as any).Stimulus.controllers as { identifier: string; element: Element }[]).filter((controller) => controller.identifier === id);
        return {
            controllers: controllers.length,
            elements: document.querySelectorAll(`[data-controller~="${id}"]`).length,
            distinctElements: new Set(controllers.map((controller) => controller.element)).size,
        };
    }, identifier);
}
