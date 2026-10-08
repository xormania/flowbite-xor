# Testing patterns

_2026-10-08. The tests of this repository, written up so they can be reused in any Symfony app built with Turbo,
Stimulus and Live Components. Each pattern says what it catches, shows the core of it, and links the spec that uses
it here. The snippets use Playwright Test; the PHP ones need only the app's autoloader._

The demo app (`demo/`) is the fixture: every pattern runs against real pages, where recipes, Turbo, Live
Components, `flowbite.min.css` and a strict Content Security Policy meet. Bugs between those pieces only show there.

## Every test: fail on what the user would not see

**Catches:** console errors, uncaught exceptions, Content Security Policy violations, failed or 4xx/5xx requests,
none of which fail an assertion on their own.

A Playwright fixture records them for every test and fails the test at its end; a test that expects an error allows
exactly that response. Requests leaving the app are blocked, so no test depends on the network.

```ts
// tests/e2e/fixtures.ts (shortened)
export const test = base.extend({
    page: async ({ page, baseURL }, use) => {
        const errors: string[] = [];
        page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()}`));
        page.on('response', (response) => response.status() >= 400 && errors.push(`${response.status()} ${response.url()}`));
        await page.addInitScript(() => document.addEventListener('securitypolicyviolation',
            (event) => console.error(`CSP ${event.effectiveDirective} blocked ${event.blockedURI || 'inline'}`), true));
        await use(page);
        expect(errors).toEqual([]);
    },
});
```

Here: [`tests/e2e/fixtures.ts`](../tests/e2e/fixtures.ts) (`guardPage`, `recordCspViolations`, `allowHttpError`).

## Turbo

### The page stayed one document

**Catches:** a link or form that falls back to a full page load (a Turbo Drive regression, a `data-turbo="false"`
too many, a 500 that Turbo answers with a full load).

Set a marker on `window`, navigate, check the marker is still there.

```ts
await page.evaluate(() => ((window as any).__sameDocument = true));
await page.getByRole('link', { name: 'Lab' }).click();
await expect(page).toHaveURL(/\/lab$/);
expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
```

Here: [`tests/e2e/smoke.spec.ts`](../tests/e2e/smoke.spec.ts), [`lab.turbo-nav.spec.ts`](../tests/e2e/lab.turbo-nav.spec.ts).

### Wait for the visit, not for content

**Catches:** a flaky test that sees a cached preview. On a visit to a cached page Turbo first shows the snapshot, so
the expected content is on screen while the request still runs; going Back then cancels it.

```ts
export async function turboVisitDone(page: Page) {
    await expect(page.locator('html')).not.toHaveAttribute('aria-busy');          // Turbo marks the whole visit
    await expect(page.locator('html')).not.toHaveAttribute('data-turbo-preview'); // not a cached preview
}
```

Here: [`tests/e2e/fixtures.ts`](../tests/e2e/fixtures.ts) (`turboVisitDone`).

### Back after the cache snapshot

**Catches:** components that come back broken after Back: an open menu or dialog in the snapshot, an editor
rebuilt over its own markup, a form field reset by a component library. The order of Turbo's snapshot and the
controllers' `disconnect()` depends on timing; a delayed stylesheet on the next page forces the production order.

```ts
await page.route('**/slow.css', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fallback();
});
// open the overlay, follow a link inside it to a page that links slow.css, go Back:
await expect(dialog).not.toHaveAttribute('open');
```

Here: [`lab.turbo-restore.spec.ts`](../tests/e2e/lab.turbo-restore.spec.ts), and the Back tests of each `lab.*.spec.ts`.

## State × transition

**Catches:** what a test of each state misses: the moves between states. The theme toggle showed no icon only after
switching from dark to light under a dark system.

List the states and the transitions, then after every transition check the whole state, not one attribute of it.
Playwright sets the system preference per test (`test.use({ colorScheme })`) and changes it while the page is open
(`page.emulateMedia()`).

```ts
for (const system of ['light', 'dark'] as const) {
    for (const choice of [null, 'light', 'dark'] as const) {
        test.describe(`system ${system}, ${choice ?? 'no'} choice saved`, () => {
            test.use({ colorScheme: system });
            // transitions: the toggle, the system changing, a Turbo visit, Back, a reload
            // state after each: the class, aria-pressed, the icon shown, the saved choice, the first paint
        });
    }
}
```

**Before the first paint:** record the state when `<body>` starts parsing, to catch a flash of the wrong theme.

```ts
await page.addInitScript(() => new MutationObserver((_, observer) => {
    if (document.body) {
        (window as any).__darkAtFirstBody = document.documentElement.classList.contains('dark');
        observer.disconnect();
    }
}).observe(document, { childList: true, subtree: true }));
```

Here: [`tests/e2e/theme-toggle.spec.ts`](../tests/e2e/theme-toggle.spec.ts).

## Basic performance: counts, not timings

Counts give the same result on every run, so they fail like any other assertion; timings belong to separate,
repeated runs ([`PLAN-test-tiers.md`](PLAN-test-tiers.md)).

### No transition runs where the change should be instant

**Catches:** a whole page fading into a new theme because some element has `transition-colors` for its hover.

Read the running CSS transitions in the frame the change lands in: a `MutationObserver` callback runs right after
the change, before the next frame.

```ts
await page.evaluate(() => {
    (window as any).__transitions = new Promise((resolve) => new MutationObserver((_, observer) => {
        observer.disconnect();
        getComputedStyle(document.body).color; // the transitions exist once styles are computed
        resolve(document.getAnimations().filter((a) => a instanceof CSSTransition)
            .map((a) => `${(a.effect as KeyframeEffect).target?.nodeName} ${(a as CSSTransition).transitionProperty}`));
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }));
});
await toggle.click();
expect(await page.evaluate(() => (window as any).__transitions)).toEqual([]);
```

Here: [`tests/e2e/theme-toggle.spec.ts`](../tests/e2e/theme-toggle.spec.ts) ("a switch … runs no color transition").

## Live Components

### Send what a crafted request would send

**Catches:** server code trusting writable `LiveProp`s. The browser can send any value for them; the template's
widgets are not a limit.

The live controller's own API sends the request, so the test goes through the real endpoint, checksum and hydration:

```ts
await page.evaluate(async () => {
    const { getComponent } = await import('@symfony/ux-live-component'); // resolved by the import map
    const component = await getComponent(document.querySelector<HTMLElement>('[data-controller~="live"]')!);
    component.set('selectedIds', Array.from({ length: 5_000 }, (_, i) => String(i)), true); // true: re-render
});
await expect(page.getByRole('status').filter({ hasText: 'selected' })).toHaveText('1000 selected, the most this table selects');
```

Bound such a prop in its `hydrateWith` method: it reads what the browser sends before your code does.

Here: [`lab.data-table-live.spec.ts`](../tests/e2e/lab.data-table-live.spec.ts) ("a selection the browser sends is cut…").

### Without a browser

To call a Live action from a shell (a fresh-install check, a smoke test after deploy), build the request body the
live controller would send from the page's `data-live-props-value`:

```sh
body="$(php tools/tests/live-action.php page.html '{"page":"2"}')"
curl -s -X POST "$base/_components/LiveOrders/goTo" -H 'Accept: application/vnd.live-component+html' \
    -H 'X-Requested-With: XMLHttpRequest' --data-urlencode "data=$body"
