# flowbite-xor — Build Plan

**Written:** Sun Oct 4, 2026 · 8:45 PM (EDT)
**Repo:** https://github.com/xormania/flowbite-xor (default branch `main`, MIT, currently only `LICENSE`)
**Executor:** a Claude Code session with push access to the repo
**Ground truth checked against:** `symfony/ux` main @ `f152d0b` (2026-10-04), toolkit tags `v3.5.0` / `v3.5.1`, `flowbite` 4.0.2, `tailwindcss` 4.3.3, `symfonycasts/tailwind-bundle` v1.0.0

---

## 0. What we are building

A **Symfony UX Toolkit kit** named `flowbite-xor`: a repo of copy-in recipes (Twig components, Stimulus controllers, layouts, blocks, a form theme, a theme file) built on the free Flowbite v4 library and Tailwind v4, for reuse across xor's Symfony projects. Projects consume it with:

```bash
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor            # main
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor:v0.1.0     # tag
```

It is **not** a fork of `themesberg/flowbite` and **not** a Symfony bundle. Flowbite stays an npm dependency; Symfony's own `flowbite-4` kit stays untouched in `vendor/`. Our kit is a parallel kit that carries its own copies of the base components (required — see §2.1) plus everything the official kit lacks.

Primary target app: the chess analysis web app (Symfony + Tailwind/Flowbite + Live Components + Turbo). Every recipe must behave correctly under Live Component morphing and Turbo navigation; that is the main quality bar.

---

## 1. Decisions already made (do not relitigate)

