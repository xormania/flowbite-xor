# Contributing to flowbite-xor

flowbite-xor is a Symfony UX Toolkit kit: `manifest.json` at the root, one recipe per top-level directory
holding a `manifest.json`. This page covers the repository, the conventions, adding a recipe, and the commit
and pull request standard.

## Repository layout

| Path | In `ux:install` downloads | |
|------|---------------------------|---|
| `manifest.json`, `INSTALL.md`, `kit.css`, `kit.js`, `icon.svg`, `<recipe>/` (minus `<recipe>/tests/`) | yes | the kit |
| `demo/` | no | Symfony app showing every recipe, plus Turbo/Live scenario pages (`/lab`) and a small application (`/demo`) |
| `tools/sync-demo` | no | copies every recipe into `demo/` the way `ux:install --force` does |
| `tools/contrast/` | no | WCAG contrast check of the theme's color roles |
| `tools/tests/` | no | `sync-demo` parity with `ux:install`; install of the exported kit on a fresh Symfony skeleton |
| `tests/e2e/`, `playwright.config.ts`, `<recipe>/tests/` | no | Playwright tests against the demo; screenshot baselines |
| `docs/`, `.github/` | no | the snippet for projects' `AGENTS.md` ([`docs/PROJECT-AGENTS-SNIPPET.md`](docs/PROJECT-AGENTS-SNIPPET.md)), CI, the pull request template |

`ux:install` downloads GitHub's archive of the whole repository; `export-ignore` in `.gitattributes` keeps
everything but the kit out of it. Keep any new non-kit path out of the archive the same way.

## Setup

Requires PHP 8.4, Composer, Node.js and Docker (Playwright's browser runs in the official kit's test image, so screenshots
match the committed baselines).

```bash
tools/sync-demo                                     # copy every recipe into demo/ (idempotent, deletes nothing)
(cd demo && composer install && php bin/console tailwind:build)
npm ci
```

## Checks

CI runs all of them on every push.

```bash
# lint the kit as users download it (git archive exports committed files only: commit first)
tmp=$(mktemp -d) && git archive HEAD | tar -x -C "$tmp" && demo/vendor/bin/ux-toolkit-kit-lint "$tmp"
demo/vendor/bin/ux-toolkit-kit-debug .              # what the toolkit sees

node tools/contrast/check.mjs                       # theme contrast; kit.css and theme/assets/styles/flowbite-xor.css stay identical
tools/tests/sync-demo.sh                            # sync-demo copies what ux:install copies (needs demo/vendor)
tools/tests/fresh-install.sh                        # fresh skeleton + ux:install dashboard-home and signup (PHP=… COMPOSER_BIN=…)
npx playwright test                                 # smoke, Turbo/Live lab, axe on every demo page, README screenshots, recipe specs
```

Playwright starts `php -S` on `demo/public` and the browser container unless they already listen on :8000 and
:3000. The demo renders one README example alone at `/preview/<recipe>/<example>?theme=light|dark`; `/r/<recipe>`
shows all of a recipe's examples.

## Conventions

- **Copied recipes stay byte-identical** to the `symfony/ux` commit pinned in [`UPSTREAM.md`](UPSTREAM.md). Every
  deviation gets a row there (file, change, reason, upstream status).
- **Behavior in Stimulus only.** No `import 'flowbite'` and no global init. Controllers: idempotent `connect()`,
  full cleanup in `disconnect()`, no global state, no `DOMContentLoaded`/`turbo:load` listeners.
- **Recipe format** (checked by `ux-toolkit-kit-lint`): `manifest.json` with `type` and `name`; `README.md`
  opening with `# Title` then a one-line summary; `{% props %}` documented with `##`; blocks documented with
  `{##- … -#}`; root element `attributes.defaults({...|tailwind_classes})`; variants with `html_cva`.
- **Naming.** Recipe folders lower-kebab (`stat-card`), components PascalCase (`StatCard`, parts
  `StatCard:Trend`), controllers `snake_controller.js` ↔ kebab identifier. Copied recipe and controller names stay
  unchanged.
