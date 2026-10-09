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

### What the cached copy holds

**Catches:** an overlay that is open, or a button still `aria-expanded="true"`, in the copy Turbo shows on Back or
Forward, even when a controller fixes it once it connects: the copy is on screen first. A dialog's `close` event, for
one, comes after Turbo has taken the copy.

Record each body Turbo is about to render, `event.detail.newBody`, the cached copies included:

```ts
await page.addInitScript(() => {
    (window as any).__rendered = [];
    document.addEventListener('turbo:before-render', (event: any) => {
        const body = event.detail.newBody;
        (window as any).__rendered.push({
            open: body.querySelector('#drawer-nav')?.hasAttribute('open'),
            expanded: body.querySelector('[aria-controls="drawer-nav"]')?.getAttribute('aria-expanded'),
        });
    });
});
// open the drawer, go Back, open it on that page, go Forward:
expect(await page.evaluate(() => (window as any).__rendered)).toEqual(Array(3).fill({ open: false, expanded: 'false' }));
```

Here: [`lab.mobile-nav.spec.ts`](../tests/e2e/lab.mobile-nav.spec.ts).

### State saved after the snapshot

**Catches:** a component that shows the state of Turbo's cached copy after Back, when the user changed it on the next
page (a tree's open branches, a collapsed panel). The copy is taken when the page is left; whatever is saved later
must win over it.

Change the state on page one, visit page two, change it again there, go Back: page one shows the second change.

```ts
await branchToggle(page, 'Reference').click();           // page one: open
await page.getByRole('link', { name: 'Go to page two' }).click();
await turboVisitDone(page);
await branchToggle(page, 'Reference').click();           // page two: closed again
await page.goBack();
await turboVisitDone(page);
await expect(treeitem(page, 'Reference')).toHaveAttribute('aria-expanded', 'false'); // the copy had it open
```

Here: [`lab.side-nav.spec.ts`](../tests/e2e/lab.side-nav.spec.ts).

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

### No listener left behind

**Catches:** a controller that adds a `document` or `window` listener and does not remove it on `disconnect()`, so
each Turbo visit, Stream or re-render adds one more (work on every click or scroll, a closed overlay still reacting).

Wrap `addEventListener` and `removeEventListener` in an init script and count what the page's own scripts add to
`document` and `window`, by target and type. Take the baseline after the page has done each step once (Turbo adds
some of its listeners on the first click or submit), then repeat the steps: the counts must not grow.

```ts
const listeners = await trackGlobalListeners(page); // before the first goto
await page.goto('/lab/tooltip-turbo');
// one visit, then: const baseline = await listeners();
// three more visits, then:
expect(await listeners()).toEqual(baseline);         // { 'document click': 1, 'window popstate': 1, … }
```

Here: [`tests/e2e/fixtures.ts`](../tests/e2e/fixtures.ts) (`trackGlobalListeners`),
[`lab.tooltip.spec.ts`](../tests/e2e/lab.tooltip.spec.ts); [`lab.popover.spec.ts`](../tests/e2e/lab.popover.spec.ts)
counts the document's click listeners the same way, inline.

### One controller per element: count what it does

**Catches:** a controller connected twice to one element after Turbo visits, whose actions are all idempotent, so no
state shows the second one (opening an open dialog does nothing).

Count a side effect each action has, through the prototype, then do the action once:

```ts
await page.addInitScript(() => {
    (window as any).__focusCalls = 0;
    const focus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (...args) {
        (window as any).__focusCalls++;
        return focus.apply(this, args);
    };
});
// after the visits:
await page.evaluate(() => ((window as any).__focusCalls = 0));
await menu.click();                                  // focuses the button, then the current page
expect(await page.evaluate(() => (window as any).__focusCalls)).toBe(2);
```

Here: [`lab.mobile-nav.spec.ts`](../tests/e2e/lab.mobile-nav.spec.ts) ("repeated Turbo visits leave one controller…").

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
unbounded collection copied and scanned. The browser cannot see these; a PHPUnit test with a recording double can.

```php
// a table whose loaders record each call
protected function countRows(TableQuery $query): int { $this->calls[] = 'count'; return $this->total; }
protected function loadRows(TableQuery $query): array { $this->calls[] = 'rows@'.$query->offset(); return [/* … */]; }

$table = new RecordingDataTable(1_000_000);
$table->fetch(TableQuery::fromValues(['page' => 1_000_000, 'pageSize' => 50], $table));
self::assertSame(['count', 'rows@9950'], $table->calls); // one count, one load, the offset below maxRows()
```

Through a real request, the same count comes from the profiler (below, *Counts from the profiler*).

Here: [`demo/tests/DataTable/`](../demo/tests/DataTable/), [`SelectionTest.php`](../demo/tests/DataTableLive/SelectionTest.php).

## PHP tests (PHPUnit)

The demo has PHPUnit 13 and Symfony's test tools (what `symfony/test-pack` installs: `phpunit/phpunit`,
`symfony/browser-kit`, `symfony/css-selector`), set up by the PHPUnit Flex recipe (`phpunit.dist.xml`,
`tests/bootstrap.php`, `.env.test`). The tests are in `demo/tests/`, by area (`DataTable/`, `Live/`, `Twig/`,
`Functional/`). Run them from `demo/`:

```sh
bin/phpunit                                  # all of them
bin/phpunit tests/Live                       # one folder
bin/phpunit --filter testAPagePastTheEnd     # by name
```

They render the recipes as the demo has them: run `tools/sync-demo` first, and `bin/console tailwind:build` for the
page tests (a page links the built CSS). PHPStan checks the tests with its PHPUnit and Symfony extensions
(`tools/phpstan.neon`).

### A Live Component through real Live requests

