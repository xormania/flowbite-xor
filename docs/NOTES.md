# Notes

Behavior of the toolkit, Symfony, Flowbite and the browsers that this repository works around, and where the
demo's Docker setup comes from. `CONTRIBUTING.md` points here for the details.

## Toolkit and platform findings

| Finding | Workaround here |
|---------|-----------------|
| `ux-toolkit-kit-lint` (`MissingRecipeManifestChecker`, v3.5.x and main) reports every top-level directory without a `manifest.json` as an error, dot directories included (`.git/`, `.github/`), so a kit repository with a demo app, tools or CI config cannot lint its root. | CI lints the exported kit (`git archive HEAD`, honoring `.gitattributes` `export-ignore`): the same tree GitHub's archive gives `ux:install`. |
| `data-turbo-permanent` keeps an element's node across Turbo Drive visits but not its scroll position (Chromium resets the scroll of a re-inserted element; `tests/e2e/lab.turbo-nav.spec.ts`). | A permanent element that must keep its scroll restores it from its controller: the sidebar remembers the position on `scroll` and restores it in `connect()` (`disconnect()` runs after the re-insert, too late to read it). `tests/e2e/lab.turbo-nav.spec.ts` covers both. |
| The toolkit refuses to load a kit without any recipe ("No recipes found"). | A kit always holds at least one recipe. |
| `symfony/ux-toolkit` v3.5.1 `Recipe::getExamples()` returns no example ids; main (f152d0b) names each example after the heading above it, and the screenshots use those ids. | `demo/src/Kit/KitReader.php` ports main's algorithm. |
| `Avatar:Fallback` renders its icon without a size class, so it relies on ux-icons having no default `width`/`height`. The ux-icons Flex recipe sets both to `1em`, so a real project shows a smaller icon than the toolkit's own previews. | The demo drops the default size (`demo/config/packages/ux_icons.yaml`), as the toolkit's preview app does. |
| `flowbite.min.css` (4.0.2) defines `--spacing-2xl: 16rem` and compiles `.max-w-2xl` to `max-width: var(--spacing-2xl)`, so with the kit's required CSS `max-w-2xl` is 16rem, not Tailwind's 42rem. `max-w-xs`…`max-w-xl` are unaffected. | flowbite-xor recipes and README examples do not use `max-w-2xl`. |
| `flowbite.min.css` is imported after `tailwindcss` (INSTALL.md), so its copies of utilities come last in the `utilities` layer: a variant class it lacks loses to a base class it has on the same element (`flex max-md:hidden` stays `flex`). Found with the sidebar. | flowbite-xor recipes raise the variant's specificity (`max-md:not-data-mobile-open:hidden`), use `!`, or avoid the pair (breadcrumb keeps `gap-1`). |
| `flowbite.min.css` (4.0.2) compiles its `dark:` utilities (`dark:hidden`, `dark:block`, `dark:inline-block`, its `dark:` colors) inside `@media (prefers-color-scheme: dark)`, not against the `dark` class the kit's `@custom-variant dark` and `theme-toggle` use: under a dark system with the light theme chosen, they still apply. Found with the theme toggle's icon. | flowbite-xor recipes use no `dark:` class Flowbite's stylesheet also defines (`theme-toggle` shows its moon with `not-dark:inline`); colors come from the theme's tokens, which follow the class. `tests/e2e/theme-toggle.spec.ts` covers each system preference and saved choice. |
| The toolkit knows two recipe types, `component` and `block` (`RecipeType`, v3.5.1 and main); the schema has no type for a form theme, a stylesheet or a layout. | `theme` and `form-theme` are `component` recipes that install a stylesheet and a form theme. |
| On a fresh skeleton, `composer require --dev symfony/ux-toolkit` brings `symfony/ux-twig-component` and `symfony/property-access` as dev-only packages: `ContainerBuilder::willBeAvailable()` then keeps FrameworkBundle's `property_access` off, while Flex registers TwigComponentBundle for every environment, so `cache:clear` fails ("non-existent service property_accessor"). Found by the fresh-install check. | README and INSTALL.md: require `symfony/ux-twig-component` before the toolkit; `tools/tests/fresh-install.sh` does. |
| `tales-from-a-dev/twig-tailwind-extra` (the `tailwind_classes` filter of every recipe) registers its bundle through a contrib recipe, which a fresh skeleton does not apply (`allow-contrib: false`): every component fails with `Unknown "tailwind_classes" filter`. | README and INSTALL.md: `composer config extra.symfony.allow-contrib true` first; the fresh-install check does. |
| `ux:install` prints the `composer require` command with each recipe's constraints as they are: a constraint holding a shell metacharacter (`symfony/form:^7.4\|^8.0`) pipes the pasted line into another command, so most packages are never required. Found in review. | Recipes declare such packages without a constraint (`symfony/form`), or with one range (`^3.5`); the fresh-install check runs the printed commands through a shell. |
| `symfony/ux-toolkit` has `symfony/http-client` in `require-dev` only, but needs it to download a kit from GitHub (`--kit=https://github.com/…`): `You must install "symfony/http-client"`. And `symfony/ux-twig-component` does not require `symfony/twig-bundle`, which its bundle needs (`The TwigBundle is not registered`). | README and INSTALL.md: require them with the toolkit and before it; the fresh-install check does. |
| `GitHubRegistry` downloads `archive/<version>.zip` and expects the folder inside to be `<repo>-<version>`. GitHub names it after the full commit SHA for a short SHA, and drops the `v` of a `v1.2.3` tag, so `--kit=…:v1.2.3` and short SHAs fail ("Unable to extract the archive"). Same on `main`. Found in review. | Release tags without a `v` (`0.1.0`); the README asks for full SHAs. |
| Symfony 7.4: the route cache depends on the compiled container through a `FileResource` (`filemtime <= timestamp`, one-second resolution), and `routing.controllers` (`AttributeServicesLoader`) adds no resource for the list of controllers. When `cache:clear`'s own boot rebuilds the container in the same second as the previous build, it takes the "Cache is fresh" branch and keeps the old routes: a controller added in that second answers 404 (the welcome page). Found by the fresh-install check, which failed once in two runs. | `tools/tests/fresh-install.sh` deletes `var/cache` and runs `cache:warmup`. |

