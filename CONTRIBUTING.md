# Contributing to flowbite-xor

flowbite-xor is a Symfony UX Toolkit kit: `manifest.json` at the root, one recipe per top-level directory
holding a `manifest.json`. This page covers the repository, the conventions, adding a recipe, and the commit
and pull request standard.

## Repository layout

| Path | In the `ux:install` download | What it is |
|------|---------------------------|---|
| `manifest.json`, `INSTALL.md`, `kit.css`, `kit.js`, `icon.svg`, `<recipe>/` (minus `<recipe>/tests/`), `README.md`, `LICENSE`, `NOTICE` | yes | the kit, its readme and license |
| `demo/` | no | a Symfony app showing every recipe (`/r/<recipe>`), test pages for Turbo and Live Components (`/lab`), and a small application made of the layouts and blocks (`/demo`) |
| `tools/sync-demo` | no | copies every recipe into `demo/` the way `ux:install --force` does |
| `tools/demo-php` | no | runs PHP in the demo's container, for the Playwright specs (`DEMO_URL`) |
| `tools/contrast/` | no | WCAG contrast check of the theme's color roles |
| `tools/tests/` | no | `sync-demo` parity with `ux:install`; install of the exported kit on a fresh Symfony skeleton |
| `tests/e2e/`, `playwright.config.ts`, `<recipe>/tests/` | no | Playwright tests against the demo; screenshot baselines |
| `docs/`, `.github/` | no | a snippet that projects using the kit paste into their own `AGENTS.md` ([`docs/PROJECT-AGENTS-SNIPPET.md`](docs/PROJECT-AGENTS-SNIPPET.md)), CI, the pull request template |

`ux:install` downloads GitHub's archive of the whole repository; `export-ignore` in `.gitattributes` keeps
everything else out of it (the demo, tests, tools, and repository files such as this one, `AGENTS.md` and
`UPSTREAM.md`). Keep any new path out of the archive the same way unless users need it.

## Setup

