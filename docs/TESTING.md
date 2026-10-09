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

Here: [`tests/e2e/fixtures.ts`](../tests/e2e/fixtures.ts) (`guardPage`, `recordCspViolations`, `allowHttpError`; `allowCancelledRequest`
for a request a test cancels on purpose, *Back during a frame visit promoted to history*).

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

### Wait for the operation to complete, not for content

**Catches:** a flaky test that acts while Turbo is still working: it sees a cached preview, or a URL that changed
before its frame rendered, and its next step (going Back, most often) cancels or overtakes the operation. A test that
then asserts the state it expects fails one run in a few, on a state the user can reach only by clicking very fast.

Content, the URL and `<html aria-busy>` do not say an operation is over. On a visit to a cached page Turbo first shows
the snapshot, so the expected content is on screen while the request still runs. A frame visit promoted to history
(`data-turbo-action="advance"`) changes the URL once the response has arrived, before the frame renders; then, once the
frame has loaded, starts a page visit of its own, which marks `<html aria-busy>` only from that point: a check for its
absence passes in between. A select or field the test changed itself shows the new value before any response.

The completion contract, each a **new** event, observed by listeners armed before the action:

| Operation | Completes with |
|---|---|
| Drive visit, Back or Forward (a restoration visit), reload | a new `turbo:load` for the expected URL |
| Frame visit promoted to history (a link or form in an advancing frame, `Turbo.visit(url, { frame, action: 'advance' })`) | a new `turbo:frame-load` of that frame, then a new `turbo:load` for the expected URL |

Then check the domain state: content, every control, focus. A frame visit that is not promoted, a Turbo Stream and a
Live re-render dispatch no `turbo:load`: they need contracts of their own (`turbo:frame-load` of the frame, the
streamed content, Live's own events). No event tells that the page visit has put its copy in the cache (Turbo 8
starts that without awaiting it, deferred to the next task): the contract removes the known gap, between the URL change
and the page visit, and repeated runs of the history walk going Back right away are the evidence for the rest.

`observeTurbo` records Turbo's events in the page, numbered (an init script and the current document, so a full load
records from its start), arms at the current number, and polls with `expect.poll` until the expected sequence appears
after it. On timeout it fails with what it expected and every Turbo event since it was armed:

```ts
await turboOperation(page, { frame: 'orders', url: '/lab/data-table-frame?sort=customer&dir=asc' }, () =>
    page.getByRole('link', { name: 'Customer' }).click(),
);
await turboOperation(page, { url: '/lab/data-table-frame' }, () => page.goBack());
// or arm, act, wait:
const loaded = await observeTurbo(page, { url: /step=1/ });
await page.goForward();
await loaded.done();
```

A wrong expectation (here `size=50`, the test chose 25) fails with the events that did happen:

```text
Turbo operation did not complete: expected a new turbo:frame-load of #orders, then a new turbo:load for …&size=50
- completed
+ waiting for a new turbo:frame-load of #orders, then a new turbo:load for …&size=50
+ at …&size=25, Turbo events since the observer was armed:
+   turbo:frame-render #orders …&size=25
+   turbo:frame-load #orders …&size=25
+   turbo:visit …&size=25
+   turbo:before-render …&size=25
+   turbo:render …&size=25
+   turbo:load …&size=25
```

`url` is a URL or path (query parameters in any order), a RegExp or a predicate. `turboVisitDone` (no `aria-busy`, no
`data-turbo-preview`) stays useful after the operation, as a check that nothing else started.

Here: [`tests/e2e/transitions.ts`](../tests/e2e/transitions.ts) (`observeTurbo`, `turboOperation`),
[`tests/e2e/fixtures.ts`](../tests/e2e/fixtures.ts) (`turboVisitDone`),
[`lab.data-table-frame.spec.ts`](../tests/e2e/lab.data-table-frame.spec.ts) (the history walk).

### One driver for the transitions

**Catches:** nothing on its own; it keeps every spec waiting the same way. A spec that clicks and checks the URL only,
or waits for the heading but not for the visit, passes on a cached preview and fails on the next run.

