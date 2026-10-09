# Changelog

All notable changes to flowbite-xor. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/) as git tags (`X.Y.Z`, no `v`).

## [Unreleased]

### Added

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

- `dropdown`: a menu open when a link inside it visited another page showed open but no longer worked after Back; it
  now comes back closed.
- `modal`, `drawer`: a dialog open when the page was cached came back open but not modal after Back (the page behind
  it usable); it now comes back closed, and opens as a modal again.
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
