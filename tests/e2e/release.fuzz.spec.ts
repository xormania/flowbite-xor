import type { APIResponse, Page } from '@playwright/test';
import { test, expect } from './fixtures';

/*
 * Release checks (docs/PLAN-test-tiers.md, tier 3), fuzzing: random requests against the data tables, seeded and under
 * a time budget. Each run prints its seed; `SEED=<seed>` replays it (FUZZ_BUDGET_MS sets the budget per target, 30 s by
 * default). A failure names the seed and the request, and becomes a tier 1 test once fixed.
 *
 * - Query strings: random parameters (the tables' own, nested, repeated, unknown) with random values (hostile markup,
 *   huge and negative numbers, long and odd strings) on each data table page: no 5xx, no response over RESPONSE_BUDGET_MS,
 *   no element or event attribute a value injected, and, loaded in the browser, no CSP violation or console error.
 * - Live props: random values for the writable props of the Live data table (`OrdersTable`), sent as the live
 *   controller sends them (the props and their checksum from `data-live-props-value`, the changed ones in `updated`):
 *   no 5xx, nothing injected; an accepted answer then replaces the component in the page, as the live controller's
 *   morph would, where the page's Content Security Policy and the same guard (console, failed requests) apply.
 */

const BUDGET_MS = Number(process.env.FUZZ_BUDGET_MS ?? 30_000);
const RESPONSE_BUDGET_MS = 3_000;
const SEED = process.env.SEED ? Number(process.env.SEED) : Math.floor(Math.random() * 2 ** 31);

/** mulberry32: a small seeded generator, the same sequence for the same seed. */
function generator(seed: number) {
    let state = seed >>> 0;
    const next = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (max: number) => Math.floor(next() * max);
    const pick = <T>(items: readonly T[]): T => items[int(items.length)];

    return { next, int, pick };
}
type Random = ReturnType<typeof generator>;

// what an injected value would add: an element or an attribute named fuzz (none exists in the demo)
const MARKUP = [
    '<fuzz-x data-fuzz="1">',
    '"><fuzz-x data-fuzz="1">',
    "'><fuzz-x data-fuzz=1>",
    '" data-fuzz="1" x="',
    "' data-fuzz='1' x='",
    '<img src=x data-fuzz=1 onerror="window.__fuzz=1">',
    '<script>window.__fuzz=1</script>',
    '</textarea><fuzz-x data-fuzz>',
    '{{ 7*7 }}<fuzz-x data-fuzz>',
    'javascript:window.__fuzz=1',
];

function value(random: Random): string {
    switch (random.int(9)) {
        case 0: return random.pick(MARKUP);
        case 1: return String(random.pick([0, -1, 1, 2, 3, 57, 10_000, 2 ** 31, 2 ** 53, Number.MAX_SAFE_INTEGER * 1000]));
        case 2: return random.pick(['1e9', '-0', '1.5', '0x10', 'NaN', 'Infinity', '', ' ', '00', '+3', '1,000']);
        case 3: return random.pick(['asc', 'desc', 'ASC', 'Desc', 'customer', 'total', 'number', 'status', 'created', 'paid', 'pending', 'refunded', 'id']);
        case 4: return 'x'.repeat(random.pick([100, 101, 1_000, 5_000]));
        case 5: return random.pick(['é'.repeat(150), '\u0000', '‮', '😀'.repeat(60), '%', '%00', '\\', '../../etc/passwd', "' OR 1=1 --"]);
        case 6: return Array.from({ length: 1 + random.int(12) }, () => String.fromCharCode(32 + random.int(95))).join('');
        case 7: return random.pick(MARKUP) + random.pick(['', 'paid', '2']);
        default: return String(random.int(100));
    }
}

/** A query string: the tables' parameters and unknown ones, plain, nested or repeated, each value random. */
function queryString(random: Random): string {
    // the tables' own parameters twice as often as the odd ones
    const known = ['q', 'sort', 'dir', 'page', 'size', 'f[status]'];
    const names = [...known, ...known, 'f', 'f[]', 'page[]', 'q[x]', 'sort[0]', 'f[status][]', 'orders[page]', 'zz', 'f[unknown]', '_'];
    const pairs: string[] = [];
    for (let i = 0, count = 1 + random.int(6); i < count; i++) {
        pairs.push(`${encodeURIComponent(random.pick(names)).replace(/%5B/g, '[').replace(/%5D/g, ']')}=${encodeURIComponent(value(random))}`);
    }
    return pairs.join('&');
}