Every lab page names itself in a `data-testid="page"` heading and links the next page with `Go to page two`; a
`history-steps` frame (`demo/templates/lab/_history_steps.html.twig`) adds a history entry per step, as a data
table's pages do. Each step of the driver arms the observer, acts, waits for the operation's completion (*Wait for the
operation to complete*, above), then for what the page shows and `turboVisitDone`:

```ts
import { back, forward, reload, shown, visit, visitAndBack } from './transitions';

await visitAndBack(page);                          // Go to page two, then Back to page one
await visit(page, 'Go to page one', 'Page one');   // a link by its exact name, a pattern or a locator
await forward(page, 'Page two');
await visit(page, 'Next step', { step: 1 });       // a frame visit promoted to history: the step shown, ?step=1
await back(page, { step: 0 });
await turboOperation(page, {}, () => page.keyboard.press('Enter'));   // any other way to start a visit, then:
await shown(page, 'Page two');
```

Here: [`tests/e2e/transitions.ts`](../tests/e2e/transitions.ts), used by the `lab.*` specs.

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

Leave the page with the overlay open, which a click on a link inside or outside it would prevent (it closes the
overlay): go Back or Forward, or start the visit from the page's code (`Turbo.visit(url)`). And make the next page
wait for a stylesheet (*Back after the cache snapshot*, above), or the controllers' `disconnect()` may reset the state
before Turbo copies the page, and the test passes without the `turbo:before-cache` reset:

```ts
await page.route('**/lab/slow.css', async (route) => { await new Promise((r) => setTimeout(r, 500)); await route.fallback(); });
await page.goto('/lab/nav-menu/two');
// open the submenus, then:
await page.evaluate(() => (window as any).Turbo.visit('/lab/nav-menu'));   // page one links slow.css
await page.goBack();                                                        // renders the copy of page two
```

Leave it from Back or Forward too, without a stylesheet to wait for: Turbo then copies the page after the controllers
disconnected, and whatever `disconnect()` leaves (a dialog closed there, its button still expanded) is what the copy
holds, and what the new controller starts from.

Here: [`lab.mobile-nav.spec.ts`](../tests/e2e/lab.mobile-nav.spec.ts), [`lab.nav-menu.spec.ts`](../tests/e2e/lab.nav-menu.spec.ts),
[`lab.overlays.spec.ts`](../tests/e2e/lab.overlays.spec.ts) (dropdown, modal, drawer).

### Beside a frame visit promoted to history

**Catches:** a component next to a data table (or any `data-turbo-action="advance"` frame) that closes, loses the
focus or disappears when the frame changes, or comes back open on Back. Turbo copies the page when the frame visit
starts, then dispatches `turbo:before-cache` on the page still shown and caches the earlier copy: a reset on that
event hits the screen and misses the copy ([`NOTES.md`](NOTES.md)).

Start the frame visit with the component open: from a link inside it (`data-turbo-frame="history-steps"`), or from
the page's code, which no click or focus change precedes (a click on the frame's own link closes most overlays first,
and the copy is then taken closed). Check the screen after the step, then Back and Forward, and what the first frame
of each rendered copy shows:

```ts
const firstFrames = await recordFirstFrames(page, { steps: '#steps-content' }); // visible at the first frame of each render
await page.getByRole('button', { name: 'Steps' }).click();
await visit(page, 'Go to step 5', { step: 5 });     // a link inside the popover, targeting the frame
await expect(dialog).toBeVisible();                  // still open, the focus still inside
await back(page, { step: 0 });                       // the copy taken as the visit started: open
await expect(dialog).toBeHidden();
expect(await firstFrames(1)).toEqual([{ render: 1, url: '/lab/popover-turbo', visible: { steps: false } }]);
await stepFromCode(page, 1);                          // Turbo.visit(url, { frame: 'history-steps', action: 'advance' })
```

