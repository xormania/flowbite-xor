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
| `INSTALL.md` | Intro names this kit and shows the `ux:install --kit=https://github.com/xormania/flowbite-xor` command, instead of "not every Flowbite component is available in this kit…" | It is this kit's install page | n/a (kit-specific) |
| `INSTALL.md` | Step 2 installs the `theme` recipe and imports `flowbite-xor.css` instead of pasting Flowbite's theme block | One source for the theme, with the contrast fixes | n/a (kit-specific) |

## Toolkit findings

Behavior of the toolkit itself that this repository works around, with candidate upstream changes.

| Finding | Workaround here | Upstream |
|---------|-----------------|----------|
| `ux-toolkit-kit-lint` (`MissingRecipeManifestChecker`, v3.5.x and main) reports every top-level directory without a `manifest.json` as an error, dot directories included (`.git/`, `.github/`), so a kit repository with a demo app, tools or CI config cannot lint its root. | CI lints the exported kit (`git archive HEAD`, honoring `.gitattributes` `export-ignore`): the same tree GitHub's archive gives `ux:install`. | not opened yet — candidate: skip dot directories and `export-ignore`d paths |
| The toolkit refuses to load a kit without any recipe ("No recipes found"). | A `placeholder` recipe in Phase 0, removed in Phase 1. | none needed |
| `symfony/ux-toolkit` v3.5.1 `Recipe::getExamples()` returns no example ids; main (f152d0b) names each example after the heading above it, and the screenshots use those ids. | `demo/src/Kit/KitReader.php` ports main's algorithm. | released in the next toolkit version; switch back then |
| `Avatar:Fallback` renders its icon without a size class, so it relies on ux-icons having no default `width`/`height`. The ux-icons Flex recipe sets both to `1em`, so a real project shows a smaller icon than upstream's preview. | The demo drops the default size (`demo/config/packages/ux_icons.yaml`), as upstream's preview app does. | candidate: size the fallback icon explicitly |