The demo runs in [Symfony Docker](https://github.com/dunglas/symfony-docker): FrankenPHP in worker mode, PHP 8.5,
HTTPS. You need Docker and Node.js (CI uses 22); no PHP on your machine. Playwright's browser also runs in Docker,
in the same `mcr.microsoft.com/playwright` image as the Symfony UX Toolkit's own tests, so screenshots match the
committed baselines.

```bash
cd demo
docker compose up --wait                            # builds the image the first time, then installs the Composer packages
docker compose exec php php ../tools/sync-demo      # copy every recipe into demo/ (safe to re-run; deletes nothing)
docker compose exec php bin/console tailwind:build  # add --watch to rebuild the CSS as you edit
cd .. && npm ci
```

Open https://localhost (the demo listens on this machine only) and accept the certificate of Caddy's local
authority. The container sees the whole repository in `/app` and runs the demo from `/app/demo`, as on disk;
FrankenPHP restarts its workers when a file changes. After changing a recipe, run `tools/sync-demo` and
`tailwind:build` again. `tools/sync-demo` never deletes: remove a renamed or deleted recipe file from `demo/`
yourself. `docker compose down` stops the demo.

Without Docker, with PHP 8.4 or later and Composer: run `tools/sync-demo`, then
`(cd demo && composer install && php bin/console tailwind:build && php bin/console asset-map:compile)`, and serve
the demo with `php -S 127.0.0.1:8000 -t demo/public`. PHP's built-in server only serves the compiled CSS and
JavaScript in `demo/public/assets/`, so compile again after each change.

## Checks

CI runs all of them on every push. The PHP ones run on your machine as shown, or in the container: prefix them with
`docker compose exec php` from `demo/`, with paths relative to `demo/`
(`docker compose exec php bash ../tools/tests/sync-demo.sh`).

```bash
# lint the kit as users download it (git archive exports committed files only: commit first)
tmp=$(mktemp -d) && git archive HEAD | tar -x -C "$tmp" && demo/vendor/bin/ux-toolkit-kit-lint "$tmp"
demo/vendor/bin/ux-toolkit-kit-debug .              # lists each recipe with its files and dependencies: check yours

node tools/contrast/check.mjs                       # every pair in tools/contrast/pairs.json meets its contrast minimum
cmp kit.css theme/assets/styles/flowbite-xor.css    # the theme recipe ships kit.css unchanged
tools/tests/sync-demo.sh                            # tools/sync-demo copies what ux:install copies, on a test kit (needs demo/vendor)
tools/tests/fresh-install.sh                        # a new Symfony app installs dashboard-home and signup from the last commit (PHP=…, COMPOSER_BIN=…: other binaries)
npx playwright test                                 # every browser test: see below
```

`npx playwright test` runs two projects; pick one with `--project=smoke` or `--project=examples`.

- `smoke` runs the specs in `tests/e2e/`: the demo pages, the forms, the `/lab` pages for Turbo and Live
  Components, the components given hostile prop values (`hostile-props.spec.ts`), and an axe accessibility scan of
  every demo page (no serious or critical issue).
- `examples` compares a screenshot of every README example and of every `/demo` page with the committed one, and
  runs the official kit's recipe specs (`<recipe>/tests/*.spec.ts`, ported to `tests/e2e/examples/recipes/`).

Against the Docker demo, run `DEMO_URL=https://localhost npx playwright test`: the specs then run PHP in the
container (`tools/demo-php`). Without `DEMO_URL`, Playwright serves the demo itself with `php -S 127.0.0.1:8000`.
Either way it starts the browser container, unless something already listens on port 3000. The demo shows all of a recipe's examples at `/r/<recipe>`, and one example
alone at `/preview/<recipe>/<example>?theme=light` (or `dark`). `<example>` is the slug of the heading above the
example: `default` for the one under the title, with `-2`, `-3`… added when a heading repeats.

## Conventions

- **Copied recipes stay byte-identical.** The 22 recipes copied from the official `flowbite-4` kit (listed in
  [`UPSTREAM.md`](UPSTREAM.md)) match the `symfony/ux` commit pinned there. Every change to them gets a row in its
  *Deviations* table: file, change, reason, upstream PR.
- **Behavior in Stimulus only.** No `import 'flowbite'` and no `initFlowbite()`. A controller's `connect()` must work
  when it runs again on the same element, since Turbo and Live Components reconnect controllers. `disconnect()` undoes
  everything `connect()` set up. No global state, and no `DOMContentLoaded` or `turbo:load` listeners.
- **Recipe format** (checked by `ux-toolkit-kit-lint`):
  - `manifest.json` with `type` and `name`;
  - `README.md` opening with `# Title`, then a one-line summary;
  - each prop in `{% props %}` preceded by a `## <type> <description>` line, and each `{% block %}` preceded by a
    `{##- <description> -#}` comment (see `stat-card/templates/components/StatCard.html.twig`);
  - root element `attributes.defaults({...|tailwind_classes})`, variants with `html_cva`;
  - a controller's `@target`, `@value` and `@action` comment tags, if it has any, match its code.
- **Naming.** Recipe folders in lower kebab case (`stat-card`), components in PascalCase (`StatCard`, parts
  `Sidebar:Item`), controller files in snake case and used in kebab case (`theme_toggle_controller.js`,
  `data-controller="theme-toggle"`). Copied recipe and controller names stay unchanged.
- **Colors** only through the theme's role utilities (`bg-brand`, `text-heading`, `border-default`…).
- **CSS order.** `flowbite.min.css` loads after Tailwind's utilities, so when both define a class, Flowbite's copy
  wins.
  - A variant class that Flowbite does not define loses to a plain class that it does: in `flex max-md:hidden` the
    element stays `flex`. Write `max-md:hidden!`, or make the variant more specific
    (`max-md:not-data-mobile-open:hidden`).
  - Flowbite's `max-w-2xl` is 16rem, not 42rem: do not use it.

  Check the computed style in the browser. Details are under *Toolkit findings* in `UPSTREAM.md`.
- **Twig inside components.** In a component's content (`<twig:X>…</twig:X>`), `block('name')` and `{% block %}`
  belong to the component: reach the surrounding template's blocks with `block(outerBlocks.name)`.
- **Turbo forms.** A submitted form answers with a redirect (303) when it succeeds and 422 when it shows errors;
  Turbo Drive rejects a 200.
- **Never commit** `demo/vendor/`, `demo/var/`, `demo/public/assets/`, `demo/assets/vendor/`, `node_modules/`,
  Playwright output (`test-results/`, `playwright-report/`).

## Adding a recipe

1. Create `<recipe>/manifest.json`. Copy the `$schema` line from one of this kit's own recipes (`stat-card`): the
   copied ones carry a path that only resolves in `symfony/ux`. Then set:
   - `type`: `component`, or `block` for a page section;
   - `name`: the component name (`StatCard`);
   - `copy-files`: `{"templates/": "templates/"}`, plus `"assets/": "assets/"` when the recipe has a controller;
   - `dependencies`: `recipe` lists the kit recipes it uses, `composer` the packages its templates need.
     `tailwind_classes` needs `tales-from-a-dev/twig-tailwind-extra:^1.3.0`, `twig/html-extra:^3.24.0` and
     `symfony/ux-twig-component:^3.5`; `html_cva` needs `twig/html-extra` and `twig/extra-bundle`; icons need
     `symfony/ux-icons`. The lint's `composer.symbol-undeclared` warning names a missing one.

   Give a package no constraint (`symfony/form`) or a single range (`^3.5`), never `^7.4|^8.0`: `ux:install` prints
   the constraints in a `composer require` command users paste, and the shell reads `|` as a pipe.
2. Add the files: the component in `<recipe>/templates/components/<Name>.html.twig`, each part `<Name>:<Part>` in
   `<recipe>/templates/components/<Name>/<Part>.html.twig`, and a controller in
   `<recipe>/assets/controllers/<snake_name>_controller.js` (`theme_toggle_controller.js` for `theme-toggle`).
3. Write `<recipe>/README.md` in this order: `# Title`, a one-line summary, a first example, `## Installation` holding
   only the line `::: installation` (the toolkit replaces it with the install steps), `## Usage`, then more examples
   under `##` or `###` headings. Open each example with ```` ```twig {"preview":true} ````: the demo renders it and
   Playwright screenshots it in light and dark. A plain ```` ```twig ```` block is shown as code only.
4. Run `tools/sync-demo`, then `(cd demo && php bin/console tailwind:build && php bin/console asset-map:compile)`: the
   demo's CSS only holds the classes it has seen, and the demo serves the compiled files. Start the demo (see *Setup*)
   and open `/r/<recipe>` and `/preview/<recipe>/<example>?theme=dark`.
   - Icons: Iconify on demand is off in the demo, so import each icon the recipe uses
     (`(cd demo && php bin/console ux:icons:import flowbite:<name>)`) and commit it under `demo/assets/icons/`.
   - A block that takes a Symfony form gets one for its previews in `demo/src/Kit/PreviewForms.php`.
5. Record the recipe's screenshots with `npx playwright test --project=examples --update-snapshots=missing`. It writes
   only the baselines that do not exist yet, as `<recipe>/tests/screenshots/<example>-light.png` and `-dark.png`.
   Look at each one, and add them to the same commit as the recipe.
6. A recipe with a controller gets a Playwright spec in `tests/e2e/`. If the behavior must survive Turbo visits,
   frames or streams, or Live Component re-renders, test it on a `/lab` page:
   - add the scenario to `SCENARIOS`, with a route, in `demo/src/Controller/LabController.php`;
   - add its template to `demo/templates/lab/`;
   - write the spec as `tests/e2e/lab.<scenario>.spec.ts`;
   - add its path to `labPages` in `tests/e2e/a11y.spec.ts`.

   If the recipe puts a text, icon or bar color on a background that `tools/contrast/pairs.json` does not cover yet,
   add a row there: `fg`, `bg`, `min` (4.5 for text, 3 for icons, bars and focus rings) and `usage`.
7. Add a row for the recipe to the matching table under *Recipes* in `README.md` (mark it ✦ if it ships a Stimulus
   controller), and an entry to `CHANGELOG.md` (see *Changelog*). Commit, then run the checks that cover a new
   recipe: the kit lint, `ux-toolkit-kit-debug`, `node tools/contrast/check.mjs` if you added pairs, and
   `npx playwright test`. CI runs all of them.

## Screenshots

`<recipe>/tests/screenshots/*.png` are the baselines Playwright compares screenshots with. For the copied recipes
they come from the official kit, and `UPSTREAM.md` lists the few that changed. Never update them as a side effect. A
visual change is a commit of its own:

1. Run `npx playwright test --project=examples --update-snapshots`. It rewrites every baseline that differs.
2. Keep only the files you meant to change (check `git status`), and review them.
3. Add a row to `UPSTREAM.md` when a copied recipe's baseline changes.

## Commits and pull requests

**Commit subject:** `type(scope): what changes`, in plain words, at most 72 characters, no trailing period.

- `type`: `feat` (new recipe or behavior), `fix`, `docs`, `test`, `ci`, `chore` (tooling, dependencies).
- `scope`: the recipe (`sidebar`, `form-theme`) or the area (`demo`, `ci`, `tools`); left out when several apply.
- Body, when the subject is not enough: why, and what was checked.

Examples: `feat(stat-card): show the trend as text`, `fix(layouts): every layout shows flash messages`.

**Pull request:** one topic, with a title in the commit subject format. The description follows
[the template](.github/pull_request_template.md):

- *What* lists the changes.
- *Why* gives the problem or the goal.
- *Checks* says whether CI passed on the last commit and what you verified by hand.

Use plain words throughout, and no AI attribution lines (`Co-Authored-By`, "Generated with" footers). Pull requests
are merged with a merge commit (no squash, no rebase), so every commit of the branch lands on `main`: each one
follows the commit standard above.

**Changelog:** a user-visible change (a recipe added, changed or removed, a fix users notice) gets an entry under
`## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md), in the pull request that makes it: one line naming the recipe,
under `### Added`, `### Changed`, `### Fixed` or `### Removed`, as Keep a Changelog does.

## Releases

Versions are git tags `X.Y.Z` ([Semantic Versioning](https://semver.org/)) without a `v`: the toolkit cannot
install a `v` tag (see `UPSTREAM.md`). A release is a pull request that moves the entries under
`## [Unreleased]` in `CHANGELOG.md` to a new `## [X.Y.Z] - YYYY-MM-DD` section. Once it is merged, tag that pull
request's merge commit on `main` as `X.Y.Z`.