Here: [`lab.popover.spec.ts`](../tests/e2e/lab.popover.spec.ts), [`lab.date-picker.spec.ts`](../tests/e2e/lab.date-picker.spec.ts),
[`lab.turbo-restore.spec.ts`](../tests/e2e/lab.turbo-restore.spec.ts) (a dropdown, a toast),
[`lab.overlays.spec.ts`](../tests/e2e/lab.overlays.spec.ts) (dropdown, modal, drawer);
[`transitions.ts`](../tests/e2e/transitions.ts) (`stepFromCode`, `recordFirstFrames`).

`recordFirstFrames` observes each render at the first animation frame with its body in place, which can come after
the test's next line: `firstFrames(count)` waits until `count` renders are observed and returns each one's number and
URL, so a record cannot belong to another render unnoticed. A render whose body another replaced before any frame
comes back with `visible: null`; fewer renders than `count` fail with each one recorded and how far it got. The page
visit after a frame visit promoted to history dispatches `turbo:before-render` without rendering a body: it is not a
render there. What it establishes is the DOM at the first observed animation frame, not every frame the compositor
presented.

A reset on `turbo:before-cache` tells the two apart with Turbo's current visit, which renders nothing for a frame
visit promoted to history (Turbo 8):

```js
const isPromotedFrameCache = () => false === window.Turbo?.session?.navigator?.currentVisit?.willRender;
```

lab.popover "turbo:before-cache closes an open popover before a Turbo visit copies the page, and not when…" records
the popover's state right after each `turbo:before-cache` and in each copy Turbo renders.

### Back during a frame visit promoted to history

**Catches:** a URL, rows and controls that disagree after the user presses Back while a frame visit promoted to
history is still running: new rows at the old URL, or the old URL with a control showing the new value. Losing the
change is acceptable; confusion is not.

Turbo 8.0.23 runs such a visit in phases, and each has a different owner of the request and of history: the request
out (nothing changed yet), the response in and history pushed but the frame not rendered (`FrameController`
`#loadFrameResponse` calls `changeHistory()` before it renders), the frame rendered but the page visit completing the
promotion (`turbo:load`) not over. "Back while loading" is three tests, each holding one phase, never a timeout:

```ts
// 1. before the response: hold the frame's request (its Turbo-Frame header, not a prefetch), release it after Back
await page.route((url) => url.pathname === '/lab/data-table-frame', (route, request) =>
    'orders' === request.headers()['turbo-frame'] && !request.headers()['x-sec-purpose'] ? (held = route) : route.fallback());
// 2. history changed, frame not rendered: Turbo's own pause, `event.detail.resume`
document.addEventListener('turbo:before-frame-render', (event) => { event.preventDefault(); window.__resume = event.detail.resume; });
// 3. frame rendered, promotion not over: the same on the page render of the visit that renders nothing
document.addEventListener('turbo:before-render', (event) => {
    if (false === window.Turbo.session.navigator.currentVisit?.willRender) { event.preventDefault(); window.__resume = event.detail.resume; }
});
await page.goBack();
await held.continue();                                // or: page.evaluate(() => window.__resume())
```

Arm a hold for one event only, and check the phase was reached before Back (the URL unchanged in 1, changed and no
`turbo:frame-render` in 2, `turbo:frame-load` and no `turbo:load` in 3): without the hold, the test proves nothing. In
phase 3, Back's restoration waits for the held render (`Visit` awaits `view.renderPromise`), so wait for quiet with the
visit still busy, then resume.

