# flowbite-xor

A [Symfony UX Toolkit](https://symfony.com/bundles/ux-toolkit/current/index.html) kit built on the free
[Flowbite](https://flowbite.com/) v4 library and Tailwind CSS v4: copy-in recipes (Twig components,
Stimulus controllers, layouts, blocks, a form theme, a theme) for xor's Symfony projects.

All behavior lives in Stimulus controllers (no global `initFlowbite()`), so components keep working
when Live Components re-render them and when Turbo navigates.

> **Status:** Phase 2: the 22 base recipes of the official `flowbite-4` kit (see [`UPSTREAM.md`](UPSTREAM.md)),
> plus `theme` (Flowbite's color roles with contrast fixes, checked in CI) and `theme-toggle`.
> The build plan is [`docs/PLAN.md`](docs/PLAN.md).

## Usage

Recipes are installed into a project with the UX Toolkit (`composer require --dev symfony/ux-toolkit:^3.5`):

```bash
# from main
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor

# from a tag, branch or commit SHA (no "/" allowed: use the SHA for branches like feat/x)
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor:<version>
```

Files land in your project, where you own them. Re-running `ux:install` shows a diff and is the update path.
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
