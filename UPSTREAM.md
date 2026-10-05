# Upstream tracking

This kit carries its own copies of the official Symfony UX Toolkit `flowbite-4` kit, because a
recipe can only depend on recipes of its own kit (`PoolResolver` resolves recipe dependencies
inside the current kit). Copies stay byte-identical unless a row below says otherwise.

- **Upstream:** [`symfony/ux`](https://github.com/symfony/ux) — `src/Toolkit/kits/flowbite-4/`
- **Pinned commit:** [`f152d0ba5b403e8086e90ce8f09bcade1405e217`](https://github.com/symfony/ux/tree/f152d0ba5b403e8086e90ce8f09bcade1405e217/src/Toolkit/kits/flowbite-4) (main, 2026-10-04)
- **Toolkit used by CI:** `symfony/ux-toolkit` v3.5.1

## Copied files

| File | Since | Notes |
|------|-------|-------|
| 22 recipes: `alert` `avatar` `badge` `button` `button-group` `card` `checkbox` `dropdown` `indicator` `input` `kbd` `label` `modal` `pagination` `radio` `select` `skeleton` `spinner` `table` `tabs` `textarea` `toggle` (templates, controllers, READMEs, `tests/*.spec.ts`, `tests/screenshots/*.png`) | Phase 1 | byte-identical (`diff -r` clean) |
| `kit.css` | Phase 1 | byte-identical until Phase 2's contrast fixes (see Deviations); `theme/assets/styles/flowbite-xor.css` is the same file |
| `kit.js` | Phase 1 | byte-identical |
| `icon.svg` | Phase 0 | byte-identical |
| `INSTALL.md` | Phase 0 | adapted, see below |

**Recipes: byte-identical except the two manifest fixes below.** The copied screenshots are the visual-regression baseline: the demo renders
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
| `button/templates/components/Button.html.twig` | `outline-success`/`outline-warning`/`outline-danger` text: `text-success`/`text-warning`/`text-danger` → `text-fg-success`/`text-fg-warning`/`text-fg-danger` | One token can't serve both white text on a solid button (needs a dark ground) and colored text on the dark page (needs a light color). The outline labels now use the `fg-*` text roles (dark: 5.5:1 / 9.3:1 / 5.4:1; `text-danger` was 3.3:1) | candidate |
| `button/tests/screenshots/outline-buttons-{light,dark}.png` | Re-generated | Outline labels use the `fg-*` roles (above) | n/a (follows the template) |
| `modal/tests/screenshots/{default-open,opened-by-default,opened-by-default-open-after-move}-{light,dark}.png` | Re-generated | The open modal autofocuses its primary button: its focus ring is now the visible blue-500 (`kit.css` `brand-medium` above). No other screenshot changed | n/a (follows `kit.css`) |
| `alert/assets/controllers/alert_controller.js` | Rewritten without `import { Dismiss } from 'flowbite'` | No global Flowbite code (plan D3). Same target and action, same fade (`transition-opacity duration-300 ease-out opacity-0`, then `hidden` after 300 ms); timer cleared in `disconnect()`. Upstream specs and screenshots unchanged | candidate |
| `dropdown/assets/controllers/dropdown_controller.js` | Rewritten without `import { Dropdown } from 'flowbite'` (and Popper) | Plan D3. Same targets, values and keyboard handling. Placement reproduces Popper's (absolute + `translate`, offset, flip, shift along the trigger), so the open-dropdown screenshots match upstream's. Every listener is removed on close/disconnect | candidate |
| `tabs/assets/controllers/tabs_controller.js` | Removes `aria-controls` when the referenced panel does not exist | Tab lists without panels (README examples) pointed `aria-controls` at missing ids (axe `aria-valid-attr-value`, critical) | candidate |
| `select/templates/components/Select.html.twig`, `textarea/templates/components/Textarea.html.twig` | Add `Input`'s `aria-invalid:` classes (danger background, border, text, focus ring) | `Input` shows the invalid state, `Select` and `Textarea` did not; the form theme sets `aria-invalid` on every control with errors | candidate |
| `kit.js` | No `import 'flowbite'` | Plan D3: behavior lives in Stimulus controllers | candidate |
| `manifest.json` (kit) | `importmap` dependency is only `flowbite/dist/flowbite.min.css` (no `flowbite` JS) | Evidence: with the stylesheet alone the demo passes every test (examples 219, smoke + lab + a11y); without it 43 screenshots change (form controls' base styles). `npm: flowbite` stays for Encore | candidate |
| `avatar/README.md` *User dropdown*, `dropdown/README.md` *With icon*, `input/README.md` *Disabled* | Trigger is a `Button` with `aria-label` (was an `Avatar` span); icon-only triggers and unlabeled inputs get `aria-label` | axe critical: `aria-allowed-attr`, `button-name`, `label`. Screenshots unchanged | candidate |
| `card/README.md` *Card with form inputs* | "Create account" link is underlined | axe serious `link-in-text-block` (not distinguishable from the surrounding text). `card-with-form-inputs-{light,dark}.png` re-generated | candidate |
| `spinner/README.md` *Spinner with card* | Content dimmed by an overlay instead of `opacity-20` on the text | axe serious `color-contrast` on the dimmed text. Screenshots unchanged | candidate |
| `INSTALL.md` | Intro names this kit and shows the `ux:install --kit=https://github.com/xormania/flowbite-xor` command, instead of "not every Flowbite component is available in this kit…" | It is this kit's install page | n/a (kit-specific) |
| `INSTALL.md` | Step 1 requires only Flowbite's stylesheet; step 3 (`import 'flowbite'` in `app.js`) is gone | No Flowbite JavaScript (see `kit.js`, `manifest.json`) | n/a (kit-specific) |
| `INSTALL.md` | A *Symfony* requirement: allow contrib recipes, require `symfony/ux-twig-component` before the toolkit | Without them a fresh skeleton fails (`Unknown "tailwind_classes" filter`, `non-existent service property_accessor`), see *Toolkit findings* | candidate |
| `INSTALL.md` | Step 2 installs the `theme` recipe and imports `flowbite-xor.css` instead of pasting Flowbite's theme block | One source for the theme, with the contrast fixes | n/a (kit-specific) |

## Toolkit findings

Behavior of the toolkit itself that this repository works around, with candidate upstream changes.

| Finding | Workaround here | Upstream |
|---------|-----------------|----------|
| `ux-toolkit-kit-lint` (`MissingRecipeManifestChecker`, v3.5.x and main) reports every top-level directory without a `manifest.json` as an error, dot directories included (`.git/`, `.github/`), so a kit repository with a demo app, tools or CI config cannot lint its root. | CI lints the exported kit (`git archive HEAD`, honoring `.gitattributes` `export-ignore`): the same tree GitHub's archive gives `ux:install`. | not opened yet — candidate: skip dot directories and `export-ignore`d paths |
| `data-turbo-permanent` keeps an element's node across Turbo Drive visits but not its scroll position (Chromium resets the scroll of a re-inserted element; `tests/e2e/lab.turbo-nav.spec.ts`). | A permanent element that must keep its scroll restores it from its controller: the sidebar remembers the position on `scroll` and restores it in `connect()` (`disconnect()` runs after the re-insert, too late to read it). `tests/e2e/lab.turbo-nav.spec.ts` covers both. | n/a (browser behavior) |
| The toolkit refuses to load a kit without any recipe ("No recipes found"). | A `placeholder` recipe in Phase 0, removed in Phase 1. | none needed |
| `symfony/ux-toolkit` v3.5.1 `Recipe::getExamples()` returns no example ids; main (f152d0b) names each example after the heading above it, and the screenshots use those ids. | `demo/src/Kit/KitReader.php` ports main's algorithm. | released in the next toolkit version; switch back then |
| `Avatar:Fallback` renders its icon without a size class, so it relies on ux-icons having no default `width`/`height`. The ux-icons Flex recipe sets both to `1em`, so a real project shows a smaller icon than upstream's preview. | The demo drops the default size (`demo/config/packages/ux_icons.yaml`), as upstream's preview app does. | candidate: size the fallback icon explicitly |
| `flowbite.min.css` (4.0.2) defines `--spacing-2xl: 16rem` and compiles `.max-w-2xl` to `max-width: var(--spacing-2xl)`, so with the kit's required CSS `max-w-2xl` is 16rem, not Tailwind's 42rem. `max-w-xs`…`max-w-xl` are unaffected. | flowbite-xor recipes and README examples do not use `max-w-2xl`. | Flowbite, not the toolkit; not reported yet |
| `flowbite.min.css` is imported after `tailwindcss` (INSTALL.md), so its copies of utilities come last in the `utilities` layer: a variant class it lacks loses to a base class it has on the same element (`flex max-md:hidden` stays `flex`). Found with the sidebar in phase 4. | flowbite-xor recipes raise the variant's specificity (`max-md:not-data-mobile-open:hidden`), use `!`, or avoid the pair (breadcrumb keeps `gap-1`). | candidate: document it in the official INSTALL.md |
| The toolkit knows two recipe types, `component` and `block` (`RecipeType`, v3.5.1 and main); the schema has no type for a form theme, a stylesheet or a layout. | `theme` and `form-theme` are `component` recipes that install a stylesheet and a form theme. | candidate: a generic type (e.g. `file`) for recipes that only copy files |
| On a fresh skeleton, `composer require --dev symfony/ux-toolkit` brings `symfony/ux-twig-component` and `symfony/property-access` as dev-only packages: `ContainerBuilder::willBeAvailable()` then keeps FrameworkBundle's `property_access` off, while Flex registers TwigComponentBundle for every environment, so `cache:clear` fails ("non-existent service property_accessor"). Found by the fresh-install check (phase 6). | README and INSTALL.md: require `symfony/ux-twig-component` before the toolkit; `tools/tests/fresh-install.sh` does. | candidate: the toolkit docs, or `symfony/ux-twig-component` as a non-dev requirement of the project in the toolkit's Flex recipe |
| `tales-from-a-dev/twig-tailwind-extra` (the `tailwind_classes` filter of every recipe, here and upstream) registers its bundle through a contrib recipe, which a fresh skeleton does not apply (`allow-contrib: false`): every component fails with `Unknown "tailwind_classes" filter`. | README and INSTALL.md: `composer config extra.symfony.allow-contrib true` first; the fresh-install check does. | candidate: the official kit's INSTALL.md |
