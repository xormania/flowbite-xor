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
| `icon.svg` | Phase 0 | byte-identical |
| `INSTALL.md` | Phase 0 | adapted, see below |

The 22 base recipes, `kit.css` and `kit.js` are copied in Phase 1.

## Deviations

| File | Change | Reason | Upstream PR |
|------|--------|--------|-------------|
| `INSTALL.md` | Intro names this kit and shows the `ux:install --kit=https://github.com/xormania/flowbite-xor` command, instead of "not every Flowbite component is available in this kit…" | It is this kit's install page | n/a (kit-specific) |

## Toolkit findings

Behavior of the toolkit itself that this repository works around, with candidate upstream changes.

| Finding | Workaround here | Upstream |
|---------|-----------------|----------|
| `ux-toolkit-kit-lint` (`MissingRecipeManifestChecker`, v3.5.x and main) reports every top-level directory without a `manifest.json` as an error, dot directories included (`.git/`, `.github/`), so a kit repository with a demo app, tools or CI config cannot lint its root. | CI lints the exported kit (`git archive HEAD`, honoring `.gitattributes` `export-ignore`): the same tree GitHub's archive gives `ux:install`. | not opened yet — candidate: skip dot directories and `export-ignore`d paths |
| The toolkit refuses to load a kit without any recipe ("No recipes found"). | A `placeholder` recipe until the base recipes land. | none needed |