## Screenshots

Playwright takes and compares the screenshots in the `mcr.microsoft.com/playwright:v1.58.2-noble` image
(`playwright.config.ts`), so they do not depend on the machine's fonts. Dependabot leaves that image alone: bump it
by hand, together with the baselines it changes.

## Symfony Docker (demo only)

`demo/Dockerfile`, `demo/compose.yaml`, `demo/compose.override.yaml`, `demo/.dockerignore` and `demo/frankenphp/`
come from [`dunglas/symfony-docker`](https://github.com/dunglas/symfony-docker) `main` at
[`4227566`](https://github.com/dunglas/symfony-docker/tree/422756611d61e0108600ed7ec1370ec677d0e8d0), with the
FrankenPHP 1.13 (Mercure 1.0) changes of its open pull request
[#969](https://github.com/dunglas/symfony-docker/pull/969): `frankenphp/Caddyfile` (an `issuer` block,
`protocol_version_compatibility 8`) and `MERCURE_EXTRA_DIRECTIVES: playground`. Without them, current FrankenPHP
images refuse the template's Mercure configuration. Update with the template's own tool (`template-sync`).

| File | Change | Reason |
|------|--------|--------|
| `demo/compose.override.yaml` | mounts the whole repository at `/app` and runs the demo from `/app/demo` (`working_dir`, the `var/` volume, `SERVER_ROOT`) | the demo reads the kit from its parent directory (`app.kit_dir`), its stylesheet imports `kit.css` and scans the kit by relative path, and `tools/sync-demo` runs in the container |
| `demo/frankenphp/Caddyfile` | `root {$SERVER_ROOT:/app/public}` (was `root /app/public`) | the demo's public directory is `/app/demo/public` in development; the image keeps `/app/public` |
| `demo/compose.yaml` | ports published on `127.0.0.1` only (`host_ip`) | the demo runs in development, with an open Mercure hub and the template's default JWT key: it must not answer on the machine's other network interfaces |