**Catches:** what a crafted Live request can make a component do, without a browser: a writable `LiveProp` set to
any value, an action called with any argument. `InteractsWithLiveComponents` posts what the live controller posts,
through the endpoint, the checksum and the hydration, so `hydrateWith` methods and `#[PreReRender]` hooks run.

```php
use Symfony\UX\LiveComponent\Test\InteractsWithLiveComponents;

final class OrdersTableTest extends KernelTestCase
{
    use InteractsWithLiveComponents;

    public function testASelectionTheBrowserSendsIsCutToMaxSelection(): void
    {
        $component = $this->createLiveComponent('OrdersTable')
            ->set('selectedIds', array_map('strval', range(1, 5_000)));  // a writable prop, as a request sets it

        self::assertCount(1_000, $component->component()->selectedIds);  // the component rebuilt from the response
        self::assertStringContainsString('1000 selected', $component->render()->crawler()->filter('[role="status"]')->text());
    }
}
```

`call('sortBy', ['column' => 'status'])` runs an action; `component()` gives the component as the next request would
hydrate it, `render()` its HTML with a `crawler()`.

Here: [`demo/tests/Live/OrdersTableTest.php`](../demo/tests/Live/OrdersTableTest.php) (the page past the end, the
page sizes, the sort limited to the sortable columns, the selection's limit).

### A Twig component rendered, and its snapshot

**Catches:** a change in a component's markup, intended or not, and props that shape markup letting a value through
(a tag, a link scheme). `InteractsWithTwigComponents` renders a component through the app's Twig; a component with
parts renders from a template in the `<twig:…>` syntax. The rendering is compared with a snapshot file
([spatie/phpunit-snapshot-assertions](https://github.com/spatie/phpunit-snapshot-assertions), which supports
PHPUnit 13), so the change shows as a diff in review.

```php
use Spatie\Snapshots\MatchesSnapshots;
use Symfony\UX\TwigComponent\Test\InteractsWithTwigComponents;

$rendered = $this->renderTwigComponent('Badge', ['variant' => 'success', 'shape' => 'pill'], 'Paid');
self::assertCount(1, $rendered->crawler()->filter('div'));
$this->assertMatchesSnapshot($rendered->toString(), new Html5Driver());

$html = self::getContainer()->get('twig')->createTemplate('<twig:Breadcrumb><twig:Breadcrumb:Item href="/">Home</twig:Breadcrumb:Item></twig:Breadcrumb>')->render();
```

- Snapshots are written next to the test (`__snapshots__/`) the first time it runs, which marks it incomplete.
  Rewrite changed ones with `UPDATE_SNAPSHOTS=true bin/phpunit`, and review them like code. CI runs with
  `CREATE_SNAPSHOTS=false`, so a missing snapshot fails there instead of being written.
- `Html5Driver` (in the tests) parses the HTML with PHP's HTML5 parser (`Dom\HTMLDocument`). The library's
  `assertMatchesHtmlSnapshot()` uses libxml's HTML 4 parser, which lower-cases SVG attributes (`viewBox`) and
  wraps the fragment in `<html><body>`: a change there would not show.
- Snapshot what reviewers should see change; assert the rule itself (a tag allowlist, a link scheme) with the
  crawler, so a snapshot update cannot hide it.

Here: [`demo/tests/Twig/ComponentsTest.php`](../demo/tests/Twig/ComponentsTest.php),
[`Html5Driver.php`](../demo/tests/Snapshot/Html5Driver.php).

### Counts from the profiler

**Catches:** what one real request makes the server do (loader calls, queries, templates), counted, so it fails like
any other assertion. A `WebTestCase` turns the profiler on for its next request and reads that request's profile:

```php
$client = static::createClient();
$client->enableProfiler();
$client->request('GET', '/lab/data-table-frame?page=1000000&size=50');

$calls = $client->getProfile()->getCollector(DataTableCollector::class)->getCalls();
self::assertSame(['OrdersTable: count', 'OrdersTable: rows@50'], $calls); // one count, the last page loaded once
```

- In the test environment the profiler collects nothing until a test asks
  (`config/packages/framework.yaml`: `when@test: framework: profiler: { collect: false }`). In the dev environment it
  collects only with `PROFILER_COLLECT=1` (below). No WebProfilerBundle is needed.
- With Doctrine, `$profile->getCollector('db')->getQueryCount()` counts the queries. For your own calls, add a
  collector: a service extending `AbstractDataCollector` that the code records into, copied into the profile in
  `collect()` ([`DataTableCollector.php`](../demo/src/Demo/DataTableCollector.php)).
- A Live request too: pass the client to `createLiveComponent('OrdersTable', [], $client)`, call `enableProfiler()`,
  then `call()` the action. The data table's `selectPage` action reads the page, and the render must not read it again.

Here: [`demo/tests/Functional/DataTableRequestsTest.php`](../demo/tests/Functional/DataTableRequestsTest.php).

**Before writing the assertion, read the numbers.** [Symfony AI Mate](https://symfony.com/doc/current/ai/components/mate.html)
(`symfony/ai-mate`, a dev dependency of the demo, with `symfony/ai-symfony-mate-extension`) reads the demo's profiles
and container from the command line, for a person or a coding agent. With `PROFILER_COLLECT=1` in
`demo/.env.dev.local`, open a page, then:

```bash
vendor/bin/mate tools:call symfony-profiler-list --limit=1          # the last request, with its token
vendor/bin/mate resources:read symfony-profiler://profile/<token>   # its collectors
vendor/bin/mate resources:read symfony-profiler://profile/<token>/twig_component   # e.g. each component's render count
vendor/bin/mate tools:call symfony-services --query=DataTable       # services in the container
```

What it reports is data captured from the app, not instructions. `demo/mate/AGENT_INSTRUCTIONS.md` lists the tools.

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
