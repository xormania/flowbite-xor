# Changelog

All notable changes to flowbite-xor. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/) as git tags (`X.Y.Z`, no `v`).

## [Unreleased]

### Added

- `floating`: the positioning that `dropdown`, `popover` (so `date-picker`) and `tooltip` share, one JavaScript
  module (`assets/lib/flowbite-xor-floating.js`) that those recipes install with them: placement, flip, shift into
  the viewport, following the trigger on scroll and resize.
- `nav-menu`: the navbar's menu, a disclosure navigation: links and buttons opening submenus of links, nested at any
  depth; opening one closes the others, Escape closes the innermost and focuses its button, a click outside, the
  focus leaving and Turbo caching the page close them all; the current page and its submenus are marked, a submenu
  near the edge opens towards the other side, and the same menu opens in place in a `MobileNav`.
- `section-nav`: vertical tabs that navigate between the pages of one area (settings): links with
  `aria-current="page"` marked by the server or from the URL, a column on large screens and a strip that scrolls
  sideways, with the current section in view, on small ones.
- `mobile-nav`: the app's navigation on small screens, in a modal `Drawer` opened by a menu button in the `Navbar`
  (`menu` block); the focus goes to the current page, and the drawer closes on a link, Escape, the backdrop, before
  Turbo caches the page and when the screen grows to the sidebar's width.
- `side-nav`: a multi-level navigation tree (WAI-ARIA tree view): links in branches that open and close at any depth,
  arrow keys, Home, End and type-ahead, the branch of the current page open, and the open branches kept across Turbo
  visits, Back and Forward in `sessionStorage`.
- `markdown-editor`: a Markdown field, a native textarea with a toolbar writing Markdown and a Preview tab rendered on
  the server by a Live Component; `MarkdownType` refuses too long input, and the `flowbite_markdown_html` filter prints
  stored Markdown the same way (CommonMark without raw HTML or images, then sanitized).
- `editor`: a rich text editor (Tiptap) storing restricted HTML, with a keyboard-friendly toolbar, a link dialog and
  a counter; `EditorType` sanitizes every submit with symfony/html-sanitizer and refuses too long input, and the
  `flowbite_editor_html` filter prints stored HTML.
- `chart`: charts drawn with Symfony UX Chart.js in the theme's colors, light and dark, each with its data as a table;
  from arrays or a `ChartBuilderInterface` chart, updated in place by Live Components.
- `dropzone`: file uploads with Symfony UX Dropzone, styled with the theme: drag and drop or browse, a preview of
  the picked image, several files that add up across picks; focus follows a pick or a removal, and a file dropped
  outside the input is refused.
- `FOR-AGENTS.md`, a page for the coding agent given the repository's URL (setup, which recipe for what, the rules),
  and `llms.txt`, every page with one line, written from `README.md`'s recipe tables and checked in CI.
- `date-picker`: a `Calendar` in a `Popover`, opened from a button or a field where the date can be typed; a
  `DateType` with `'block_prefix' => 'flowbite_date_picker'` renders as one through the form theme.
- `calendar`: pick a date, several dates or a range, with hidden inputs for forms (dispatching `input` and `change`)
  and a `model` prop for Live Components; invalid dates are ignored, and a range never spans a disabled day.
- `popover`: free content anchored to a button, in a non-modal dialog; it closes on Escape, a click outside or when
  the focus leaves it, and before Turbo caches the page.
- `autocomplete`: searchable selects with Symfony UX Autocomplete (Tom Select), styled with the theme, through the
  form theme (`'autocomplete' => true`) or the `Autocomplete` component.
- `data-table-live`: `data-table` as a Live Component (`AbstractLiveDataTable`), with row selection for bulk actions;
  its state is in the URL. The selection holds at most `maxSelection()` ids (1,000) of at most 128 characters,
  enforced on what the browser sends before anything uses it.
- `data-table`: a server-driven table (search, filters, sortable columns, page size, pages) in a Turbo Frame, with
  the PHP classes a table extends (`AbstractDataTable`) copied into `src/FlowbiteXor/DataTable/`. A table counts its
  rows (`countRows()`), then loads one page once (`loadRows()`); no page starts past `maxRows()` rows (10,000), so a
  request never makes the database skip more.

### Fixed

- `data-table-live`, `markdown-editor`: their manifests declare `@symfony/ux-live-component`, which their
  controllers import, as an import map package, so the kit lint no longer warns; Symfony Flex adds it with
  `symfony/ux-live-component`, and the READMEs say to run the `importmap:require` that `ux:install` prints only when
  `importmap.php` has no entry for it.
- `dropdown`: ArrowRight on a submenu's item opened the submenu but left the focus on the item, and closed a submenu
  already open (by a click); it now opens the submenu, or keeps it open, and focuses its first item.
