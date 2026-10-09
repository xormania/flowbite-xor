# Test inventory: states, transitions and the specs covering them

_2026-10-08. Step 3 of [`PLAN-test-tiers.md`](PLAN-test-tiers.md): the suite-wide coverage map. Per recipe with
behavior, its states, the transitions it must survive, and the test that establishes each, or a gap. Built from the
controllers, the lab pages and the specs on `dev` (`a3f37dd`), not from their titles alone. A pull request that adds,
moves or removes coverage updates the rows it touches, and its own coverage map (the pull request template) says so._

## How to read it

- **Specs** are named by file without `.spec.ts`: `lab.popover` is `tests/e2e/lab.popover.spec.ts`; a recipe's own
  spec (`<recipe>/tests/*.spec.ts`, run as `tests/e2e/examples/recipes/`) is `recipe:<name>`; the interaction
  screenshots of `tests/e2e/examples/fixtures.ts` (`testState`) are `shot:<recipe>`. PHPUnit tests are named by class
  (`demo/tests/…`).
- **Scope:** unit, Twig or Live component (PHPUnit with the UX helpers), functional (`WebTestCase`), E2E lab
  (`/lab/*` pages), E2E demo (`/preview/*`, `/forms`, `/demo`), screenshot.
- **Cells:** a spec name means covered there; **G*n*** is a gap, ranked at the end; `·` means the transition cannot
  affect the recipe (no state it would lose, or the recipe never sits where it happens); `css` means the theme changes
  only CSS variables, so the screenshots of both themes cover the end states and nothing runs in between; **T2**,
  **T3** mean the check belongs to tier 2 (counts) or tier 3 (release checks) of the plan, not to tier 1.

## Which recipes are here

A recipe is in the matrix when one of these holds (found with `*/assets/controllers/*_controller.js`, a grep of
the recipes' templates and PHP for `data-controller`, `symfony--ux-*`, `AsLiveComponent`, `data-turbo*`,
`turbo-frame` and `turbo-stream`):

1. **It ships a Stimulus controller:** alert, avatar, calendar (with `calendar_display`), chart, date-picker, drawer,
   dropdown, dropzone (`dropzone_assist`), editor, markdown-editor, modal (`flowbite_modal`), navbar, popover,
   side-nav, sidebar, tabs, theme-toggle, toast, tooltip.