```

Here: [`tools/tests/live-action.php`](../tools/tests/live-action.php), [`check-fresh-app.sh`](../tools/tests/check-fresh-app.sh).

## Server-side limits: what one request makes the server do

**Catches:** a request that costs far more than a page view: a deep SQL `OFFSET`, a loader called twice, an
unbounded collection copied and scanned. The browser cannot see these; a plain PHP script with a recording double
can.

```php
// a table whose loaders record each call
protected function countRows(TableQuery $query): int { $this->calls[] = 'count'; return $this->total; }
protected function loadRows(TableQuery $query): array { $this->calls[] = 'rows@'.$query->offset(); return [/* … */]; }

[$query] = $table->fetch(TableQuery::fromValues(['page' => 1_000_000, 'pageSize' => 50], $table));
check(['count', 'rows@9950'] === $table->calls, 'a deep page: one count, one load, offset below maxRows()');
```

In an app with PHPUnit, the same check is a `WebTestCase` with `$client->enableProfiler()` reading the Doctrine
collector's query count, or a collector of your own.

Here: [`tools/tests/data-table.php`](../tools/tests/data-table.php), run by CI's Kit PHP job.

## Hostile values in markup

**Catches:** a prop that lets a value add an element, an event handler or a `javascript:` link.

Render every component with hostile values through the app's own Twig (a console command), then let the browser
parse each rendering and check the DOM: no extra element, no `on*` attribute, links only with allowed schemes.

Here: [`hostile-props.spec.ts`](../tests/e2e/hostile-props.spec.ts), [`HostilePropsCommand.php`](../demo/src/Command/HostilePropsCommand.php).

## Security headers and the Content Security Policy

**Catches:** a policy that allows more than it says, and what a strict policy silently breaks (an inline theme
script, Turbo's progress bar, inline `style` attributes).

The headers come from one listener; a spec checks the policy itself (nonces, no `'unsafe-inline'`), and the fixture
above fails every other test on a violation, so the whole suite runs under the policy.

Here: [`csp.spec.ts`](../tests/e2e/csp.spec.ts), [`SecurityHeadersListener.php`](../demo/src/EventListener/SecurityHeadersListener.php).

## Accessibility

**Catches:** serious and critical axe violations on every page, in both themes.

```ts
import AxeBuilder from '@axe-core/playwright';
const results = await new AxeBuilder({ page }).analyze();
expect(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
```

Here: [`a11y.spec.ts`](../tests/e2e/a11y.spec.ts).

## The install itself

**Catches:** what only a new project shows: a missing dependency, a Flex recipe that changes a file, PHP copied into
`src/` that does not boot.

A script creates a new Symfony app, installs the kit as users do, and fetches its pages and a Live action with
`curl`, without a browser.

Here: [`fresh-install.sh`](../tools/tests/fresh-install.sh), [`check-fresh-app.sh`](../tools/tests/check-fresh-app.sh).