/** What a response body would hold if a value were injected as markup, parsed by the browser. */
async function injected(page: Page, html: string): Promise<string[]> {
    return page.evaluate((source) => {
        const document = new DOMParser().parseFromString(source, 'text/html');
        const found: string[] = [];
        for (const element of document.querySelectorAll('*')) {
            if ('fuzz-x' === element.localName || element.hasAttribute('data-fuzz')) {
                found.push(element.outerHTML.slice(0, 200));
            }
            for (const name of element.getAttributeNames()) {
                if (/^on/i.test(name) && /fuzz/.test(element.getAttribute(name) ?? '')) {
                    found.push(`<${element.localName} ${name}>`);
                }
            }
            if ('script' === element.localName && /__fuzz/.test(element.textContent ?? '')) {
                found.push(element.outerHTML.slice(0, 200));
            }
        }
        return found;
    }, html);
}

async function timed(request: () => Promise<APIResponse>): Promise<{ response: APIResponse; ms: number }> {
    const start = Date.now();
    const response = await request();
    return { response, ms: Date.now() - start };
}

test.describe('release fuzz', { tag: '@release' }, () => {
    test.skip(({ browserName }) => 'chromium' !== browserName, 'Chromium only, as the other release checks');
    test.describe.configure({ timeout: BUDGET_MS * 4 + 60_000 });

    test.beforeEach(() => {
        console.log(`fuzz: SEED=${SEED} (replay with SEED=${SEED}), budget ${BUDGET_MS} ms per target`);
        test.info().annotations.push({ type: 'seed', description: String(SEED) });
    });

    test('random query strings on the data table pages: no 5xx, nothing injected, no CSP violation', async ({ page }) => {
        const random = generator(SEED);
        const errors: string[] = [];
        page.on('console', (message) => 'error' === message.type() && errors.push(message.text()));
        page.on('pageerror', (error) => errors.push(error.message));
        const pages = ['/lab/data-table-frame', '/lab/data-table-live', '/lab/data-table-live-frame'];
        const end = Date.now() + BUDGET_MS;
        let requests = 0;
        while (Date.now() < end) {
            const url = `${random.pick(pages)}?${queryString(random)}`;
            const replay = `SEED=${SEED}, request ${requests + 1}: GET ${url}`;
            const { response, ms } = await timed(() => page.request.get(url, { maxRedirects: 0 }));
            requests++;
            expect(response.status(), `${replay}: status`).toBeLessThan(500);
            expect(ms, `${replay}: answered in ${ms} ms`).toBeLessThanOrEqual(RESPONSE_BUDGET_MS);
            if (200 !== response.status()) {
                continue;
            }
            expect(await injected(page, await response.text()), `${replay}: injected markup`).toEqual([]);
            // in the browser too, one request in three: the page's scripts run on what the server rendered
            if (0 === requests % 3) {
                errors.length = 0;
                await page.goto(url);
                await page.waitForLoadState('networkidle');
                expect(await page.evaluate(() => (window as any).__fuzz ?? null), `${replay}: a script ran`).toBeNull();
                expect(await page.locator('fuzz-x, [data-fuzz]').count(), `${replay}: injected element`).toBe(0);
                expect(errors, `${replay}: console errors and CSP violations`).toEqual([]);
            }
        }
        console.log(`fuzz: ${requests} query strings, SEED=${SEED}`);
        expect(requests).toBeGreaterThan(0);
    });

    test('random values for the Live data table\'s writable props: no 5xx, nothing injected, no CSP violation', async ({ page }) => {
        // A value the server refuses (Live's 400 for a value it cannot set) is fine, a server error is not. The values go
        // from the test, not through the live controller in the page: it adds the page's bound fields to `updated`,
        // and in the demo's dev environment shows a refused request's error page in a modal, whose inline styles the
        // page's policy blocks.
        const random = generator(SEED + 1);
        const errors: string[] = [];
        page.on('console', (message) => 'error' === message.type() && errors.push(message.text()));
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/lab/data-table-live');
        const component = page.locator('[data-live-name-value="OrdersTable"]');
        await expect(component).toHaveCount(1);

        const send = async (updated: Record<string, unknown>) =>
            timed(async () =>
                page.request.post('/_components/OrdersTable', {
                    headers: { Accept: 'application/vnd.live-component+html', 'X-Requested-With': 'XMLHttpRequest' },
                    form: { data: JSON.stringify({ props: JSON.parse((await component.getAttribute('data-live-props-value')) ?? '{}'), updated, children: {}, propsFromParent: {} }) },
                    maxRedirects: 0,
                }),
            );
        // the request is the live controller's: a known update takes effect
        const known = await send({ filterValues: { status: 'paid' } });
        const status = await page.evaluate((html) => {
            const parsed = new DOMParser().parseFromString(html, 'text/html');
            return [...parsed.querySelectorAll('[role="status"]')].map((element) => element.textContent?.replace(/\s+/g, ' ').trim()).join(' | ');
        }, await known.response.text());
        expect(status, 'a crafted Live request applies its updated props').toContain('Showing 1–10 of 19');

        const props: [string, () => unknown][] = [
            ['search', () => random.pick([value(random), value(random), 42, null, ['x']])],
            ['filterValues', () => random.pick([{ status: value(random) }, { status: random.pick(['paid', 'pending', 'refunded']) }, { [value(random)]: value(random) }, value(random), [value(random)], null])],
            ['filterValues.status', () => random.pick([value(random), 'paid', null, 7])],
            ['sort', () => random.pick([value(random), 'customer', 'total', null, 3, ['customer']])],
            ['direction', () => random.pick([value(random), 'asc', 'desc', null, 1])],
            ['page', () => random.pick([random.int(10_000) - 10, Number(value(random)) || 0, 2 ** 31, value(random), null, 1.5])],
            ['pageSize', () => random.pick([10, 25, 50, 100, 0, -1, 7, value(random), null])],
            ['selectedIds', () => random.pick([[value(random)], Array.from({ length: random.int(50) }, () => value(random)), value(random), null, [['x']], [{ a: 1 }]])],
        ];

        const end = Date.now() + BUDGET_MS;
        let requests = 0;
        let accepted = 0;
        while (Date.now() < end) {
            const updated: Record<string, unknown> = {};
            for (let i = 0, count = 1 + random.int(3); i < count; i++) {
                const [name, make] = random.pick(props);
                updated[name] = make();
            }
            const replay = `SEED=${SEED}, Live request ${requests + 1}: updated ${JSON.stringify(updated).slice(0, 300)}`;
            const { response, ms } = await send(updated);
            requests++;
            expect(response.status(), `${replay}: status`).toBeLessThan(500);
            expect(ms, `${replay}: answered in ${ms} ms`).toBeLessThanOrEqual(RESPONSE_BUDGET_MS);
            if (200 !== response.status()) {
                continue;
            }
            expect(await injected(page, await response.text()), `${replay}: injected markup`).toEqual([]);

            // accepted: its HTML replaces the component in the page, as the live controller's morph would, under the
            // page's Content Security Policy (an inline style or handler it carried is a violation the guard reports)
            accepted++;
            errors.length = 0;
            await component.evaluate((element, html) => {
                element.outerHTML = html;
            }, await response.text());
            await expect(component).toHaveCount(1);
            expect(errors, `${replay}: console errors and CSP violations`).toEqual([]);
            expect(await page.evaluate(() => (window as any).__fuzz ?? null), `${replay}: a script ran`).toBeNull();
            expect(await page.locator('fuzz-x, [data-fuzz]').count(), `${replay}: injected element`).toBe(0);
        }
        console.log(`fuzz: ${requests} Live requests (${accepted} accepted and rendered in the page), SEED=${SEED}`);
        expect(requests).toBeGreaterThan(0);
    });
});
