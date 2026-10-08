# Changelog

All notable changes to flowbite-xor. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/) as git tags (`X.Y.Z`, no `v`).

## [Unreleased]

### Added

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
  its state is in the URL.
- `data-table`: a server-driven table (search, filters, sortable columns, page size, pages) in a Turbo Frame, with
  the PHP classes a table extends (`AbstractDataTable`) copied into `src/FlowbiteXor/DataTable/`.

### Changed

- `theme`: chart series roles `chart-1` to `chart-6` and `chart-other`, checked for contrast in both themes.
- The docs no longer track the official `flowbite-4` kit, an initial reference only: `UPSTREAM.md` is removed, and
  its notes on toolkit and platform behavior moved to `docs/NOTES.md`. `NOTICE` keeps the credit.
- `form-theme`: a single-text `DateType` opted in with `'block_prefix' => 'flowbite_date_picker'` renders as the
  `date-picker` recipe's picker.
- `form-theme`: an `EditorType` renders as the `editor` recipe's `Editor`.
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
