# flowbite-xor

A [Symfony UX Toolkit](https://symfony.com/bundles/ux-toolkit/current/index.html) kit built on the free
[Flowbite](https://flowbite.com/) v4 library and Tailwind CSS v4: copy-in recipes (Twig components,
Stimulus controllers, layouts, blocks, a form theme, a theme) for xor's Symfony projects.

All behavior lives in Stimulus controllers (no global `initFlowbite()`), so components keep working
when Live Components re-render them and when Turbo navigates.

> **Status:** Phase 6: `layouts` (base, app shell with a permanent sidebar, auth, settings, error, blank) and the blocks `login`, `signup`, `forgot-password`, `dashboard-home`, `settings-profile`, `not-found`, all wired as a small application at `/demo` (sign in with demo@example.com / demo).
> Phase 5: `form-theme`, a Symfony form theme that renders rows through `form-field` and controls through the kit's components (demo at `/forms`, pixel parity with hand-written components at `/forms/parity`).
> Phase 4: recipes the official kit lacks: `sidebar`, `navbar`, `drawer`, `toast`, `tooltip`, `breadcrumb`, `page-header`, `stat-card`, `empty-state`, `progress`, `form-field`. A Live Component `data-table` is planned, not built yet.
> Phase 3: every behavior is a Stimulus controller (no Flowbite JavaScript), checked under Turbo and Live Components in `/lab`. Phase 2: the 22 base recipes of the official `flowbite-4` kit (see [`UPSTREAM.md`](UPSTREAM.md)),
> plus `theme` (Flowbite's color roles with contrast fixes, checked in CI) and `theme-toggle`.
> The build plan is [`docs/PLAN.md`](docs/PLAN.md).

## Turbo and Live Components

- No global `initFlowbite()`: each recipe's Stimulus controller connects to new markup (Turbo visits, Turbo Frames, Live re-renders) and cleans up when it leaves.
- Verified in `demo` `/lab` (`tests/e2e/lab.*.spec.ts`): a dropdown stays open and working while its Live Component re-renders, a `<dialog>` stays modal across Live re-renders (and a closed one stays closed), dropdowns keep working in re-sorted Live rows and in reloaded Turbo Frames, and a Live Component inside a `data-turbo-permanent` element keeps its state and stays live.
- `data-turbo-permanent` keeps the node, not its scroll position: a permanent element that must keep its scroll restores it from its controller.

## Usage

Prepare the project once, in this order, then install recipes with the UX Toolkit:

```bash
# contrib recipes: twig-tailwind-extra (the `tailwind_classes` filter) registers its bundle through one
composer config extra.symfony.allow-contrib true
# regular dependencies before the toolkit: TwigComponentBundle needs TwigBundle, and required only through
# `--dev symfony/ux-toolkit`, symfony/property-access is dev-only and cache:clear fails ("non-existent service
# property_accessor")
composer require symfony/twig-bundle symfony/ux-twig-component
# http-client: the toolkit downloads the kit from GitHub with it
composer require --dev symfony/ux-toolkit:^3.5 symfony/http-client
```

Then install recipes:

```bash
# from main
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor

# from a tag, branch or commit SHA (no "/" allowed: use the SHA for branches like feat/x)
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor:<version>
```

`ux:install` prints the `composer require` command for the packages the installed recipes need: run it. Files land in your project, where you own them. Re-running `ux:install` is the update path: it asks before overwriting each file you already have.
Project setup (Tailwind, Flowbite, theme) is described in [`INSTALL.md`](INSTALL.md).

## Targets

| | |
|---|---|
| Symfony UX Toolkit | ^3.5 (blocks need 3.5) |
| PHP | ≥ 8.4 (required by the toolkit) |
| Symfony | 7.4 LTS (demo app); toolkit supports ^7.4 \| ^8.0 |
| Assets | AssetMapper (Encore: npm dependencies declared) |
| Tailwind CSS | 4.x |
| Flowbite | 4.x |

## Repository layout

| Path | In `ux:install` downloads | |
|------|---------------------------|---|
| `manifest.json`, `INSTALL.md`, `kit.css`, `kit.js`, `icon.svg`, `<recipe>/` (minus `<recipe>/tests/`) | yes | the kit |
| `demo/` | no | Symfony app showing every recipe, plus Turbo/Live scenario pages (`/lab`) |
| `tools/sync-demo` | no | copies every recipe into `demo/` the way `ux:install --force` does |
| `tools/contrast/` | no | WCAG contrast gate for the theme's color roles |
| `tests/e2e/`, `playwright.config.ts`, `<recipe>/tests/` | no | Playwright tests against the demo; screenshot baselines |
| `docs/`, `.github/` | no | plan, CI |

`ux:install` downloads GitHub's archive of the whole repository; `.gitattributes` `export-ignore`
keeps everything but the kit out of it.

## Development

Requires PHP 8.4, Composer, Node.js and Docker (Playwright's browser runs in upstream's image, so
screenshots match the committed baselines).

```bash
tools/sync-demo                                   # copy recipes into demo/
(cd demo && composer install && php bin/console tailwind:build)
npm ci
npx playwright test                               # smoke + every README example (light/dark) + recipe specs
```

Playwright starts `php -S` on `demo/public` and the browser container unless they already listen on
:8000 and :3000. The demo renders one example alone at `/preview/<recipe>/<example>?theme=light|dark`;
`/r/<recipe>` shows all of a recipe's examples. Screenshots live in `<recipe>/tests/screenshots/`;
update them only deliberately: `npx playwright test --project=examples --update-snapshots`.

Check the theme's contrast (both themes, pairs in `tools/contrast/pairs.json`):

```bash
node tools/contrast/check.mjs
```

Lint the kit as users download it (`ux-toolkit-kit-lint` reports non-recipe directories such as
`demo/` as errors, so lint the exported tree):

```bash
tmp=$(mktemp -d) && git archive HEAD | tar -x -C "$tmp" && demo/vendor/bin/ux-toolkit-kit-lint "$tmp"
```

## License

MIT — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE) (Symfony UX, Flowbite).