2. **It wires a Symfony UX controller:** autocomplete (and form-theme's `AutocompleteType` rows), chart (UX Chart.js),
   dropzone (UX Dropzone).
3. **It is a Live Component:** data-table-live, markdown-editor.
4. **Its markup carries Turbo behavior:** data-table (a `<turbo-frame>` with `data-turbo-action="advance"`), layouts
   (`data-turbo-permanent` sidebar and toast region, `data-turbo-track`, the inline theme script), sidebar and toast
   (`data-turbo-permanent`, the toast's Stream template).

Left out, with where their guarantees live: the presentational recipes (badge, button, card, table, …) and theme
(CSS only): screenshots of every README example in both themes (`examples/examples`), axe on every example in both
themes and every `/r/` page (`a11y`), hostile props (`hostile-props`), markup snapshots for Badge and Breadcrumb only
(`demo/tests/Twig/ComponentsTest.php`). Pagination: links only, its frame behavior is the data table's. The blocks
(login, signup, forgot-password, settings-profile, not-found, dashboard-home): server flows in `demo-app` (E2E demo).
form-theme: `forms` (rows match the hand-written components in both themes, server errors, the date picker and
Dropzone opt-ins).

## The matrix: common transitions

Columns are the plan's transitions. **Back** is a restoration visit from Turbo's cached copy; **Back, slow** is the
same with page two's stylesheet delayed, so Turbo copies the page before the controllers disconnect (the order
production gives; `lab.turbo-restore`); **N visits** is "repeated visits leave one instance", today shown by its
effect (one change per pick, one toggle per click) and element counts, a Stimulus instance count from tier 2 on. A `·` means
the transition cannot change the recipe's state, not that it is untested.

| Recipe | Back | Back, slow | Forward | N visits | Permanent | Frame reload | Frame, advance | Stream replace/update | Live re-render | Theme switch | System theme |
|---|---|---|---|---|---|---|---|---|---|---|---|
| theme-toggle | theme-toggle | · | G10 | T2 | · | · | · | · | · | theme-toggle | theme-toggle |
| layouts | demo-app | · | G10 | · | lab.turbo-nav, demo-app | · | · | lab.turbo-nav | · | csp (first paint) | css |
| sidebar, navbar | G6 | · | G6 | T2 | lab.turbo-nav | · | · | · | · | css | · |
| side-nav | lab.side-nav | · | lab.side-nav | lab.side-nav | lab.side-nav | · | · | · | · | lab.side-nav (on load) | css |
| toast | lab.turbo-restore, demo-app | · | G10 | · | lab.turbo-stream-toast, lab.turbo-restore | · | G2 | lab.turbo-stream-toast, lab.turbo-nav | · | css | · |
| alert | G10 | · | · | · | · | · | · | G10 | G10 | css | · |
| avatar | avatar | · | · | · | · | · | · | · | · | · | · |
| tabs | lab.section-nav | · | lab.section-nav | lab.section-nav | · | G5 | · | G5 (removing the selected tab: lab.section-nav) | G5 | css | · |
| section-nav | lab.section-nav | · | lab.section-nav | lab.section-nav | lab.section-nav | · | · | · | · | css | · |
| dropdown | lab.turbo-restore | lab.turbo-restore | G10 | G3 | G3 | lab.turbo-frame-detail | G2 | G3 | lab.live-dropdown, lab.live-table | T3 | · |
| modal | lab.turbo-restore | lab.turbo-restore | G10 | G3 | G3 | G3 | · | G3 | lab.live-modal | T3 | · |
| drawer | lab.turbo-restore | lab.turbo-restore | G10 | G3 | G3 | G3 | · | G3 | lab.live-drawer | T3 | · |
| popover | lab.popover | · | G10 | lab.popover | lab.popover | lab.popover | G2 | lab.popover | lab.popover | T3 | · |
| tooltip | lab.turbo-restore, lab.tooltip | lab.turbo-restore | lab.tooltip | lab.tooltip | lab.tooltip | lab.tooltip | lab.tooltip | lab.tooltip | lab.live-table | T3 | lab.tooltip |
| calendar | lab.calendar | · | G10 | lab.calendar | lab.calendar | lab.calendar | G4 | lab.calendar | lab.calendar | css | · |
| date-picker | lab.date-picker | · | G10 | lab.date-picker | lab.date-picker | lab.date-picker | G2 | lab.date-picker | lab.date-picker (G4) | css | · |
| chart | lab.chart | · | G10 | lab.chart | lab.chart | lab.chart | G4 | lab.chart | lab.chart | lab.chart | G10 |
| dropzone | lab.dropzone | · | G10 | lab.dropzone | lab.dropzone | lab.dropzone | G4 | lab.dropzone | lab.dropzone | css | · |
| editor | lab.editor | · | G10 | lab.editor | lab.editor | lab.editor | lab.editor | lab.editor | lab.editor | css | · |
| markdown-editor | lab.markdown-editor | · | G10 | lab.markdown-editor | lab.markdown-editor | lab.markdown-editor | lab.markdown-editor | lab.markdown-editor | markdown-editor | css | · |
| autocomplete | lab.autocomplete (G4) | · | G10 | lab.autocomplete | G4 | lab.autocomplete | G4 | lab.autocomplete | lab.autocomplete | T3 | · |
| data-table | lab.data-table-frame | · | lab.data-table-frame | lab.data-table-frame | · | lab.data-table-frame | lab.data-table-frame | · | · | css | · |
| data-table-live | lab.data-table-live (G4) | · | G10 | lab.data-table-live | lab.data-table-live | lab.data-table-live | G4 | lab.data-table-live | lab.data-table-live | css | · |

"Back, slow" is `·` for the recipes whose cached copy does not depend on the disconnect order: they save their state
on `turbo:before-cache` (popover, date-picker, editor, markdown-editor), on every change (side-nav, calendar's
inputs), or read it back on connect.

## Per recipe

Each table lists the recipe's own states and interactions, then the transitions above that need more than a cell.
Titles are quoted from the specs.

### theme-toggle (and the layouts' inline theme script)

States: system light or dark × no, light or dark choice saved; storage available or blocked; per state the `dark`
class at first paint and after, `aria-pressed`, the icon shown, the saved choice.

| Transition | Scope | Covered by |
|---|---|---|
| First paint, every system × choice | E2E demo | theme-toggle "shows the expected theme from the first paint" (6) |
| Toggle, then Turbo visit, Back, reload | E2E demo | theme-toggle "the toggle switches the theme, saves it, and the choice holds across a Turbo visit, Back and a reload" (6) |
| System changes while open | E2E demo | theme-toggle "the system switching to … is followed / ignored" (6) |
| No color transition on a switch, running ones left alone | E2E demo | theme-toggle "a switch › by the toggle / by the system runs no color transition", "leaves a transition already running to finish on its own" |
| Storage blocked, Turbo visit | E2E demo | smoke "storage blocked › keeps the choice across Turbo visits without localStorage" |
| Storage blocked, Back and reload | | G10 |
| Theme before paint without a toggle (auth layout), under the CSP nonce | E2E demo | csp "the layout sets the theme before the first paint" |
| Theme kept by a permanent panel's page | E2E lab | lab.turbo-nav "a data-turbo-permanent panel is kept across Turbo visits (not its scroll) and the theme persists" |
| Two toggles on one page stay in sync (`aria-pressed` follows the class) | | G10 |
| One `matchMedia` and one observer per toggle after N visits | | T2 |

### layouts

States: theme at first paint; the permanent sidebar and toast region shared by every layout; the document's scroll;
flash messages.

| Transition | Scope | Covered by |
|---|---|---|
| Flash shown on every layout, once | E2E demo | demo-app "flash messages show on every layout: the logout notice on the auth layout, not later on the dashboard" |
| Toast region kept across layouts, Back | E2E demo | demo-app "every layout keeps the same toast region: a toast closed on another layout does not come back on Back" |
| Document scroll restored on Back | E2E demo | demo-app "the app layout scrolls the document, so the keyboard scrolls it and Turbo restores it on Back" |
| Same document across links | E2E demo | smoke "links navigate with Turbo Drive (no full page load)" |
| Changed assets force a full load (`data-turbo-track="reload"`) | | G9 |
| Layout pages at desktop and phone width | screenshot | examples/pages |

### sidebar and navbar

States: expanded or collapsed (saved in `localStorage`); open over the page on small screens or not; the
navigation's scroll; the current item.

| Transition | Scope | Covered by |
|---|---|---|
| Collapse, Turbo visit, reload | E2E lab | lab.turbo-nav "the permanent sidebar keeps its scroll, collapsed state and current item across Turbo visits" |
| Scroll and current item across visits | E2E lab | same test |
| Navbar button opens it over the page, Escape and a visit close it | E2E lab | lab.turbo-nav "on a small screen the navbar button opens the sidebar over the page" |
| Same, in the app layout at phone width | E2E demo | demo-app "on a phone the app layout hides the sidebar behind the navbar menu button" (redundant, R4) |
| Collapsed side-nav moves the Tab stop | E2E demo | lab.side-nav "collapsing the demo's sidebar moves the Tab stop off a hidden current item to its shown branch" |
| Current item after Back and Forward | | G6 |
| Storage blocked (collapse lasts the page) | | G6 |
| Open over the page, then Back, or a resize to desktop | | G6 |

### side-nav

States: open branches (saved in `sessionStorage`), the current item, the roving Tab stop, focus.

| Transition | Scope | Covered by |
|---|---|---|
| Tree structure, the current branch rendered open | E2E lab | lab.side-nav "the tree has the ARIA tree structure, and the branch of the current page renders open" |
| Keyboard: arrows, Home, End, type-ahead, Enter | E2E lab | lab.side-nav "the keyboard moves through the shown treeitems, opens and closes branches and follows links" |
| Visits, Back, Forward, reload, state saved after the snapshot | E2E lab | lab.side-nav "the open branches hold across Turbo visits, Back, Forward and a reload, over the cached copy of the page" |
| Fragment links never current | E2E lab | lab.side-nav "a link to a fragment of the page is never the current page" |
| N visits | E2E lab | lab.side-nav "repeated Turbo visits leave one controller on the tree" |
| In a permanent sidebar | E2E demo | lab.side-nav "in the demo's data-turbo-permanent sidebar, the tree follows the current page across visits" |
| Both themes under both systems | E2E lab | lab.side-nav "the tree passes axe, its current item and focus ring in the theme's colors" (4) |
| `sessionStorage` blocked | | G10 |

### toast

States: counting down, paused (hovered, focused), closing, removed; in the permanent region or temporary.

| Transition | Scope | Covered by |
|---|---|---|
| Inserted by a Stream, dismisses itself, focus untouched | E2E lab | lab.turbo-stream-toast "a toast pushed by a Turbo Stream appears, dismisses itself and leaves focus alone" |
| Pause on hover, close button, timeout 0 | E2E lab | lab.turbo-stream-toast "a toast pauses while hovered and closes from its button", "a toast stays paused while it is still hovered or focused" |
| Permanent region across a visit keeps counting | E2E lab | lab.turbo-stream-toast "a toast in the permanent region still dismisses itself after a Turbo visit" |
| Temporary toast not shown again on Back | E2E lab | lab.turbo-restore "a toast outside the permanent region is not shown again on Back" |
| Moved into the region | E2E lab | lab.turbo-restore "a toast moved into the permanent region stays across visits" |
| Flash written as a Stream shows once | E2E lab | lab.turbo-nav "a flash toast written as a Turbo Stream shows once across Turbo visits" |
| Temporary toast on a page whose frame advances (Turbo copies the page while it is shown) | | G2 |

### alert, avatar

| Recipe | State or transition | Scope | Covered by |
|---|---|---|---|
| alert | Close by click, by keyboard, each independently | E2E demo, screenshot | recipe:alert "dismisses each alert independently", "dismisses an alert with the keyboard"; shot:alert "hides an alert when its close button is clicked" |
| alert | Dismissed, then Back; inserted by a Stream; Live re-render | | G10 |
| avatar | Image loaded, loaded before connect, failed, a new image failing | E2E demo | avatar (4 tests) |
| avatar | Turbo visit and Back | E2E lab | avatar "shows the picture of a page reached by a Turbo visit or restored from its cache" |

Avatar's Stream, frame and Live cells are `·`: they only connect a new element, the path "shows an image that loaded
before the controller connected" covers.

### tabs

States: the selected tab and its panel (`data-tabs-active-tab-value`), a disabled tab, a list without panels.

| Transition | Scope | Covered by |
|---|---|---|
| Default tab on load; click; Enter and Space; disabled out of reach; list without panels | E2E demo | recipe:tabs (5 tests) |
| Click, horizontal, pills, vertical | screenshot | shot:tabs (3 × 2 themes) |
| Arrow keys of the list's orientation, Home, End, roving Tab stop, disabled skipped, `aria-orientation` | E2E lab, preview | lab.section-nav "the vertical tabs follow the keyboard of the tabs pattern…", "horizontal tabs take Left and Right instead…" |
| Selected tab after Back (kept: the value attribute is in the cached copy), default after a visit or reload | E2E lab | lab.section-nav "Turbo visits, Back, Forward and a reload show the section and the tab of the page shown" |
| N visits: one controller per tab list | E2E lab | lab.section-nav "repeated Turbo visits leave one controller per navigation and tab list" |
| The selected tab removed: another tab is the Tab stop; the controller disconnected: the rendered tabindex is back | E2E preview | lab.section-nav "horizontal tabs take Left and Right instead…" |
| Live re-render with a tab selected by the browser | | G5 |
| Frame reload, Stream replace | | G5 |

### section-nav

States: the current section (`aria-current="page"`, from the server or the URL), the strip's scroll on small screens.

| Transition | Scope | Covered by |
|---|---|---|
| A landmark of links, the current one marked, no tab roles, in each viewport | E2E lab | lab.section-nav "the section nav is a landmark of links…" (2) |
| Visit, Back over the cached copy, Forward, reload; in a permanent element, marked from the URL | E2E lab | lab.section-nav "Turbo visits, Back, Forward and a reload…" (2) |
| A fragment link never current | E2E lab | lab.section-nav "a link to a fragment of the page is never the current section" (2) |
| N visits | E2E lab | lab.section-nav "repeated Turbo visits leave one controller per navigation and tab list" (2) |
| Disconnected: the rendered current state is back | E2E lab | lab.section-nav "a controller disconnected from a navigation that stays…" |
| Plain links in the Tab order, Enter visits | E2E lab | lab.section-nav "the section nav is plain links in the Tab order…" |
| A strip that scrolls to the current section on phones, a column on desktops | E2E lab | lab.section-nav (2) |
| The demo's settings pages | E2E demo | lab.section-nav "the demo's settings pages mark their section on the server and visit each other" |
| axe, both themes × systems × viewports | E2E lab | lab.section-nav (8) |

### dropdown, modal, drawer (overlays)

States: dropdown closed or open (click, hover), focused item, open submenu, placement flipped or shifted; modal and
drawer closed, open as a modal, open on load, static backdrop, drawer non-modal; `aria-expanded` on the triggers.

| Recipe | State or transition | Scope | Covered by |
|---|---|---|---|
| dropdown | Click on trigger closes; ArrowDown opens, Escape closes | E2E demo | recipe:dropdown "closes on a click on its trigger", "opens with ArrowDown and closes with Escape" |
| dropdown | Hover opens | screenshot | shot:dropdown "opens on hover" |
| dropdown | Click outside closes | E2E lab | lab.live-dropdown (last steps) |
| dropdown | Home, End, Tab; submenus (ArrowRight, ArrowLeft); flip and shift | | G7 (submenus: pending navbar branch) |
| dropdown | Live re-render while open; rows re-sorted | E2E lab | lab.live-dropdown "a dropdown stays open and working while its Live Component re-renders"; lab.live-table "dropdowns in rows re-sorted by a Live action keep working" |
| dropdown | Frame reloaded | E2E lab | lab.turbo-frame-detail "a dropdown inside a Turbo Frame works after every frame reload" |
| dropdown, modal, drawer | Left open by a visit, Back, fast and slow | E2E lab | lab.turbo-restore "… left open by a visit is closed after Back, and opens again[, the next page waiting for a stylesheet]" (6) |
| modal | Closed until opened; Escape; close buttons; backdrop; static backdrop; several openings; open on load | E2E demo | recipe:modal (8 tests) |
| modal | Moved in the DOM, open and closed | screenshot | shot:modal "stays modal after being moved in the DOM", "stays closed after being moved in the DOM once closed" |
| modal | Live re-render, open and closed | E2E lab | lab.live-modal "an open modal stays modal across a Live re-render, a closed one stays closed" |
| drawer | Modal: trap, Live re-render, Escape; non-modal | E2E lab | lab.live-drawer (2 tests) |
| drawer | Backdrop click, open on load, moved in the DOM | | G8 (modal has them) |
| all three | Stream replace or update while open, N visits (no document listener left), permanent, frame reload (modal, drawer) | | G3 |
| all three | Open while the theme switches | | T3 (wide matrices) |

### popover

States: closed or open (`open` value, an attribute Live keeps), focus inside, group, placement flipped.

| Transition | Scope | Covered by |
|---|---|---|
| Toggle, focus first field, Escape, click outside, group, flip, form, hidden controls, canceled `popover:focus` | E2E demo | popover (6 tests) |
| Focus leaving closes | E2E lab | lab.popover "the focus leaving the popover closes it" |
| Open, visit, Back | E2E lab | lab.popover "an open popover is closed after a Turbo visit and Back, and still works" |
| N visits, no document listener left | E2E lab | lab.popover "repeated Turbo visits leave one controller per popover and no document listener behind" |
| Permanent, frame ×3, Stream replace and update, Live re-render | E2E lab | lab.popover (4 tests) |
| Open beside a frame visit promoted to history: `closeSilently` runs on `turbo:before-cache` with the page still shown, and the copy may be taken first | | G2 |

The editor's link dialog is a Popover: its cells are the popover's.

### tooltip

States: hidden or shown (hovered, focused), placement flipped, the trigger's `aria-describedby`.

| Transition | Scope | Covered by |
|---|---|---|
| Hover, focus, Escape, described, after Live re-sorts | E2E lab | lab.live-table "tooltips in rows re-sorted by a Live action keep working and stay described" |
| Flip below | E2E lab | lab.live-table "a tooltip that does not fit above its trigger opens below it" |
| Stays open while hovered or focused | E2E lab | lab.live-table "a tooltip stays open while its trigger is still hovered or focused" |
| Shown when its trigger visits, then Back, fast and slow: hidden, and shows again (both orders failed before the fix) | E2E lab | lab.turbo-restore (overlay table) |
| Shown by focus, then Back, Forward, reload: hidden; hover, leave, focus, Escape, described still work | E2E lab | lab.tooltip |
| N visits: one tooltip per trigger, no document or window listener left | E2E lab | lab.tooltip |
| Permanent: shown by focus stays shown through a visit; frame reload ×3; frame advance then Back; Stream replace and update | E2E lab | lab.tooltip |
| System theme change while shown | E2E lab | lab.tooltip |

### calendar, date-picker

States: displayed month, selection (single, multiple, range, partial range), focused day, bounds, disabled dates,
modifiers, locale; the picker closed or open, typed text valid or invalid.

| Recipe | Transition | Scope | Covered by |
|---|---|---|---|
| calendar | Keys, month and year dropdowns and their bounds, modifiers gone in a re-render, impossible dates, form submit, one input and one change per pick, ranges over disabled days, multiple mode inputs | E2E demo | calendar (9 tests) |
| calendar | Back keeps month and selection; N visits; permanent; frame ×3; Stream; Live props, bounds, locale, clear | E2E lab | lab.calendar (6 tests) |
| date-picker | Trigger, pick, typed dates, invalid text, ArrowDown, range | E2E demo | date-picker (3 tests) |
| date-picker | Form submit; Back (picked, closed); N visits; permanent and frame ×3; Stream; Live form | E2E lab | lab.date-picker (6 tests) |
| date-picker | Server refusal comes back as typed | E2E demo | forms "the date picker opt-in submits the pick; a date the server refuses comes back as typed, with its error" |
| date-picker | Live re-render while the calendar is open | | G4 |
| both | Beside a frame visit promoted to history | | G2 (date-picker), G4 (calendar) |

### chart

States: series colors per theme, server colors kept, data, the data table, reduced motion.

| Transition | Scope | Covered by |
|---|---|---|
| Named image with its data table, roles per theme, `var(--color-…)`, reduced motion, doughnut, visible table | E2E demo | chart (5 tests) |
| Back, N visits, theme switch redraws once, permanent follows the theme, server color through switches, frame ×3, Stream, Live data | E2E lab | lab.chart (7 tests) |
| Value blocks, point data | E2E lab | lab.chart (2 tests) |
| System theme change with no choice saved | | G10 (same path as the class change, observed by the controller) |

### dropzone

States: empty, one or several files picked, dragging, invalid, disabled; focus after a pick or a Remove.

| Transition | Scope | Covered by |
|---|---|---|
| Keyboard, picks, previews, several files, drag, invalid, disabled | E2E demo, screenshot | dropzone (6 tests); shot:dropzone (3 × 2 themes) |
| Back (empty), N visits, permanent keeps the file, frame multipart post 303 and 422, Stream, controllers passed in, Turbo form beside a Live re-render, Live files action | E2E lab | lab.dropzone (8 tests) |
| Rendered through the form theme, server refusal, files sent back, a valid submit, size limit | E2E demo | forms (5 dropzone tests) |

### editor, markdown-editor

States: content, selection, toolbar states, counter, read-only; markdown's Write or Preview tab and its draft.

| Recipe | Transition | Scope | Covered by |
|---|---|---|---|
| editor | Mount, toolbar keys and states, commands, links, paste, counter, read-only, axe | E2E demo | editor (8 tests) |
| editor | Form post 422; Back (content and selection); N visits; permanent; frame ×3; Stream; Live (typing kept, focused re-render); frame advance | E2E lab | lab.editor (9 tests) |
| markdown-editor | Preview through Live, unsafe Markdown, toolbar, tab keys, counter, read-only, axe | E2E demo | markdown-editor (7 tests) |
| markdown-editor | Form post 422; Back; N visits; permanent; frame ×3; Stream; frame advance | E2E lab | lab.markdown-editor (7 tests) |

### autocomplete

States: chosen values (one, several, remote, created), the Tom Select instance, invalid.

| Transition | Scope | Covered by |
|---|---|---|
| Form submit, invalid submit enhanced once, created value | E2E lab | lab.autocomplete (3 tests) |
| Visits away and Back leave one Tom Select per field | E2E lab | lab.autocomplete "Turbo visits away and Back leave one working Tom Select per field" |
| Chosen values after Back (the test picks only after returning) | | G4 |
| Frame reload, Stream, Live re-render keeps values | E2E lab | lab.autocomplete (3 tests) |
| Permanent, frame advance | | G4 |

### data-table, data-table-live

States: search, filter, sort and direction, page, page size (in the URL); data-table-live adds the selection.

| Guarantee | Scope | Covered by |
|---|---|---|
| Each change adds a history entry; Back and Forward walk them | E2E lab | lab.data-table-frame "search, filter, sort, page and page size each add a history entry that Back and Forward walk through" |
| Visits away and back keep one table | E2E lab | lab.data-table-frame "Turbo visits away and back keep a single working table"; lab.data-table-live "repeated Turbo visits away and back keep one working table" |
| URL state survives a visit and Back, still live | E2E lab | lab.data-table-live "its state is in the URL: a Turbo visit away and Back show the same rows, and the table is still live" |
| Search, filter, size go to page 1; selection across pages | E2E lab | lab.data-table-live (2 tests) |
| Frame, permanent, Stream | E2E lab | lab.data-table-live (3 tests) |
| Selection after a visit and Back (not in the URL) | | G4 |
| Unaccepted URL values give a valid table | E2E lab; Live component | lab.data-table-frame, lab.data-table-live "a URL with values the table does not accept renders a valid table"; `OrdersTableTest::testAPageSizeTheTableDoesNotOfferFallsBackToTheFirst`, `testOnlyTheSortableColumnsSort` |
| A deep page keeps the offset below `maxRows()` | unit | `TableQueryTest` (4 tests), `FetchTest::testADeepPageInALargeTableCountsOnceAndLoadsOnce` |
| A page past the end shows the last page, loaded once | unit; functional; Live component; E2E lab | `FetchTest::testAPagePastTheEndLoadsTheLastPageOnce`; `DataTableRequestsTest::testAPagePastTheEndLoadsOnlyTheLastPage`; `OrdersTableTest::testAPagePastTheEndShowsTheLastPage`; lab.data-table-frame "a page number too large for an offset shows the last page" (R3) |
| No matching row: no load, empty state | unit; E2E lab | `FetchTest::testNoMatchingRowLoadsNoRows`; lab.data-table-frame "a search matching nothing shows the empty state" (R3) |
| One count, one load per request; a Live action's page not read again | functional | `DataTableRequestsTest` (4 tests) |
| Selection cut to `maxSelection`, ids cleaned, "Select this page" bounded | unit; Live component; E2E lab | `SelectionTest` (5 tests); `OrdersTableTest` (3 tests); lab.data-table-live "a selection the browser sends is cut to the table's limit before the server uses it" (R2) |
| Stable row ids, cell blocks | E2E lab | lab.data-table-frame "rows have stable ids and render the page cell blocks" |

## Pending: branches in flight

Rows to fill by the pull request that lands each branch, in its coverage map. Their tests are not listed here.

| Branch | Recipes touched | Rows it extends |
|---|---|---|
| `claude/mobile-nav` (the app's navigation in a drawer on small screens) | sidebar, navbar, drawer, layouts | sidebar's mobile rows, drawer, G6 |
| navbar dropdown submenus | navbar, dropdown | dropdown's submenu states and keys (G7) |
| `claude/vtabs` (vertical tabs, section-nav) | tabs, layouts | tabs' keyboard, Back and N visits covered; G5 narrowed to Live, frame reload and Stream |

## Redundancy

Two tests establishing the same guarantee at the same boundary. Nothing is removed in this pull request; each row says
where the guarantee stays.

| | Tests | Same guarantee? | Proposal |
|---|---|---|---|
| R1 | smoke "theme toggle › system in light mode › toggles dark mode and keeps it across Turbo visits and reloads, without a flash", "› system in dark mode › follows the system preference until a choice is saved" | Yes: theme-toggle's matrix runs both (system light, no choice: toggle, visit, Back, reload, first paint; system dark, no choice: first paint, system switching followed) | Move "storage blocked" (unique) into theme-toggle, remove the other two |
| R2 | `SelectionTest::testFiveThousandIdsSentKeepTheFirstThousand`, `OrdersTableTest::testASelectionTheBrowserSendsIsCutToMaxSelection`, lab.data-table-live "a selection the browser sends is cut…" | The Live component test goes through the endpoint, checksum and `hydrateWith`, as the E2E one does through the live controller. The unit test is the rule alone | Keep unit and Live; the E2E one is TESTING.md's example of a crafted request: drop it only with that section updated. `testSelectThisPageStopsAtMaxSelection` exists in both `SelectionTest` and `OrdersTableTest`: the Live one is the action, keep both |
| R3 | lab.data-table-frame "a page number too large for an offset shows the last page", "a search matching nothing shows the empty state", lab.data-table-frame and lab.data-table-live "a URL with values the table does not accept renders a valid table" | Server rendering only: the functional and Live tests already reach those requests | Move to `WebTestCase` crawler assertions (smallest scope), once checked that they assert nothing browser-side |
| R4 | demo-app "on a phone the app layout hides the sidebar behind the navbar menu button", lab.turbo-nav "on a small screen the navbar button opens the sidebar over the page" | The lab one covers it and more (focus, `aria-expanded`, a visit) | Leave until `claude/mobile-nav` lands, which changes both |
| R5 | lab.turbo-nav "a flash toast written as a Turbo Stream shows once across Turbo visits", demo-app "every layout keeps the same toast region…" | Partly: one region on a lab page, one across layouts | Keep both: different layouts are the boundary |
| R6 | shot:dropzone, shot:tabs, shot:modal `act()` assertions, and the same behavior in dropzone, recipe:tabs, recipe:modal | The screenshot is the distinct guarantee; the behavior asserted in `act()` runs twice (both themes) | Keep; behavior assertions belong in the behavior spec, `act()` only waits for the state |
| R7 | dropzone "an invalid zone is red and described by its error" ends with axe on `/preview/dropzone/invalid` | a11y scans that page in both themes | Drop that axe call; keep the ones after picks (states a11y cannot reach) and the editor's (mounted editor) |
| (checked) | csp "the layout sets the theme before the first paint" and theme-toggle first paint | No: the auth layout has no toggle, only the inline script under the nonce | Keep |

## Duplicated helpers (candidates for one shared owner)

| Helper | Where | Owner |
|---|---|---|
| Visit page two and Back, waiting on `turboVisitDone`; local `visit()` | inline in about 12 specs; `visit()` in lab.dropzone, lab.side-nav | `tests/e2e/transitions.ts`, one driver for the lab scaffold below |
| "Reload the frame" three times; Stream replace and update | 9 lab specs each | the same driver |
| The lab scaffold itself: `<recipe>-turbo` (page one and two, a Kept permanent copy, a Framed copy), `<recipe>-stream` with `_<recipe>_streamed`, `live-<recipe>` | `demo/templates/lab/` | reused as is by each step 6 group (dropdown, modal, drawer, tooltip, tabs) |
| Axe filtered to serious and critical | a11y, dropzone (`expectNoSeriousA11yIssue`), editor, markdown-editor, forms, lab.side-nav, demo-app ×2 | `fixtures.ts` |
| `__sameDocument` marker | 13 times in 9 specs | `fixtures.ts` (mark, then expect) |
| `__darkAtFirstBody` init script | smoke, csp, theme-toggle | `fixtures.ts` |
| Event counters (`countChanges`/`changes`, `countEvents`, `__events`) | lab.calendar, lab.date-picker, dropzone, calendar, lab.dropzone | `fixtures.ts`; tier 2 adds the Stimulus instance count next to it |
| Document listener counter | lab.popover (inline) | `fixtures.ts` `trackGlobalListeners` (added with G1); lab.popover and G3 to move onto it |
| `day(scope, date)` | calendar, date-picker, lab.calendar, lab.date-picker | a calendar helper module |
| `PNG`, `png()`, `text()` | dropzone, forms, lab.dropzone | `tests/e2e/files.ts` |
| `/preview/<recipe>/<id>?theme=light` builders | dropzone, editor, popover, markdown-editor; `gotoExample` | `inventory.ts` |
| `dialogState` / `:modal` checks | lab.turbo-restore, lab.live-modal, lab.live-drawer | `fixtures.ts` |
| `status`, `params` | lab.data-table-frame, lab.data-table-live | a data table helper module |

## Gaps, ranked by risk

The input of plan step 6. Risk weighs how likely the fault is (what the code does on that path), what a user loses,
and how common the recipe is. Scope is the smallest that shows the fault: every tier 1 gap here needs Turbo or Live in
a browser, so E2E lab, on the existing scaffold.

| | Gap | Why the risk | Proposed coverage | Step 6 group |
|---|---|---|---|---|
| G1 | ~~**tooltip** has no Turbo coverage~~ **Closed:** `connect()` now hides the tooltip unless the focus is inside it; lab.tooltip and lab.turbo-restore cover it | Both snapshot orders failed, not only the slow one | — | Overlays |
| G2 | **Frame visit promoted to history** beside popover, dropdown, date-picker and a temporary toast | Covered only for editor, markdown-editor and the data table. Their cache safety is `turbo:before-cache`, which a promoted frame visit dispatches with the page still on screen (the editor spec): an open popover beside a data table closes on each page change, or is copied open (`open` is an attribute, reconnected open); Turbo removes `data-turbo-temporary` toasts on the same event. Data tables are the common source of promoted frame visits | A `data-turbo-action="advance"` frame on the popover, date-picker and turbo-restore labs (the turbo-restore lab holds the dropdown and the toast) (the editor lab's `history-steps` pattern) | Overlays |
| G3 | **dropdown, modal, drawer** beyond Back and Live: Stream replace and update while open, N visits, permanent, frame reload (modal, drawer) | An open dropdown holds document and window listeners; popover has these exact tests (listener counter) and dropdown, the most used overlay, has none | lab.popover's tests, applied to each, with the shared listener counter | Overlays |
| G4 | **Form widgets' values** across transitions: autocomplete values after Back, permanent and frame advance; data-table-live selection after a visit and Back; calendar, chart and dropzone beside a promoted frame visit; date-picker re-rendered by Live while open | Values are what the user typed or chose; the Back tests check only instance counts (autocomplete) or URL state (data-table-live) | Extend the existing lab specs | Form widgets |
| G5 | **tabs**: Live re-render, frame reload, Stream replace (Back, N visits and the keyboard are covered by lab.section-nav: Back keeps the selected tab) | A Live re-render may keep or reset the value attribute the controller writes; nothing says which is wanted yet. Decide the expected state first | A `tabs-turbo` lab page with a Framed copy, a Stream and a Live component | Tabs |
| G6 | **sidebar**: current item after Back and Forward, storage blocked, open over the page then Back or a resize | A permanent element on a restoration visit, and `localStorage` failing, are untested paths | Extend lab.turbo-nav | Navigation (after `claude/mobile-nav`) |
| G7 | **dropdown keys and placement**: Home, End, Tab, submenus, flip and shift | The submenu code exists and is unexercised; placement is shared with popover, whose flip test is the model | E2E demo on the dropdown previews | Overlays, or the navbar submenus branch |
| G8 | **drawer** own interactions: backdrop click, open on load, moved in the DOM | Modal has them in its recipe spec; the drawer copies its logic without the tests | A drawer recipe spec mirroring modal's | Overlays |
| G9 | **layouts** `data-turbo-track="reload"`: changed assets after a deploy force a full load | Fails only after a deploy; one test, low cost | E2E lab: change the tracked asset's URL between two visits | Navigation |
| G10 | Low: alert dismissed then Back, Stream, Live; theme-toggle with storage blocked on Back and reload, two toggles in sync; Forward for the recipes covered on Back (each stateful row's Forward cell: Forward restores page two's cached copy and reconnects its controllers, with what was open there); chart and a system change; side-nav with `sessionStorage` blocked | Same code path as a covered transition, or a small state | Fold into the groups above when a spec is open anyway | Any |

Tier 2 (step 5) turns every "N visits" cell above into a Stimulus instance count, and tier 3 (step 7) takes the
overlays and editors × both themes (wide matrices), which this map marks T3.
