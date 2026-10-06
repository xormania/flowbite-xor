# Upstream tracking

This kit carries its own copies of the official Symfony UX Toolkit `flowbite-4` kit, because a
recipe can only depend on recipes of its own kit (`PoolResolver` resolves recipe dependencies
inside the current kit). Copies stay byte-identical unless a row below says otherwise.

- **Upstream:** [`symfony/ux`](https://github.com/symfony/ux) — `src/Toolkit/kits/flowbite-4/`
- **Pinned commit:** [`f152d0ba5b403e8086e90ce8f09bcade1405e217`](https://github.com/symfony/ux/tree/f152d0ba5b403e8086e90ce8f09bcade1405e217/src/Toolkit/kits/flowbite-4) (main, 2026-10-04)
- **Toolkit used by CI:** `symfony/ux-toolkit` v3.5.1

## Copied files

| File | Notes |
|------|-------|
| 22 recipes: `alert` `avatar` `badge` `button` `button-group` `card` `checkbox` `dropdown` `indicator` `input` `kbd` `label` `modal` `pagination` `radio` `select` `skeleton` `spinner` `table` `tabs` `textarea` `toggle` (templates, controllers, READMEs, `tests/*.spec.ts`, `tests/screenshots/*.png`) | byte-identical (`diff -r` clean) except the files under *Deviations* |
| `kit.css` | the contrast fixes below; `theme/assets/styles/flowbite-xor.css` is the same file |
| `kit.js` | no `import 'flowbite'`, see below |
| `icon.svg` | byte-identical |
| `INSTALL.md` | adapted, see below |

**Recipes: byte-identical except the files under *Deviations*.** The copied screenshots are the visual-regression baseline: the demo renders
every README example like upstream's preview app (`demo/templates/preview.html.twig`) and Playwright
compares it in upstream's browser image, `mcr.microsoft.com/playwright:v1.58.2-noble` (217/217 tests
pass, all 200 PNGs). Demo-side support copied from upstream (not part of the kit):
`demo/assets/icons/{flowbite,tabler}/*.svg` (from `src/Toolkit/tests/Fixtures/icons`) and
`tests/e2e/examples/{fixtures.ts,examples.spec.ts,placeholder.png}` (ported from
`src/Toolkit/assets/test/browser`).

## Deviations

| File | Change | Reason | Upstream PR |
|------|--------|--------|-------------|
| `modal/manifest.json` | Declares `"recipe": ["button"]` | `Modal:Content` renders `<twig:Button>` (close button, on by default), so `ux:install modal` alone installed a modal that fails to render | candidate (upstream bug) |
| `pagination/manifest.json` | Declares `"recipe": ["button"]` | every `Pagination:Link` renders `<twig:Button>`, so `ux:install pagination` alone failed to render | candidate (upstream bug) |
| `kit.css` | `brand-medium` → blue-500 (light, was blue-200) and blue-500 (dark, was blue-900) | Its only use is the button focus ring (`focus:ring-brand-medium`), which was 1.4:1 (light) / 1.9:1 (dark) on the page; now 3.8:1 / 5.4:1 (≥ 3:1). Retuning the token keeps every recipe byte-identical | candidate |
| `kit.css` | dark `fg-brand-strong` → blue-300 (was blue-400) | Brand badge/alert text on `brand-soft` was 3.9:1; now 5.7:1 | candidate |
| `kit.css` | dark `success` → emerald-700 (was emerald-600) | White text on the success button was 3.7:1; now 5.4:1 (same token as light) | candidate |
| `kit.css` | `warning` → orange-700 (light, was orange-500; dark, was orange-600); `warning-strong` → orange-800 (was orange-700) | White text on the warning button and indicator was 2.9:1 / 3.6:1; now 5.2:1. The hover stays darker than the button | candidate |
| `kit.css` | dark `success-strong` → emerald-800 (was emerald-700) | Keeps the success button hover darker than dark `success` (now emerald-700) | candidate |
| `kit.css` | Adds an unlayered `.turbo-progress-bar` rule: Turbo Drive's progress bar in the brand color | The `layouts` recipe had it as an inline `<style>`. With a Content Security Policy nonce per request, Turbo reports that `<style>` of every page it fetches as a violation, its nonce being the new request's; a stylesheet needs no nonce | n/a (kit-specific) |
| `button/templates/components/Button.html.twig` | `outline-success`/`outline-warning`/`outline-danger` text: `text-success`/`text-warning`/`text-danger` → `text-fg-success`/`text-fg-warning`/`text-fg-danger` | One token can't serve both white text on a solid button (needs a dark ground) and colored text on the dark page (needs a light color). The outline labels now use the `fg-*` text roles (dark: 5.5:1 / 9.3:1 / 5.4:1; `text-danger` was 3.3:1) | candidate |
| `button/tests/screenshots/outline-buttons-{light,dark}.png` | Re-generated | Outline labels use the `fg-*` roles (above) | n/a (follows the template) |
| `button/templates/components/Button.html.twig` | `as` is lower-cased and kept only when it is `button` or `a`; any other value renders a `button`. The `##` line lists the accepted tags | `<{{ as }}` escapes HTML but does not check a tag name: `as="img src=x onerror=…"` rendered a working event handler and `as="script"` ran the content. Every README example and demo page renders the same HTML, so no screenshot changes | candidate (flowbite-4 and shadcn; bootstrap already guards its tags this way) |
| `badge/templates/components/Badge.html.twig` | The same check of `as`: `div`, `span` or `a`, otherwise `div` | As for `Button` above | candidate |
| `avatar/templates/components/Avatar/GroupCount.html.twig` | The same check of `as`: `div`, `a` or `button`, otherwise `div` | As for `Button` above | candidate |
| `card/templates/components/Card/Title.html.twig` | The same check of `as`: `span`, `div`, `p` or `h1`–`h6`, otherwise `span` | As for `Button` above | candidate |
| `dropdown/templates/components/Dropdown/Item.html.twig` | The same check of `as`: `a` or `button`, otherwise `a` (an upper-case `BUTTON` now also gets `type="button"`) | As for `Button` above | candidate |
| `modal/tests/screenshots/{default-open,opened-by-default,opened-by-default-open-after-move}-{light,dark}.png` | Re-generated | The open modal autofocuses its primary button: its focus ring is now the visible blue-500 (`kit.css` `brand-medium` above). No other screenshot changed | n/a (follows `kit.css`) |
| `alert/assets/controllers/alert_controller.js` | Rewritten without `import { Dismiss } from 'flowbite'` | The kit ships no Flowbite JavaScript: behavior lives in Stimulus controllers. Same target and action, same fade (`transition-opacity duration-300 ease-out opacity-0`, then `hidden` after 300 ms); timer cleared in `disconnect()`. Upstream specs and screenshots unchanged | candidate |
| `dropdown/assets/controllers/dropdown_controller.js` | Rewritten without `import { Dropdown } from 'flowbite'` (and Popper) | The kit ships no Flowbite JavaScript. Same targets, values and keyboard handling. Placement reproduces Popper's (absolute + `translate`, offset, flip, shift along the trigger), so the open-dropdown screenshots match upstream's. Every listener is removed on close/disconnect | candidate |
| `tabs/assets/controllers/tabs_controller.js` | Removes `aria-controls` when the referenced panel does not exist | Tab lists without panels (README examples) pointed `aria-controls` at missing ids (axe `aria-valid-attr-value`, critical) | candidate |
| `avatar/templates/components/Avatar/Image.html.twig` | The inline `onload` handler is replaced by the `avatar` controller: `data-controller="avatar"` and `data-action="load->avatar#show error->avatar#hide"`, merged with the caller's by `attributes.defaults` | A Content Security Policy blocks an inline event handler unless it allows `'unsafe-inline'`, or the handler's hash with `'unsafe-hashes'`: a nonce does not cover it, so under a strict policy the image never showed. The kit's behavior lives in Stimulus controllers. Screenshots unchanged | candidate (flowbite-4 and shadcn have the same `onload`) |
| `avatar/assets/controllers/avatar_controller.js` | New: shows the image and hides the fallback on `load`, or in `connect()` when the image has already loaded (browser cache, Turbo snapshot); `error` shows the fallback again | Replaces the `onload` above. The image now appears once Stimulus has started, at the latest when the page has loaded (`tests/e2e/avatar.spec.ts`) | candidate |
| `avatar/manifest.json` | `copy-files` adds `"assets/": "assets/"` | Installs the controller above | candidate |
| `select/templates/components/Select.html.twig`, `textarea/templates/components/Textarea.html.twig` | Add `Input`'s `aria-invalid:` classes (danger background, border, text, focus ring) | `Input` shows the invalid state, `Select` and `Textarea` did not; the form theme sets `aria-invalid` on every control with errors | candidate |
| `kit.js` | No `import 'flowbite'` | The kit ships no Flowbite JavaScript: behavior lives in Stimulus controllers | candidate |
| `manifest.json` (kit) | `importmap` dependency is only `flowbite/dist/flowbite.min.css` (no `flowbite` JS) | Evidence: with the stylesheet alone the demo passes every test (examples 219, smoke + lab + a11y); without it 43 screenshots change (form controls' base styles). `npm: flowbite` stays for Encore | candidate |
| `avatar/README.md` *User dropdown*, `dropdown/README.md` *With icon*, `input/README.md` *Disabled* | Trigger is a `Button` with `aria-label` (was an `Avatar` span); icon-only triggers and unlabeled inputs get `aria-label` | axe critical: `aria-allowed-attr`, `button-name`, `label`. Screenshots unchanged | candidate |
| `card/README.md` *Card with form inputs* | "Create account" link is underlined | axe serious `link-in-text-block` (not distinguishable from the surrounding text). `card-with-form-inputs-{light,dark}.png` re-generated | candidate |
| `spinner/README.md` *Spinner with card* | Content dimmed by an overlay instead of `opacity-20` on the text | axe serious `color-contrast` on the dimmed text. Screenshots unchanged | candidate |
| `INSTALL.md` | Intro says what this kit and its recipes are, instead of "not every Flowbite component is available in this kit…" | It is this kit's install page | n/a (kit-specific) |
| `INSTALL.md` | Step 1 requires only Flowbite's stylesheet; upstream's step 3 (`import 'flowbite'` in `app.js`) is gone, and step 3 installs recipes with `ux:install --kit=https://github.com/xormania/flowbite-xor` instead | No Flowbite JavaScript (see `kit.js`, `manifest.json`); it is this kit's install page | n/a (kit-specific) |
| `INSTALL.md` | A *Symfony* requirement: PHP's `zip` extension, allow contrib recipes, require `symfony/twig-bundle` and `symfony/ux-twig-component` before the toolkit, `symfony/http-client` with it, then `symfony/asset-mapper` and `symfony/stimulus-bundle` | Without them a fresh skeleton fails (`Unknown "tailwind_classes" filter`, `The TwigBundle is not registered`, `non-existent service property_accessor`, `You must install "symfony/http-client"`), see *Toolkit findings*, and no recipe's Stimulus controller is loaded | candidate |
| `INSTALL.md` | *Tailwind CSS* section: asks for major version 4 and names `tailwind:build --watch` | The theme needs Tailwind CSS v4, and without a build there is no CSS | candidate |
| `INSTALL.md` | Step 2 installs the `theme` recipe and imports `flowbite-xor.css` instead of pasting Flowbite's theme block | One source for the theme, with the contrast fixes | n/a (kit-specific) |

## Toolkit findings

Behavior of the toolkit itself that this repository works around, with candidate upstream changes.

| Finding | Workaround here | Upstream |
|---------|-----------------|----------|
| `ux-toolkit-kit-lint` (`MissingRecipeManifestChecker`, v3.5.x and main) reports every top-level directory without a `manifest.json` as an error, dot directories included (`.git/`, `.github/`), so a kit repository with a demo app, tools or CI config cannot lint its root. | CI lints the exported kit (`git archive HEAD`, honoring `.gitattributes` `export-ignore`): the same tree GitHub's archive gives `ux:install`. | not opened yet — candidate: skip dot directories and `export-ignore`d paths |
| `data-turbo-permanent` keeps an element's node across Turbo Drive visits but not its scroll position (Chromium resets the scroll of a re-inserted element; `tests/e2e/lab.turbo-nav.spec.ts`). | A permanent element that must keep its scroll restores it from its controller: the sidebar remembers the position on `scroll` and restores it in `connect()` (`disconnect()` runs after the re-insert, too late to read it). `tests/e2e/lab.turbo-nav.spec.ts` covers both. | n/a (browser behavior) |
| The toolkit refuses to load a kit without any recipe ("No recipes found"). | A `placeholder` recipe until the first copied recipes landed. | none needed |
| `symfony/ux-toolkit` v3.5.1 `Recipe::getExamples()` returns no example ids; main (f152d0b) names each example after the heading above it, and the screenshots use those ids. | `demo/src/Kit/KitReader.php` ports main's algorithm. | released in the next toolkit version; switch back then |
| `Avatar:Fallback` renders its icon without a size class, so it relies on ux-icons having no default `width`/`height`. The ux-icons Flex recipe sets both to `1em`, so a real project shows a smaller icon than upstream's preview. | The demo drops the default size (`demo/config/packages/ux_icons.yaml`), as upstream's preview app does. | candidate: size the fallback icon explicitly |
| `flowbite.min.css` (4.0.2) defines `--spacing-2xl: 16rem` and compiles `.max-w-2xl` to `max-width: var(--spacing-2xl)`, so with the kit's required CSS `max-w-2xl` is 16rem, not Tailwind's 42rem. `max-w-xs`…`max-w-xl` are unaffected. | flowbite-xor recipes and README examples do not use `max-w-2xl`. | Flowbite, not the toolkit; not reported yet |
| `flowbite.min.css` is imported after `tailwindcss` (INSTALL.md), so its copies of utilities come last in the `utilities` layer: a variant class it lacks loses to a base class it has on the same element (`flex max-md:hidden` stays `flex`). Found with the sidebar. | flowbite-xor recipes raise the variant's specificity (`max-md:not-data-mobile-open:hidden`), use `!`, or avoid the pair (breadcrumb keeps `gap-1`). | candidate: document it in the official INSTALL.md |
| The toolkit knows two recipe types, `component` and `block` (`RecipeType`, v3.5.1 and main); the schema has no type for a form theme, a stylesheet or a layout. | `theme` and `form-theme` are `component` recipes that install a stylesheet and a form theme. | candidate: a generic type (e.g. `file`) for recipes that only copy files |
| On a fresh skeleton, `composer require --dev symfony/ux-toolkit` brings `symfony/ux-twig-component` and `symfony/property-access` as dev-only packages: `ContainerBuilder::willBeAvailable()` then keeps FrameworkBundle's `property_access` off, while Flex registers TwigComponentBundle for every environment, so `cache:clear` fails ("non-existent service property_accessor"). Found by the fresh-install check. | README and INSTALL.md: require `symfony/ux-twig-component` before the toolkit; `tools/tests/fresh-install.sh` does. | candidate: the toolkit docs, or `symfony/ux-twig-component` as a non-dev requirement of the project in the toolkit's Flex recipe |
| `tales-from-a-dev/twig-tailwind-extra` (the `tailwind_classes` filter of every recipe, here and upstream) registers its bundle through a contrib recipe, which a fresh skeleton does not apply (`allow-contrib: false`): every component fails with `Unknown "tailwind_classes" filter`. | README and INSTALL.md: `composer config extra.symfony.allow-contrib true` first; the fresh-install check does. | candidate: the official kit's INSTALL.md |
| `ux:install` prints the `composer require` command with each recipe's constraints as they are: a constraint holding a shell metacharacter (`symfony/form:^7.4\|^8.0`) pipes the pasted line into another command, so most packages are never required. Found in review. | Recipes declare such packages without a constraint (`symfony/form`), or with one range (`^3.5`); the fresh-install check runs the printed commands through a shell. | candidate: quote the arguments in the printed command |
| `symfony/ux-toolkit` has `symfony/http-client` in `require-dev` only, but needs it to download a kit from GitHub (`--kit=https://github.com/…`): `You must install "symfony/http-client"`. And `symfony/ux-twig-component` does not require `symfony/twig-bundle`, which its bundle needs (`The TwigBundle is not registered`). | README and INSTALL.md: require them with the toolkit and before it; the fresh-install check does. | candidate: the toolkit docs |
| `GitHubRegistry` downloads `archive/<version>.zip` and expects the folder inside to be `<repo>-<version>`. GitHub names it after the full commit SHA for a short SHA, and drops the `v` of a `v1.2.3` tag, so `--kit=…:v1.2.3` and short SHAs fail ("Unable to extract the archive"). Same on `main`. Found in review. | Release tags without a `v` (`0.1.0`); the README asks for full SHAs. | candidate: find the extracted folder instead of guessing its name |
| Symfony 7.4: the route cache depends on the compiled container through a `FileResource` (`filemtime <= timestamp`, one-second resolution), and `routing.controllers` (`AttributeServicesLoader`) adds no resource for the list of controllers. When `cache:clear`'s own boot rebuilds the container in the same second as the previous build, it takes the "Cache is fresh" branch and keeps the old routes: a controller added in that second answers 404 (the welcome page). Found by the fresh-install check, which failed once in two runs. | `tools/tests/fresh-install.sh` deletes `var/cache` and runs `cache:warmup`. | Symfony, not the toolkit; not reported yet |

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
