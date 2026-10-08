# Plan: test tiers (behavior, basic performance, release checks)

_2026-10-08. Decided with the user on 2026-10-08:_

1. _**Three tiers:** behavior tests and basic performance checks on every pull request, and a heavier set of
   behavior and performance tests (the release checks) that runs before a release, by hand, and once a day when
   `main` changed._
2. _**The demo is the fixture.** Performance is measured end to end in the demo, where recipes, Turbo, Live
   Components, `flowbite.min.css` and the strict CSP meet. Small component tests only where e2e cannot isolate a
   cost._
3. _**A baseline first:** timings are recorded on `main` before anything is compared or gated._
4. _**Every tier must pass for a release, from 0.3.0.** 0.2.0 ships on the current checks and the security audit;
   the work in this plan starts after 0.2.0._

_What led here: the theme toggle showed no icon under a dark system with the light theme chosen, and a theme switch
faded table rows (`fix(theme-toggle)`). Each component's states were tested, not the moves between them, and nothing
measured what a switch costs._

## The tiers

| Tier | What | When | Gates |
|---|---|---|---|
| 1. Behavior | State × transition specs: every state a component can be in, and every way it moves between them | Every pull request and push to `main` (today's CI) | The pull request; a release |
| 2. Basic performance | Deterministic counts, as assertions inside tier 1 specs | With tier 1 | The pull request; a release |
| 3. Release checks | Timings against the baseline, harsh conditions, long sessions, wide matrices | Before a release, by hand, daily when `main` changed | A release |

### 1. Behavior

The model is `tests/e2e/theme-toggle.spec.ts`: list the states (system light or dark × no, light or dark choice),
list the transitions (toggle, system change, Turbo visit, Back, reload), and after each transition check the whole
state (class, `aria-pressed`, visible icon, saved choice, first paint).

- **Per recipe with behavior:** an inventory of its states and transitions, and which spec covers each. The inventory
  is the first deliverable: it shows the gaps before any test is written.
- **Transitions every interactive recipe is checked against:** Turbo Drive visit, Back and Forward, the cache
  snapshot, a frame visit (with and without `data-turbo-action="advance"`), a Stream `replace` and `update`, a Live
  re-render, `data-turbo-permanent`, the theme switch, and the system theme changing while the page is open.
- **Deterministic only.** A test that needs throttling, repetition or timing to show its bug belongs in tier 3.

### 2. Basic performance

Counts, not timings: the same build gives the same numbers, so they fail like any other assertion.

| Check | How |
|---|---|
| No stray transitions or animations after a state change | `document.getAnimations()` in the frame the change lands (the theme toggle spec does this) |
| No layout shift after load and after a transition | A `PerformanceObserver` for `layout-shift` entries |
| No duplicate requests on a Turbo visit, Back or a Live re-render | The page's requests, per URL |
| One controller instance and one set of listeners after repeated visits | Chromium's `Performance.getMetrics` (`JSEventListeners`, `Nodes`) before and after N visits |
| JavaScript and CSS bytes per demo page under a budget | Resource Timing `encodedBodySize`, per page, budgets in a checked-in JSON file |

Budgets change only through a pull request that says why.

**Server-side counts with the Symfony profiler.** PHP functional tests (`WebTestCase`, `$client->enableProfiler()`)
read each request's profile: the Twig templates rendered, memory, Doctrine queries, and demo-only collectors (for
example a data table's `countRows()` and `loadRows()` calls). They assert counts like "a table request runs one count
and one row load". The repository has no PHPUnit setup yet; `tools/tests/data-table.php` checks the table's calls
directly until then. The profiler slows every request, so it stays off for the release checks' timings and the
baseline.

### 3. Release checks

| Group | What |
|---|---|
| Timings | Per scenario, the median of 5 runs: total blocking time (long tasks), the slowest interaction's input-to-paint time (Event Timing), and Chromium's `RecalcStyleDuration`, `LayoutDuration`, `ScriptDuration` for the transition. Compared with the baseline, with a tolerance per metric. |
| Harsh conditions | The tier 1 transitions of the heavy recipes (data tables, editors, chart, autocomplete, date picker) under 4× CPU throttling, a slow network, and a phone viewport. |
| Long sessions | 50 Turbo visits and Backs across the demo: the JS heap, `Nodes` and `JSEventListeners` must come back to their level after the first visit (leaks a single visit hides). |
| Wide matrices | The state × transition matrix of tier 1 extended to every overlay (modal, drawer, dropdown, popover, tooltip) and editor, in both themes. |

Scenarios, all in the demo: the `/demo` dashboard, the data-table and data-table-live labs, the editor and
markdown-editor labs, the chart page, the forms page, and the Turbo labs. Server time is excluded: every metric is
taken in the browser after the response, so FrankenPHP (CI) and `php -S` (local) give comparable numbers.

## The baseline

- Recorded on `main` in CI's setup (the demo's FrankenPHP container, the browser in the pinned
  `mcr.microsoft.com/playwright` image), by the release checks workflow run by hand with a `record` input.
- Stored as `tests/perf/baseline.json`: per scenario and metric, the median, the spread of the runs, the commit and
  the date. Updated only by a pull request that shows the old and new numbers.
- **Report only at first.** The first runs print each metric against the baseline without failing. The user reviews
  the numbers and picks each tolerance; then the timings gate.

## Workflows

- **`ci.yml` (tiers 1 and 2):** unchanged in shape. Tier 3 specs are tagged `@release` and excluded with
  `--grep-invert @release`.
- **`release-checks.yml` (tier 3), new:**
  - `schedule` once a day: first compares `main`'s head with the commit of its last successful scheduled run (GitHub
    API) and stops in seconds when nothing was merged;
  - `workflow_dispatch`, with a `record` input to write a new baseline as an artifact;
  - `workflow_call`, for `release.yml`.
  - Runs `npx playwright test --grep @release` in the same setup as CI.
  - A failed daily run opens one issue (label `release-checks`), or comments on the open one, instead of failing
    anyone's pull request after the fact. A green run closes it.
- **`release.yml`:** before tagging, it calls `release-checks.yml` on the commit it is about to tag. A red result
  stops the release; tiers 1 and 2 already passed, since `release.yml` runs only after CI succeeded on `main`. A
  failure blocks the release until it is fixed, or until the user waives that check for that release in writing (the
  CHANGELOG entry says which and why).

Specs live with the others in `tests/e2e/`; tier 3 is a tag, not a separate tree.

## Delivery

One pull request each, in order:

1. **This plan** (`docs/PLAN-test-tiers.md`), reviewed.
2. **The inventory:** per recipe, its states and transitions and the spec covering each, as a table in this file.
3. **Baseline:** the timing harness, `release-checks.yml` with `workflow_dispatch` and `record`, report only, and the
   first `tests/perf/baseline.json`.
4. **Tier 2:** the count checks and the byte budgets, in the existing specs.
5. **Tier 1 gaps:** the missing state × transition specs from the inventory, a recipe group per pull request.
6. **Tier 3 and the release gate:** harsh conditions, long sessions, wide matrices, the daily schedule and its issue,
   `release.yml` calling it.
7. **Gates on:** the tolerances the user picked after reviewing the reports.

## Open questions

1. Tolerances per timing metric: decided after the report-only runs (step 7).
2. How many runs per scenario: 5 is the starting point; more if the spread is wide.
3. Firefox and WebKit: Chromium only for now (the metrics above are Chromium's); revisit after the release.