- `sidebar`: with `localStorage` blocked, a Turbo visit expanded a collapsed sidebar; the collapse now lasts until the
  next page load. Forward to a page left with the sidebar open over it showed the menu button expanded on a closed
  sidebar, and the sidebar stayed open over the page when the screen grew to a desktop, so shrinking it again showed
  it open and the menu button took two clicks; the menu button now follows the sidebar on reconnect, and the sidebar
  closes where it sits beside the page.
- `calendar` (and `date-picker`): in WebKit a click on a day that did not have the focus selected nothing: the render
  that follows the focus rewrote every day's number between the mousedown and the mouseup, which cancels the click
  there. A day's number is now written only when it changes.
- `side-nav`: a tree shown again (a `MobileNav` drawer opening, the screen growing to show the `Sidebar`) caused a
  *ResizeObserver loop completed with undelivered notifications* error, which WebKit reports as a page error: the
  tree restored its branches inside the observer's callback. It now handles a resize in the next frame.
- `modal`: in WebKit, an open modal whose container a Live re-render replaced closed: without `moveBefore`, the morph
  moves the `<dialog>` out of the top layer, open but no longer modal, which the new controller took for Turbo's copy
  of the page. It now shows that same dialog as a modal again; a copy still connects closed.
- `autocomplete`: Back from a frame visit promoted to history (`data-turbo-action="advance"`, a data table's pages)
  showed each field twice, the Tom Select copied with the page beside a new one hidden like the `<select>` (Turbo
  copies the page as such a visit starts, Tom Select still on screen); `autocomplete-sync` now removes the copied one,
  and the field shows one Tom Select with the choice its form keeps.
- `dropzone`: in a POST form, the file picked was gone after Back from a frame visit promoted to history, whose copy of
  the page Turbo takes before `turbo:before-cache`; the zone now carries its key into that copy too, and shows the file
  again, as after any Back.
- `popover`, `dropdown`: one open inside a `data-turbo-permanent` element closed when a visit moved it into the next
  page; it now stays open, as the user left it (the modal and the drawer already did).
- `dropzone`: in a POST form, a file picked was gone after Back and Forward (UX Dropzone clears the input of Turbo's
  copy as it connects); the zone now keeps it for the copy and shows it again. A zone outside such a form still starts
  empty.
- `autocomplete`: in a Live Component form, a value the server set in a re-render (a reset, another record) reached the
  `<select>` but Tom Select still showed the one before; the new `autocomplete-sync` controller, put next to UX
  Autocomplete's by the `Autocomplete` component and the form theme, makes Tom Select show it.
- `autocomplete`: after a reset of its form (a reset button, `form.reset()`), Tom Select showed the choice made before,
  the `<select>` holding the one rendered; it showed it right only after Back through the layouts' `form-reset`.
  `autocomplete-sync` now also syncs Tom Select once the reset is done, without `layouts`, for a field tied to its
  form by `form` too, with no `input` or `change` event (no Live request).
- `data-table-live`: the row selection, which leaving the page drops, came back with Back and Forward when Turbo
  showed its copy of the page; the new `data-table-live` controller clears it as such a copy connects.
- `modal`, `drawer`: a Live re-render that replaced the container of the component (a wrapper whose id changes)
  logged "Missing target element" errors: the morph moves the `<dialog>` to the new controller before the old one
  disconnects. The old controller now disconnects without it; the new one works as before (an open modal stays open,
  its new trigger expanded; a drawer starts as its `open` value says).
- `calendar`: a form reset cancelled by another listener (`preventDefault()` on `reset`) still brought back the dates
  rendered; the calendar now resets its hidden inputs in the same task, after the form's own listeners, and only when
  the reset was not cancelled (one cancelled later is put back). Its README lists the `reset` source of `calendar:select`.
- `editor`: a submit of more than `EditorHtmlPolicy::MAX_INPUT_BYTES` (1000000 bytes) was a 500: the form showing its
  error printed the refused value through `flowbite_editor_html`, which refuses it. It is now a 422 with the field's
  error, the editor and its textarea empty (the value is never cut); the same in a Live Component.
- `editor`: a line break (`<br>`) counts as one character on the server, as in the editor's counter (it counted none).
- `data-table`: `Filter::choice()` documents its choices as `array<int|string, string>`: PHP keys numeric values
  (`'2024'`) as integers, which PHPStan refused against the former `array<string, string>`. The query and the select
  already handled them.
- `data-table`: after Back or Forward, the search field showed the search applied next, or typed before leaving the
  page, instead of the URL's; the filters and the page size could too. The form now shows the URL's state in every
  field: a new `data-table` controller resets it to the values the server rendered when a restored copy connects.
  Back pressed while a change is still loading no longer shows new rows at the earlier URL, an earlier table at the new
  URL, or a table marked busy for good: the controller, on the table's frame, cancels the change instead.
- `popover`, `date-picker`: beside a frame whose visits are promoted to history (a data table's pages), an open popover
  or picker no longer closes and drops the focus when the frame changes, and Back no longer shows it open: on
  `turbo:before-cache`, `closeSilently` now skips a frame visit promoted to history, and a popover open in a copy of
  the page (rendered open or opened since) connects closed, while one moved in the DOM stays open.
- `toast`: a toast outside the region stays on screen while such a frame changes, and Back no longer shows it again; it
  is no longer marked `data-turbo-temporary`.
- `tooltip`: a tooltip shown when its link visited another page (or when a frame visit was promoted to history) came
  back shown after Back or Forward, its trigger no longer hovered; it now comes back hidden. A tooltip in a
  `data-turbo-permanent` element stays shown through a visit while its trigger keeps the focus.
- `dropdown`: a menu open when a link inside it visited another page showed open but no longer worked after Back; it
  now comes back closed.
- `modal`, `drawer`: a dialog open when the page was cached came back open but not modal after Back (the page behind
  it usable); it now comes back closed, and opens as a modal again.
- `modal`, `drawer`: a dialog open when the page was left (Back, Forward, a visit started by the page) left its
  trigger `aria-expanded="true"` in the copy Turbo shows on Back or Forward, and kept it there, on a closed dialog,
  when Turbo copied the page after the dialog had disconnected; the dialog now closes and its trigger collapses before
  Turbo caches the page, except for a frame visit promoted to history (a data table's pages), which keeps the page on
  screen: the dialog stays open, and the copy Back shows connects closed. A drawer reopened after a move in the DOM (a `data-turbo-permanent` element) no longer shows
  its trigger collapsed.
- `dropdown`: the copy of the page Turbo shows on Back or Forward held a menu left open, until its controller closed
  it; the menu now closes before Turbo caches the page, except for a frame visit promoted to history, which keeps the
  page on screen: the menu stays open, and the copy Back shows connects closed.
- `editor`: a frame visit promoted to history (`data-turbo-action="advance"`) destroyed an editor outside the frame;
  the editor now stays, and Back builds a new one from the cached copy.
- `markdown-editor`: after Back from a frame visit promoted to history, the textarea showed the server's Markdown
  instead of what was typed.
- `toast`: a toast outside the permanent `ToastRegion` came back on Back, for another full timeout; it is now removed
  before Turbo caches the page. Toasts in the region still stay across visits until they time out or are closed.
- `theme-toggle`: with the system in dark mode and the light theme chosen, the button showed no icon
  (`flowbite.min.css` gates its own `dark:hidden` on `prefers-color-scheme`); it now shows the moon. A switch no
  longer fades table rows into the new theme: the color transitions it starts are finished at once.

### Changed

- `dropdown`, `popover` and `tooltip` place their content with the `floating` recipe's module instead of a copy
  each, and depend on that recipe (`ux:install` adds `assets/lib/flowbite-xor-floating.js`). Where they place it
  does not change.
- Motion: transitions name the properties they animate and stop under `prefers-reduced-motion`. `tabs` triggers fade
  their colors only (was `transition-all`), the `toggle` knob animates `translate` and its border color (was
  `transition-all`), and the `modal` backdrop its color (was every property); these, the `sidebar` width and chevron,
  the `nav-menu` and `side-nav` chevrons, `table` row hovers and the `toast` fade change at once under reduced motion.
  There, a dismissed `alert` hides and a closed `toast` leaves the page at once, without waiting for the fade, and
  the `spinner` and the `skeleton` pulse run three times slower.
- `theme`: on-fill roles in `flowbite-xor.css`, the color of text on a solid fill (`fg-on-brand`, `fg-on-success`,
  `fg-on-danger`, `fg-on-warning`, `fg-on-dark`) and of the toggle's knob (`knob`). All are white, so nothing looks
  different, and a project with a light brand color can set `fg-on-brand` to a dark one. `button`, `indicator`,
  `calendar`, `tabs` (pill), `tooltip`, `avatar` (group count) and `toggle` use them instead of `text-white` and
  `bg-white`. **Upgrading:** reinstall `theme` with those recipes, or those components lose their white text.
- `editor`: `EditorHtmlPolicy::sanitize()` stores white space as the editor reads it: a run of spaces or lines is one
  space, and none at the start or end of a block or after a line break (lines between paragraphs, a list's
  indentation). The server counts the characters the editor's counter shows; rendering is unchanged. A no-break space
  stays.
- `layouts`: Back and Forward show a GET form with the values of the URL, and a POST form as the user left it; the
  `form-reset` controller on `<body>` resets each GET form of a restored page, and autocomplete fields, calendars and
  date pickers follow it. The `data-table` search form keeps its own reset, so a table works without `layouts`; a `calendar`
  follows a reset of its form (a reset button too): a date picked in a GET form before leaving no longer shows after
  Back.
- `llms.txt` links the files of the release it was written for (or `dev` before a release), not `main`, and
  `FOR-AGENTS.md` lists every recipe, written from `README.md`'s tables like `llms.txt`.
- `dropdown`, `modal`, `drawer`: the README examples size their wrapper with `min-h-*` classes instead of a `style`
  attribute, which a Content Security Policy blocks.
- `input`: the "With Button" example shows the `flowbite` set's search icon (`flowbite:search-outline`), not `tabler:search`.
- `navbar`: a `nav` block after the brand, for a `NavMenu`, in a `<nav>` named by `navLabel` and shown from `md` up.
- `layouts`: a `navbar_nav` block, the navbar's menu (`NavMenu:Link`s and `NavMenu:Submenu`s), shown in the navbar
  from `md` and in the mobile nav's drawer below; the recipe now depends on `nav-menu`.
- `tabs`: the keyboard of the WAI-ARIA tabs pattern: the selected tab is the list's one Tab stop, the arrow keys of
  the list's orientation (Up and Down in a vertical list, which now has `aria-orientation`) select the previous and
  next tab, Home and End the first and last, skipping disabled tabs; an `idPrefix` prop keeps two `Tabs` of a page
  from sharing ids.
- `layouts`: the `settings` layout renders its navigation with `section-nav`; fill `settings_nav` with
  `SectionNav:Item`s (plain `<li><a>` items still render, without the controller's marking).
- `layouts`: on small screens, the app layout's menu button opens the `sidebar` block's navigation in a `MobileNav`
  (a modal drawer) instead of the `Sidebar` over the page; the recipe now depends on `mobile-nav`.
- `navbar`: a `menu` block, at the start of the bar, for a `MobileNav`.
- `side-nav`: a tree hidden then shown again (a `MobileNav` opening, the screen growing to show the `Sidebar`)
  restores the open branches saved meanwhile, so two trees sharing a `storageKey` agree.
- `theme`: chart series roles `chart-1` to `chart-6` and `chart-other`, checked for contrast in both themes.
- The docs no longer track the official `flowbite-4` kit, an initial reference only: `UPSTREAM.md` is removed, and
  its notes on toolkit and platform behavior moved to `docs/NOTES.md`. `NOTICE` keeps the credit.
- `form-theme`: a single-text `DateType` opted in with `'block_prefix' => 'flowbite_date_picker'` renders as the
  `date-picker` recipe's picker.
- `form-theme`: an `EditorType` renders as the `editor` recipe's `Editor`, and a `MarkdownType` as the
  `markdown-editor` recipe's `MarkdownEditor`.
- `form-theme`: a `DropzoneType` renders as the `dropzone` recipe's `Dropzone`, never as UX Dropzone's own theme; a
  field whose valid files a 422 sent back says they were not kept.
- `form-theme`: an autocomplete field's hidden `<select>` keeps its label's name (`aria-labelledby`) after Tom Select
  moves the label to its own input.

## [0.1.0] - 2026-10-06

### Added

- `theme`: Flowbite's color roles for light and dark, with contrast fixes.
- `theme-toggle`: a button switching between light and dark; the choice is remembered per browser.
- 22 components from the official `flowbite-4` kit (`alert`, `avatar`, `badge`, `button`, `button-group`, `card`,
  `checkbox`, `dropdown`, `indicator`, `input`, `kbd`, `label`, `modal`, `pagination`, `radio`, `select`,
  `skeleton`, `spinner`, `table`, `tabs`, `textarea`, `toggle`), with Stimulus controllers instead of Flowbite's
  JavaScript.
- Components the official kit lacks: `breadcrumb`, `drawer`, `empty-state`, `navbar`, `page-header`, `progress`,
  `sidebar`, `stat-card`, `toast`, `tooltip`.
- `form-theme`, a Symfony form theme rendering through the kit's components, and `form-field`, the labelled control
  with help text and errors it renders each row with.
- `layouts`: base, app (sidebar, navbar, page header, toasts), auth, settings, error and blank.
- Blocks: `dashboard-home`, `login`, `signup`, `forgot-password`, `settings-profile`, `not-found`.

[Unreleased]: https://github.com/xormania/flowbite-xor/compare/0.1.0...HEAD
[0.1.0]: https://github.com/xormania/flowbite-xor/releases/tag/0.1.0