- **Colors** only through the theme's role utilities (`bg-brand`, `text-heading`, `border-default`…).
- **CSS order.** `flowbite.min.css` loads after Tailwind's utilities and wins ties: a variant it lacks loses to a
  base utility it has (`flex max-md:hidden` stays `flex`), and its `max-w-2xl` is 16rem. Raise the variant's
  specificity or use `!`, and check the computed style.
- **Twig inside components.** In a component's content (`<twig:X>…</twig:X>`), `block('name')` and `{% block %}`
  belong to the component: reach the surrounding template's blocks with `block(outerBlocks.name)`.
- **Turbo forms.** A submitted form answers with a redirect (303) when it succeeds and 422 when it shows errors;
  Turbo Drive rejects a 200.
- **Never commit** `demo/vendor/`, `demo/var/`, `demo/public/assets/`, `demo/assets/vendor/`, `node_modules/`,
  Playwright output (`test-results/`, `playwright-report/`).

## Adding a recipe

1. Create `<recipe>/manifest.json`: `type` (`component`, or `block` for a page section), `name` (the component
   name), `copy-files`, and `dependencies` (`recipe` for kit recipes it uses, `composer` for packages:
   `tailwind_classes` needs `tales-from-a-dev/twig-tailwind-extra`, `html_cva` needs `twig/html-extra`,
   components need `symfony/ux-twig-component:^3.5`). Copy the `$schema` line from another recipe. No shell
   metacharacters in constraints (`^7.4|^8.0`): `ux:install` prints them in a command users paste.
2. Add the files under the paths `copy-files` maps: `templates/components/<Name>.html.twig` (parts in
   `templates/components/<Name>/`), `assets/controllers/<snake>_controller.js` for behavior.
3. Write `README.md`: `# Title`, a one-line summary, then a ```` ```twig {"preview":true} ```` example,
   `## Installation` with `::: installation`, `## Usage`, more examples under `##`/`###` headings. Every
   ```` ```twig {…} ```` block is a demo preview and a screenshot test.
4. `tools/sync-demo`, then open `/r/<recipe>` and `/preview/<recipe>/<example>?theme=dark` in the demo. Icons the
   recipe uses go under `demo/assets/icons/` (Iconify on demand is off in the demo).
5. Record the screenshots (below), review them, and commit them with the recipe.
6. Behavior gets a spec in `tests/e2e/` (a `/lab` page when it must survive Turbo or Live re-renders); new color
   pairs go in `tools/contrast/pairs.json`.
7. Add the recipe to the index in `README.md` and an entry to `CHANGELOG.md`, commit, and run the checks.

## Screenshots

`<recipe>/tests/screenshots/*.png` are the visual-regression baseline (byte-identical upstream copies for the
copied recipes). Never update them as a side effect: a visual change is a deliberate commit made with
`npx playwright test --project=examples --update-snapshots` (browser in Docker, same image as CI), reviewed, and
logged in `UPSTREAM.md` when it touches a copied recipe.

## Commits and pull requests

**Commit subject:** `type(scope): what changes`, in plain words, at most 72 characters, no trailing period.

- `type`: `feat` (new recipe or behavior), `fix`, `docs`, `test`, `ci`, `chore` (tooling, dependencies).
- `scope`: the recipe (`sidebar`, `form-theme`) or the area (`demo`, `ci`, `tools`); left out when several apply.
- Body, when the subject is not enough: why, and what was checked.

Examples: `feat(stat-card): show the trend as text`, `fix(layouts): every layout shows flash messages`.

**Pull request:** one topic; the title in the commit subject format; the description follows
[the template](.github/pull_request_template.md) (What, Why, Checks). Plain words throughout, no AI attribution
lines (`Co-Authored-By`, "Generated with" footers). Pull requests are merged with a merge commit (no squash, no
rebase).

**Changelog:** a user-visible change (a recipe added, changed or removed, a fix users notice) gets an entry under
`## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md), in the pull request that makes it.

## Releases

Versions are git tags `vX.Y.Z` ([Semantic Versioning](https://semver.org/)). A release moves the `Unreleased`
entries of `CHANGELOG.md` under the new version and its date, then tags the merge commit on `main`.