| # | Decision | Reason |
|---|----------|--------|
| D1 | Toolkit kit, not bundle | Files land in each project repo where agents can read/edit them; no bundle code to maintain; upstream-able to `symfony/ux`. |
| D2 | Base recipes are **copies of the official `flowbite-4` kit** | Cross-kit recipe dependencies are impossible (§2.1). Keep copies byte-identical where we need no change; record every deviation in `UPSTREAM.md`. |
| D3 | **All behavior in Stimulus controllers; no `import 'flowbite'` global init** | Flowbite's `initFlowbite()` never sees DOM produced by Live Component morphs. Stimulus `connect/disconnect` does. |
| D4 | Theme = Flowbite's own color-role names with our values (light + dark), with contrast failures fixed at token level where possible | Any Flowbite snippet pasted into a project then picks up the look. |
| D5 | Layouts ship as a `layouts` recipe (base `{% extends %}` templates) **plus** `block` recipes (login, signup, dashboard…) | Both exist in the toolkit model; blocks need toolkit ≥ 3.5. |
| D6 | Login/signup blocks render a **Symfony `FormView` through our form theme**, not static `<form>` markup (unlike shadcn's `login-01`) | CSRF, errors, last-username handled once. |
| D7 | Domain-specific UI (chess board, eval bar, move list) is **out of scope** for this repo | Keeps the kit generic; goes in a separate kit later. |
| D8 | Default branch `main`; versions by git tags `vX.Y.Z` | The GitHub registry downloads `archive/main.zip` unless a `:version` suffix is given. |
| D9 | AssetMapper is the primary target; Encore supported only via declared `npm` dependencies | Matches the official kit's assumptions. |

---

## 2. Verified facts about the toolkit (constraints the design follows)

All verified by reading `symfony/ux` `src/Toolkit/` at the commit above. Re-verify if the toolkit version changes.

### 2.1 Recipe dependencies never cross kits
`src/Installer/PoolResolver.php`: `$kit->getRecipe($dependency->name)` — resolution is inside the current kit only; an unknown name throws `LogicException`. **Therefore our kit must contain every recipe it depends on.**

### 2.2 How an external kit is fetched
`src/Registry/GitHubRegistry.php`:
- Regex: `^(?:https://)?(github\.com)/(?<author>[\w-]+)/(?<repo>[\w-]+)(?::(?<version>[\w._-]+))?$`
- Downloads `https://github.com/{author}/{repo}/archive/{version}.zip`, **unauthenticated** → repo must be public.
- Default `version` = `main`. Version may be a branch, tag, or commit SHA. **Slashes are not allowed**, so branch names like `feat/x` cannot be installed by name (use the SHA).
- `manifest.json` must be at the **repo root** (`KitFactory::createKitFromAbsolutePath`). Recipes are discovered as `*/manifest.json` at depth exactly 1 (`KitSynchronizer`). Any top-level folder without `manifest.json` (e.g. `demo/`, `tools/`) is ignored.
- Because the zip is the whole repo, add `.gitattributes` `export-ignore` entries for `demo/`, `tools/`, `tests/`, `.github/` so installs download only the kit.

### 2.3 Install semantics
`src/Installer/Installer.php`: existing files → diff shown, prompt to overwrite (identical files skipped silently since 3.6/main; on 3.5 it still asks). Re-running `ux:install` is the update path. No "uninstall".

### 2.4 Kit manifest (`schema-kit-v1.json`)
Required: `name`, `description`, `license`, `homepage`. Optional: `color`, `icon`, `dependencies` (kit-global `npm` / `importmap` / `composer` lists, shared by every recipe — available since 3.2).

### 2.5 Recipe manifest (`schema-kit-recipe-v1.json`)
`name` (required), `type` = `component` | `block`, `version-added`, `copy-files` = `{ "<src dir>/": "<dest dir>/" }` (arbitrary destinations; `..` rejected since the CVE-2026-55878 fix), `dependencies.recipe[]`, `.composer[]`, `.npm[]`, `.importmap[]`.

### 2.6 Recipe folder conventions (what the linter checks)
```
<recipe>/
  manifest.json
  README.md                 # first H1 = name; one-line summary; ```twig {"preview":true} fenced examples; "## Installation\n\n::: installation"
  templates/components/<Name>.html.twig[, <Name>/<Part>.html.twig]
  assets/controllers/<name>_controller.js      # optional
  tests/screenshots/<example>-{light,dark}.png # convention in official kits
```
Templates use `{% props %}` with `## 'a'|'b' description` doc comments per prop, `{##- … -#}` doc comments on `{% block %}`s, `html_cva` for variants, `attributes.defaults({...|tailwind_classes})` on the root. Linter: `vendor/bin/ux-toolkit-kit-lint <path>` (checkers: docs, heading levels, copy-files existence, Stimulus controller presence & docs, JS imports, Composer symbols, recipe references). `vendor/bin/ux-toolkit-kit-debug <path>` lists what the toolkit sees.

### 2.7 Official `flowbite-4` kit, current state (22 recipes)
alert, avatar, badge, button, button-group, card, checkbox, dropdown, indicator, input, kbd, label, modal, pagination, radio, select, skeleton, spinner, table, tabs, textarea, toggle. Plus `kit.css` (Flowbite's theme block verbatim + `@custom-variant dark (&:is(.dark *))`), `kit.js` (`import 'flowbite'`), `INSTALL.md`.
Controllers: `modal` and `tabs` are pure Stimulus (modal = native `<dialog>`, handles being moved in the DOM); `alert` imports `Dismiss` and `dropdown` imports `Dropdown` from `flowbite`. Kit-global deps: npm `flowbite`; importmap `flowbite`, `flowbite/dist/flowbite.min.css`. Recipe composer deps: `symfony/ux-twig-component:^3.5`, `twig/html-extra:^3.24.0`, `tales-from-a-dev/twig-tailwind-extra:^1.3.0`, `symfony/ux-icons` (some).

### 2.8 Missing from every kit today
No layouts, no sidebar/navbar/drawer/toast/tooltip/breadcrumb in the Flowbite kit (shadcn has sidebar, drawer, sonner, tooltip). **No kit has a Symfony form theme** (shadcn `form` is wrapper components only). These are our additions.

### 2.9 Versions / platform
Toolkit 3.x: PHP ≥ 8.4, Symfony ^7.4|^8.0, `symfony/ux-twig-component ^3.5`. Blocks need toolkit ≥ 3.5 (`v3.5.1` is the latest tag). `symfonycasts/tailwind-bundle` v1.0.0 supports Tailwind v4 via `binary_version` (no PostCSS/config file in v4). Iconify has a `flowbite` set (751 icons) → `ux_icon('flowbite:…')`.

### 2.10 Toolkit preview wiring
`ux_toolkit.preview.kits: [<dir>]` (bundle config) wires a kit directory's `kit.css`/`kit.js`/controllers into AssetMapper, Tailwind and the importmap, and `RecipeDocRenderer` renders README previews — but these services are `@internal`/private and there is **no local-path registry** for `ux:install`. Decision: the demo app does **not** depend on these internals; it copies recipes in with a script (§3, `tools/sync-demo`). Revisit if the toolkit makes previews public.

---

## 3. Repository layout

```
flowbite-xor/
├── manifest.json            # kit manifest (root — required)
├── INSTALL.md               # shown by ux:install; project setup steps
├── README.md                # what the kit is, recipe index, usage, versioning
├── AGENTS.md                # rules for agents working ON this repo
├── UPSTREAM.md              # every deviation from symfony/ux flowbite-4, with reason + PR status
├── LICENSE                  # MIT (xor) — add Flowbite/Themesberg + Symfony MIT notices (see §4, Phase 1)
├── kit.css                  # theme: Flowbite roles, our values, light+dark, contrast fixes
├── kit.js                   # intentionally minimal (no `import 'flowbite'`) — see Phase 3
├── icon.svg
├── .gitattributes           # export-ignore demo/ tools/ tests/ .github/
├── <recipe>/…               # one folder per recipe (components, layouts, blocks, theme, form-theme)
├── demo/                    # Symfony app: showcase + Turbo/Live test pages (not a recipe)
├── tools/
│   ├── sync-demo            # copies every recipe's copy-files into demo/ (mirrors ux:install)
│   └── contrast/            # token contrast checker (CI gate)
├── tests/
│   └── e2e/                 # Playwright specs against demo/
└── .github/workflows/ci.yml
```

Naming: recipe folders lower-kebab (`stat-card`), component names PascalCase (`StatCard`, parts `StatCard:Trend`), controllers snake file / kebab identifier (`theme_toggle_controller.js` → `theme-toggle`). Keep official recipe/controller names unchanged (`flowbite-modal`, `dropdown`, `tabs`, `alert`).

---

## 4. Phases

Each phase = one PR, merged only when its acceptance criteria pass in CI. Commit messages conventional (`feat(sidebar): …`, `chore(demo): …`). Never commit `demo/var`, `demo/vendor`, `demo/public/assets`, `node_modules`, Playwright output.

### Phase 0 — Bootstrap
**Tasks**
1. Root files: `manifest.json` (`name` "Flowbite xor", `description`, `license` "MIT", `homepage` = repo URL, `color` `hsl(221,79%,48%)`, `icon`, `dependencies` copied from official kit for now), `INSTALL.md` (adapted from official), `README.md`, `AGENTS.md`, `UPSTREAM.md` (empty table), `.gitattributes`, `.editorconfig`, `.gitignore`.
2. `demo/`: `composer create-project symfony/skeleton` (PHP 8.4; Symfony 7.4 LTS unless xor's projects are on 8.x — ask once, default 7.4). Require: `symfony/asset-mapper`, `symfony/stimulus-bundle`, `symfony/ux-turbo`, `symfony/ux-live-component`, `symfony/ux-twig-component`, `symfony/ux-icons`, `symfonycasts/tailwind-bundle`, `twig/extra-bundle`, `twig/html-extra`, `tales-from-a-dev/twig-tailwind-extra`, `symfony/form`, `symfony/security-bundle` (for login block later), dev: `symfony/ux-toolkit:^3.5`, `symfony/panther` not needed (Playwright instead). `importmap:require flowbite` only if Phase 3 proves it necessary — start **with** it to match upstream.
3. `tools/sync-demo` (PHP or bash): for each `*/manifest.json`, apply `copy-files` into `demo/` exactly as the installer would (same destination mapping). Idempotent; deletes nothing.
4. CI (`.github/workflows/ci.yml`), jobs: `lint-kit` (`composer require --dev symfony/ux-toolkit` in a scratch dir, run `vendor/bin/ux-toolkit-kit-lint .`), `demo` (sync, `composer install`, `tailwind:build`, `asset-map:compile`, `php -S` + Playwright), `contrast` (Phase 2), `remote-install` (Phase 8).
5. Demo pages scaffold: `/` index listing recipes; `/r/{recipe}` per-recipe showcase; `/lab/*` Turbo/Live scenario pages (Phase 3).

**Acceptance:** `ux-toolkit-kit-lint .` passes with zero recipes (or one placeholder); demo boots; CI green; `ux-toolkit-kit-debug .` lists the kit.

### Phase 1 — Base recipes (copies of official `flowbite-4`)
**Tasks**
1. Copy all 22 recipe folders from `symfony/ux` `src/Toolkit/kits/flowbite-4/` at a pinned commit; record the commit in `UPSTREAM.md`. Keep files byte-identical (templates, controllers, READMEs, screenshots). Adjust only `$schema` paths if needed for lint.
2. Copy `kit.css`, `INSTALL.md` as the baseline (our changes come in Phase 2/3).
3. Licensing: add to `LICENSE` (or `NOTICE`) the MIT notices for Symfony UX (Fabien Potencier) and Flowbite (Bergside Inc.).
4. `tools/sync-demo` → demo renders each recipe's README examples on `/r/{recipe}` (parse the ```twig {"preview":true} fences and render them; a small Twig loader over README content is enough).
5. Playwright: screenshot every README example in light and dark; store under `<recipe>/tests/screenshots/`. These become the visual-regression baseline (compare with a tolerance; commit updates deliberately).

**Acceptance:** lint passes; all 22 recipes render in the demo in both themes with no console errors; screenshots committed; `UPSTREAM.md` lists the pinned upstream commit and "no deviations".

### Phase 2 — Theme recipe + contrast gate
**Context (measured earlier, Flowbite defaults, WCAG 2 ratios):** `brand-medium` focus ring ≈ 1.4:1 on white (needs 3:1); dark `fg-brand-strong` on `brand-soft` ≈ 3.9:1 (needs 4.5); dark `fg-brand` on `brand-soft` ≈ 2.8:1; everything else measured passes (body 7.6/6.8, body-subtle 4.8/6.8, badges 8–10).
**Tasks**
1. `tools/contrast/`: script that parses `kit.css`, resolves `var(--color-*)` through Tailwind v4's `theme.css` palette (OKLCH → sRGB), and checks a declared pair list (text/ground and control/ground with required ratio). Exit non-zero on failure. Pair list lives in `tools/contrast/pairs.json` with a `usage` note per pair.
2. Focus ring: grep the kit for `brand-medium`. If it is used only as a focus ring → retune the token (light: a blue ≥ 3:1 on white/gray-50; dark: ≥ 3:1 on gray-900) and keep recipes byte-identical. If it is used elsewhere → add `focus-visible:outline-2 focus-visible:outline-fg-brand focus-visible:outline-offset-2` in the affected recipes and log each in `UPSTREAM.md` as a candidate PR. Record which path was taken.
3. Dark-mode text pairs above: fix at token level (`fg-brand-strong` dark ≥ 4.5 on `brand-soft`/`brand-softer`; document that small `fg-brand` text must not sit on `brand-soft`).
4. `theme` recipe: `copy-files` → `assets/styles/flowbite-xor.css` (the theme block) + README explaining `@import` order in `app.css`, `@source` for `templates/`, and the `.dark` class strategy. `kit.css` at root stays the same content (the demo/preview uses it).
5. Dark mode toggle: `theme-toggle` recipe — Stimulus controller (`localStorage` + `prefers-color-scheme`, sets `.dark` on `<html>`) + a no-flash inline snippet documented for `<head>` (goes into the `layouts` recipe in Phase 6).

**Acceptance:** `tools/contrast` passes in CI; theme and theme-toggle recipes lint; demo toggles dark mode without flash across Turbo navigations.

### Phase 3 — Behavior: Stimulus-only, Turbo/Live-proof
**Tasks**
1. Rewrite `alert` (drop `Dismiss`) and `dropdown` (drop Flowbite `Dropdown`; implement open/close, outside-click, Escape, arrow-key navigation, `aria-expanded`, placement via CSS anchor or a tiny positioning routine — evaluate `@floating-ui/dom` via importmap vs. hand-rolled; prefer no dependency if placement needs are top/bottom/start/end only). Keep public API (targets/values/actions) identical to upstream so templates stay byte-identical where possible.
2. `kit.js`: remove `import 'flowbite'`. Then **test whether the `flowbite` package is still needed at all** (its `flowbite.min.css` ships base styles for some form controls). Keep it declared until the demo passes without it; drop from `manifest.json` only with evidence (screenshots unchanged). Record the outcome in `UPSTREAM.md`.
3. Every controller: idempotent `connect()`, full cleanup in `disconnect()`, no global listeners left behind, no reliance on `DOMContentLoaded`/`turbo:load`.
4. `demo/lab/` scenario pages + Playwright specs (the Turbo/Live matrix):
   - `lab/live-dropdown`: dropdown open while its Live Component re-renders (action + model change) → still open & functional, no duplicate listeners.
   - `lab/live-modal`: `<dialog>` open across a Live action → stays modal; closed modal does not reopen.
   - `lab/live-table`: Live Component table that re-sorts rows containing dropdowns/tooltips → controls work after redraw.
   - `lab/turbo-nav`: navigate between two pages via Turbo Drive → sidebar scroll + collapsed state persists (`data-turbo-permanent`), theme persists, no duplicated toasts.
   - `lab/turbo-stream-toast`: server pushes a `<turbo-stream>` into the toast region → toast appears, auto-dismisses, focus unaffected.
   - `lab/turbo-frame-detail`: list + detail frame; dropdown inside the frame works after frame reload.
   - `lab/permanent-plus-live`: a Live Component inside a `data-turbo-permanent` sidebar → verify behavior; if broken, document the rule "no Live Components inside permanent elements" in AGENTS/README.
5. axe-core accessibility scan on every demo page (Playwright `@axe-core/playwright`), zero serious/critical violations.

**Acceptance:** all lab specs green in CI; lint green; no `from 'flowbite'` imports remain; screenshots unchanged (or changes reviewed).

### Phase 4 — Components the official kit lacks
Each is a `component` recipe with README, previews, screenshots, and a lab spec where it has JS.
1. `sidebar` — collapsible nav, groups, active item via `app.current_route` match or explicit `active` prop, badges/counts; controller persists collapsed state; marked for `data-turbo-permanent` use.
2. `navbar` — brand slot, search slot, actions slot, mobile toggle for sidebar.
3. `drawer` — off-canvas panel (native `<dialog>` where modal; non-modal variant), focus trap, Escape.
4. `toast` — region component + `toast` controller + Twig helper template for `<turbo-stream action="append" target="toasts">`; variants success/warning/danger/info; auto-dismiss, pause on hover, `aria-live`.
5. `tooltip` — hover/focus, Escape, viewport-aware placement; works after DOM moves.
6. `breadcrumb`, `page-header` (title, description, actions slot), `stat-card` (label, value, trend ↑/↓ with text, period), `empty-state`, `progress`, `form-field` (label + control + help + error wrapper used by the form theme).
7. `data-table` (optional, Live Component): sortable/paginated table component class + template; defer if time is short — note in README as planned.

**Acceptance:** lint; previews + screenshots; lab specs for sidebar/drawer/toast/tooltip; axe clean.

### Phase 5 — Form theme
1. `form-theme` recipe → `templates/form/flowbite_layout.html.twig` extending `tailwind_2_layout.html.twig`; blocks for `form_row`, `form_label`, `form_widget_simple`, `form_errors`, `choice_widget_*`, `checkbox_widget`, `radio_widget`, `textarea_widget`, `form_help`, using the same classes as the `input`/`select`/`checkbox`/`radio`/`textarea`/`label` recipes (single source: consider having the theme `{% include %}`/embed those components).
2. Error state: `aria-invalid`, `aria-describedby` to the error id, danger ring/border; help text id wiring.
3. README: `twig.form_themes` config snippet; per-form `{% form_theme %}` usage; Live Component form example (`ComponentWithFormTrait`) showing validation on `data-model` change.
4. Demo page: a form with every field type, server-side validation errors shown; Playwright + axe.

**Acceptance:** rendered form matches component recipes visually (screenshot); axe clean; lab spec for Live form re-render keeps focus/values.

### Phase 6 — Layouts and blocks
1. `layouts` recipe → `templates/layouts/base.html.twig` (head: meta, no-flash theme snippet, `importmap()`, `data-turbo-track="reload"` on assets), `app.html.twig` (navbar + sidebar `data-turbo-permanent` + `page_header` + `content` + toast region + Turbo progress bar styling), `auth.html.twig` (centered card ground), `blank.html.twig`, `settings.html.twig` (secondary nav + panels), `error.html.twig`.
2. Blocks (`type: block`): `login` (takes a `FormView` from `AuthenticationUtils`-style controller: `error`, `last_username`, CSRF; renders through the form theme), `signup`, `forgot-password`, `dashboard-home` (page-header + stat-card row + two-column cards + table), `settings-profile`, `not-found` (404/500 pages).
3. Each block's README shows the controller/route snippet needed (e.g. `app_login` with `AuthenticationUtils`), so a fresh project is working in minutes.
4. Demo: every layout/block as a real page; Playwright screenshots desktop + 390px mobile; sidebar stacks/hides on mobile.

**Acceptance:** `ux:install dashboard-home` on a fresh skeleton (via sync in CI) yields a working dashboard page; lint; screenshots; axe.

### Phase 7 — Docs for humans and agents
1. Kit `README.md`: purpose, install, recipe index (grouped: theme, components, layouts, blocks), update workflow (`ux:install` diff), Turbo/Live rules, versioning.
2. `AGENTS.md` (repo): conventions (§3), how to add a recipe, lint/test commands, "byte-identical unless logged in UPSTREAM.md", screenshot update policy.
3. `docs/PROJECT-AGENTS-SNIPPET.md`: a block xor pastes into each project's `AGENTS.md`/`CLAUDE.md`: use kit components not raw Flowbite HTML; no Live Components inside `data-turbo-permanent`; toasts via Turbo Streams; icons via `ux_icon('flowbite:…')`; theme roles not raw colors.

### Phase 8 — Release and remote-install proof
1. CI job `remote-install`: on `main` and tags, create a fresh skeleton, `composer require --dev symfony/ux-toolkit:^3.5`, run `ux:install dashboard-home --kit=https://github.com/xormania/flowbite-xor:${GITHUB_SHA}` non-interactively, build Tailwind, boot, hit `/` → 200. (Uses the real GitHub zip path; proves §2.2 end to end. SHA works where branch names with `/` do not.)
2. Tag `v0.1.0`. `README` states the compatibility matrix (toolkit ^3.5, Symfony ^7.4|^8.0, PHP ≥ 8.4, Tailwind 4.x, Flowbite 4.x).
3. Open upstream PRs to `symfony/ux` for anything generic and clean (form theme, toast, sidebar, Stimulus-only dropdown/alert); track in `UPSTREAM.md`.

---

## 5. Testing strategy (summary)

| Layer | Tool | Gate |
|-------|------|------|
| Kit structure & docs | `ux-toolkit-kit-lint` | must pass |
| Tokens | `tools/contrast` | all declared pairs ≥ 4.5:1 text / 3:1 controls, both themes |
| Rendering | demo app + Playwright screenshots (light/dark, desktop/390px) | visual diff within tolerance |
| Behavior under Turbo/Live | Playwright specs in `tests/e2e/lab.*.spec.ts` | all green |
| Accessibility | axe-core in Playwright | 0 serious/critical |
| Distribution | `remote-install` CI job | fresh project installs from GitHub and boots |

Run locally: `tools/sync-demo && (cd demo && composer install && php bin/console tailwind:build && php -S 127.0.0.1:8000 -t public) & npx playwright test`.

---

## 6. Conventions (enforced by lint or review)

- Root element: `attributes.defaults({ class: style.apply({...})|tailwind_classes })`; variants via `html_cva`.
- Every prop documented with `## 'a'|'b' …`; every `{% block %}` with `{##- … -#}`.
- Icons: `ux_icon('flowbite:…')` (Iconify set), never inline emoji; icon-only buttons get `aria-label`.
- Colors only through Flowbite role utilities (`bg-brand`, `text-heading`, `border-default`…); never raw palette classes in recipes.
- Real elements: `<button>`, `<a href>`, `<label for>`; no `role`/`onclick` on divs. Touch targets ≥ 44px.
- Controllers: Stimulus only; cleanup in `disconnect()`; no global state; values/targets documented (linter checks).
- Copy in blocks is literal placeholder text in English; no lorem ipsum; use `[Product name]`-style placeholders for unknowns.
- Deviations from upstream `flowbite-4` files are logged in `UPSTREAM.md` with reason and upstream PR link when opened.

---

## 7. Open questions (answer at kickoff; defaults in bold)

1. Symfony version in xor's projects: **7.4 LTS** or 8.x? (Toolkit 3.x supports both; the demo pins one.)
2. PHP ≥ 8.4 everywhere? (Hard requirement of toolkit 3.x. If not, the 2.x toolkit line has no blocks — the layouts would have to ship as plain `copy-files` components instead.)
3. AssetMapper in all projects? (**Yes** assumed; Encore gets only the `npm` dependency lines.)
4. Flowbite's "Inter" font stack: keep Flowbite's `--font-sans` with Inter via Google Fonts `<link>` in `layouts`, or system stack only? (**Keep Inter**, loaded in `base.html.twig`, since Flowbite's metrics assume it.)

---

## 8. Risks and mitigations

- **Toolkit is experimental**; kit/recipe schema may change → pin `symfony/ux-toolkit` in CI, re-run lint on toolkit updates (Dependabot/Renovate on `demo/composer.json`).
- **Upstream `flowbite-4` evolves** (3.6 changelog shows active fixes) → `UPSTREAM.md` pins the copied commit; a scheduled CI job diffs our byte-identical recipes against upstream main and opens an issue on drift.
- **Dropdown positioning without Flowbite's JS** → start with top/bottom/start/end only; adopt `@floating-ui/dom` via importmap if real needs appear.
- **`data-turbo-permanent` + Live Components** → tested in `lab/permanent-plus-live`; rule documented either way.
- **Zip includes the demo app** → `.gitattributes export-ignore` keeps installs small; verify by downloading `archive/main.zip` in CI and listing contents.

---

## 9. Kickoff checklist for the executing session

1. Confirm push access: `git push origin HEAD:refs/heads/ci-check` on a throwaway branch, then delete it.
2. Answer §7 (ask xor once; otherwise use defaults and state them in the first PR description).
3. Clone `symfony/ux` at `f152d0b` (or newer; record the SHA) into a scratch dir for copying `kits/flowbite-4`.
4. Execute Phase 0 → Phase 1 as the first two PRs; do not start Phase 3 rewrites until Phase 1 screenshots are committed (they are the regression baseline).
5. Keep this file at `docs/PLAN.md` in the repo and tick phases off in the PR descriptions.

Reference material available from the conversation that produced this plan: a "Flowbite Dashboard" design-system artifact (tokens with contrast notes, dashboard component previews) and a dark chess-dashboard mockup; both are visual references only, not sources of truth.