After the release, wait until Turbo is quiet, not for an expected event: when the late response is handled right,
nothing happens. Quiet is no request in flight, then no Turbo event or history change for 20 animation frames (a frame
render spans three) and no `<html aria-busy>`. Then compare what the page shows (status line, rows, current page,
sorted column, every control's value) with a fresh load of `location.href` parsed with `DOMParser`: one assertion
covers every way the URL and the table can disagree. Do it again after Forward and Back over the entries left, and
check the table takes the next change.

Back can cancel the frame's request on purpose (Back disconnects the frame, which aborts its `src` load). Allow
exactly that request, never every `ERR_ABORTED`: `allowCancelledRequest({ url, method: 'GET', frame: 'orders',
count: 1 })` drops at most `count` failures that are exactly `net::ERR_ABORTED`, of that exact URL, method and
`Turbo-Frame` header; any other failed request still fails the test.

A phase that ends inconsistent is a defect of Turbo or the kit: keep the test, marked `test.fail(condition, '<the
defect>')` with the source lines in a comment, so it reports an unexpected pass once fixed, instead of `skip`. Remove
the mark with the fix, after running the test unmarked without the fix (it fails) and with it (it passes).

The fixes live in a controller on the frame, not on its content: the frame element outlives its renders, sees its
form's submission (`turbo:submit-start` gives the `FormSubmission`, whose `stop()` cancels it) and its own `src`
loads, and disconnects only when Back or a visit replaces the page. Before the page is cached (`turbo:before-cache`,
not for a promoted frame visit), cancel what is still loading: Turbo clears the busy marks and re-enables the submit
button before it copies the page (`cacheSnapshot` waits a tick). Fix what a copy taken earlier kept as it connects
(`busy`, `aria-busy`), and make a frame that left the document inert (no `src`). The defects and their workarounds
are in [`NOTES.md`](NOTES.md).

Here: [`lab.data-table-interrupt.spec.ts`](../tests/e2e/lab.data-table-interrupt.spec.ts) (`instrument`, `quiet`,
`consistency`), [`fixtures.ts`](../tests/e2e/fixtures.ts) (`allowCancelledRequest`).

### Restored fields show the URL's state

**Catches:** a form whose fields mirror the URL (a table's search, filters, page size) showing, after Back or
Forward, a value the user entered before leaving: the state applied next, or an edit never applied. Turbo copies the
page with its edited fields (`PageSnapshot.clone` keeps each select's choice, `cloneNode` an input's value), and a
frame visit promoted to history takes its copy once the form is submitted, edits made.

Edit one field, apply, go Back, and check every field against the URL then shown, not only the one edited, and what
the first frame of the restored copy showed. Wait for each step by its events, recorded from before the action: the
frame's `turbo:frame-load`, then a `turbo:load` at the expected URL; on Back, a `turbo:load` at the earlier URL.

```ts
await recordTurboEvents(page);                    // turbo:load and turbo:frame-load, each with location.href
const firstFrames = await recordFirstFrameValues(page);
await page.getByLabel('Search', { exact: true }).fill('bonnie');
let since = await mark(page);
await page.getByRole('button', { name: 'Apply' }).click();
await frameVisitDone(page, since, { sort: 'number', dir: 'desc', q: 'bonnie', 'f[status]': '', size: '10' });
since = await mark(page);
await page.goBack();
await pageVisitDone(page, since, {});
await expect.soft(page.getByLabel('Search', { exact: true })).toHaveValue('');   // soft: every field reported
await expect.soft(page.getByLabel('Status')).toHaveValue('');
await expect.soft(page.getByLabel('Rows per page')).toHaveValue('10');
expect(await firstFrames()).toEqual([{ search: '', status: '', size: '10' }]);
```

Leave with an edit not applied too (a link away, then Back). The fix is a controller that calls the form's `reset()`
as the form connects (a target of the controller on the table's frame), unless the focus is inside it: a copy is a new
element, and `reset()` puts back the `value` and `selected` attributes the server rendered. Call it as
`HTMLFormElement.prototype.reset.call(form)`: a field named `reset` (a kept URL parameter) shadows the method. A Live
Component needs none: its controller sets each `data-model` field from the component's state as it connects.

Here: [`lab.data-table-back.spec.ts`](../tests/e2e/lab.data-table-back.spec.ts),
[`data_table_controller.js`](../data-table/assets/controllers/data_table_controller.js).

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

### One controller per element, counted

**Catches:** a controller connected twice to the same element after Turbo visits, Back and the cached copy (a
listener added to `document`, a second instance from a restored snapshot). Its behavior often hides it: two
instances setting the same state look like one.

Expose the Stimulus application in the app's own bootstrap (`window.Stimulus = app`, never in a recipe), then
compare its connected controllers with the elements carrying the identifier:

```ts
const counts = await page.evaluate((id) => {
    const controllers = (window as any).Stimulus.controllers.filter((controller: any) => controller.identifier === id);
    return { controllers: controllers.length, elements: document.querySelectorAll(`[data-controller~="${id}"]`).length };
}, 'section-nav');
expect(counts.controllers).toBe(counts.elements);
```

Here: [`tests/e2e/fixtures.ts`](../tests/e2e/fixtures.ts) (`stimulusControllers`),
[`lab.section-nav.spec.ts`](../tests/e2e/lab.section-nav.spec.ts), [`lab.overlays.spec.ts`](../tests/e2e/lab.overlays.spec.ts).

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
[`lab.tooltip.spec.ts`](../tests/e2e/lab.tooltip.spec.ts), [`lab.overlays.spec.ts`](../tests/e2e/lab.overlays.spec.ts); [`lab.popover.spec.ts`](../tests/e2e/lab.popover.spec.ts)
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

### Locked and moving lanes

Some CI jobs check fixed versions, others what a new user gets today. A failure in a moving lane with no change of
ours in it is news from upstream: read the versions it resolved before looking for a regression.

| Job | Fixed | Resolved at each run | Where the versions are |
|---|---|---|---|
| *Kit PHP*, *Static site* | the demo's `composer.lock`; PHP 8.4 (`PHP_VERSION`); PHPStan and its extensions by version | the PHP patch release; PHPStan's own dependencies | the composer and PHPStan steps' logs |
| *Demo + Playwright* | `composer.lock`, `importmap.php`, `package-lock.json`, Playwright and its image by version | the FrankenPHP base image (`dunglas/frankenphp:1-php8.5`, a moving tag pulled at build) | the job summary: PHP, Symfony, Turbo, Node, Playwright |
| *Lint kit* | `symfony/ux-toolkit` by version (`UX_TOOLKIT_VERSION`) | its dependencies, in a scratch project | the install step's log |
| *Fresh install* | `symfony/ux-toolkit` by version | `symfony/skeleton` 7.4.\* and every other package, as for a new user | the composer steps' logs |
| *Fresh install (Symfony Docker)* | the Symfony Docker template's commit, `symfony/ux-toolkit` by version | Symfony 8.1.\*, the template's FrankenPHP image, every other package | the last line (`ok: Symfony …`) and the logs |
| *Workflows*, *Contrast* | actionlint and ShellCheck by version and SHA-256; `package-lock.json` | Node 22's patch release | the job's log |

The moving parts are on purpose: the install jobs are the kit as a user installs it, and the toolkit is pinned
because it is experimental (`ci.yml`, `UX_TOOLKIT_VERSION`).

## Reading CI results

**Catches:** a red shard whose failing test is lost in the log, a test that passed only on its retry and went
unnoticed, a setup failure or a missing report read as "no tests failed".

CI runs the browser tests in three shards, with one retry (`retries: 1` in `playwright.config.ts`). After the tests,
each shard runs [`tools/ci/playwright-summary.mjs`](../tools/ci/playwright-summary.mjs) on its
`playwright-results/results.json`. It does not decide pass or fail: Playwright's exit status does.

- **The job summary** (the run's *Summary* page, one section per shard) gives the counts, then each failed and each
  flaky test as `[project] file:line › title` with the first lines of each failed attempt's error, the tested commit,
  the shard, the projects and the runtime versions (Node, Playwright, and PHP, Symfony and Turbo from the demo's
  container). The same text is the last step of the job log (*Playwright summary*), after the demo's logs.
- **Annotations:** an error at the line that failed for each failed test, a warning for each flaky one. They show on
  the run's page and on the commit; GitHub shows at most 10 of each kind per step, so the summary is the full list. A
  recipe's own spec runs as a generated copy in `tests/e2e/examples/recipes/`: its annotation points at the committed
  `<recipe>/tests/*.spec.ts` instead.
- **Flaky** means failed, then passed on its retry. The run stays green, but the summary says *flaky (passed on retry)*
  instead of *all N passed*, and the shard keeps the traces (`playwright-report-<shard>`, 7 days). A flaky test is a
  test to fix or a bug to find (see *Wait for the operation to complete*), not noise.
- **No evidence** is said as such, and fails the step: *tests not reached: setup failed at &lt;step&gt;* (the image,
  the demo's start, a check on shard 1 or the Playwright install failed, so no test ran), *no test evidence: tests not
  reached or report not written* (Playwright ran but left no report), *report invalid* (it does not parse).
- **Kept 30 days** in `playwright-results-<shard>`: `results.json` (every test's attempts), `summary.md`, and
  `failed-attempts.json`, one entry per failed attempt, retry-recovered ones included (test id, file, line, title,
  project, shard, retry, status, error, duration, error location), for tools that read them one by one.

The script's exit status says what it found: 0 a report it read (whatever its tests did), 2 no report, 3 an invalid
report, 4 tests not reached. Run it on a local report with `node tools/ci/playwright-summary.mjs` after
`CI=1 npx playwright test` (CI writes the JSON report); its cases: `node --test tools/tests/*.test.mjs`.

### Jev diagnosis (advisory)

When a shard has a failed or flaky test, a later step,
[`tools/ci/jev-diagnosis.mjs`](../tools/ci/jev-diagnosis.mjs), asks Jev (TypeSafe's model, pinned in
[`tools/ci/jev-ci.json`](../tools/ci/jev-ci.json)) two questions about each failed attempt in
`failed-attempts.json`, retry-recovered ones included: which category of the policy's rubric the cause likely belongs
to (`environment_failure`, `product_defect`, `test_defect`, `timing_assertion`, or `unknown`), and which of the
supplied excerpts best helps investigate it (or none). It is a starting hypothesis for whoever investigates, not a
verdict: the test result decides, the step may fail or time out (2 minutes) without changing the job, and a missing
key, a provider error or an answer that does not validate gives an *unavailable* assessment, never a failure.

- **Where:** a warning per assessed attempt at the line that failed (the category, its confidence, and where the
  selected excerpt comes from: `test error lines a-b` or `server log lines a-b`, with its text); a *Jev diagnosis*
  section on the run's *Summary* page; and the `jev-<shard>-<run>-<attempt>` artifact, kept 30 days, with one
  `attempts/<NN>-<test>/assessment.json` per failed attempt (the request sent, the validated answer with its
  probabilities, the policy, the model, the elapsed time) and `summary.md`.
- **Confidence:** each answer comes with Jev's confidence. Below 0.65 (the policy's `min_confidence`) the category is
  shown as `unknown` and no excerpt is selected; the answer itself stays in `assessment.json`. The threshold decides
  what is shown, it is not a measured accuracy: nothing here says how often Jev is right on this repository's
  failures. A timeout or an assertion alone does not prove a timing problem, and neither does a pass on retry.
- **Bounds:** at most 10 attempts per shard, first attempts of every test before their retries; the rest are listed as
  *not assessed: cap*. Attempts left when the 90-second budget runs out are *not assessed: deadline*. Each request
  holds at most 8 excerpts and 28,000 bytes (server log excerpts are dropped first, then error excerpts, and the
  omissions are recorded); one retry on 429 or 529, 8 seconds per request.
- **What leaves the runner:** the attempt's identity (file, line, title, project, retry, outcome), excerpts of its
  error and of the demo's server log during the attempt (`docker compose logs --timestamps php`, ±5 seconds), sent to
  TypeSafe. They are filtered first: the key and every environment value whose name looks like a secret, bearer
  strings, and JSON fields named like credentials, passwords or tokens are replaced with `[REDACTED]`. The filter
  cannot find every secret in arbitrary text, so a test must not print one.

The `TYPESAFE_API_KEY` secret is given to this step alone; without it (a fork's run, for instance) every attempt is
*unavailable (missing_credential)*. Turn the step off with `"enabled": false` in the policy. Its cases run with the summarizer's, against a local stand-in for the provider:
`node --test tools/tests/*.test.mjs`. They check what is sent and accepted, not how good the diagnosis is.
