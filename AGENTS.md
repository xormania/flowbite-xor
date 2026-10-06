# AGENTS.md — working on flowbite-xor

Rules for agents (and humans) changing this repository. [`docs/PLAN.md`](docs/PLAN.md) records how the kit
was planned and why (the targets, the decisions and their reasons); follow its decisions unless a change is agreed.

## What this repository is

A Symfony UX Toolkit kit: `manifest.json` at the root, one recipe per top-level directory holding a
`manifest.json`. `demo/`, `tools/`, `tests/`, `docs/` and `.github/` are not part of the kit and are
`export-ignore`d (see `.gitattributes`); keep any new non-kit path out of the archive the same way.

## Rules

- **Byte-identical copies.** Recipes copied from `symfony/ux` `src/Toolkit/kits/flowbite-4` stay
  byte-identical to the commit pinned in `UPSTREAM.md`. Every deviation gets a row in `UPSTREAM.md`
  (file, change, reason, upstream PR).
- **Behavior in Stimulus only.** No `import 'flowbite'` global init in recipes. Controllers: idempotent
  `connect()`, full cleanup in `disconnect()`, no global state, no `DOMContentLoaded`/`turbo:load`.
- **Recipe conventions** (checked by `ux-toolkit-kit-lint`): `manifest.json` with `type` and `name`,
  `README.md` opening with `# Title` then a one-line summary, `{% props %}` documented with `##`,
  blocks documented with `{##- … -#}`, root element `attributes.defaults({...|tailwind_classes})`,
  variants with `html_cva`.
- **Naming.** Recipe folders lower-kebab (`stat-card`), components PascalCase (`StatCard`, parts
  `StatCard:Trend`), controllers `snake_controller.js` ↔ kebab identifier. Official recipe and
  controller names stay unchanged.
- **Colors** only through Flowbite role utilities (`bg-brand`, `text-heading`, `border-default`…).
- **CSS order.** `flowbite.min.css` loads after Tailwind's utilities and wins ties: a variant it lacks loses to a base
  utility it has (`flex max-md:hidden` stays `flex`), and its `max-w-2xl` is 16rem. Raise the variant's specificity
  or use `!`, and check the computed style (see `UPSTREAM.md` → *Toolkit findings*).
- **Twig inside components.** In a component's content (`<twig:X>…</twig:X>`), `block('name')` and `{% block %}`
  belong to the component: reach the surrounding template's blocks with `block(outerBlocks.name)`.
- **Turbo forms.** A submitted form answers with a redirect (303) when it succeeds and 422 when it shows errors;
  Turbo Drive rejects a 200.
- **Never commit** `demo/vendor/`, `demo/var/`, `demo/public/assets/`, `demo/assets/vendor/`,
  `node_modules/`, Playwright output (`test-results/`, `playwright-report/`).
- **Commits:** Conventional Commits (`feat(sidebar): …`, `chore(demo): …`). One PR per topic.

## Adding a recipe

1. Create `<recipe>/manifest.json`: `type` (`component`, or `block` for a page section), `name` (the
   component name), `copy-files`, and `dependencies` (`recipe` for kit recipes it uses, `composer` for
   packages: `tailwind_classes` needs `tales-from-a-dev/twig-tailwind-extra`, `html_cva` needs
   `twig/html-extra`, components need `symfony/ux-twig-component:^3.5`). Copy the `$schema` line from
   another recipe.
2. Add the files under the paths `copy-files` maps: `templates/components/<Name>.html.twig` (parts in
   `templates/components/<Name>/`), `assets/controllers/<snake>_controller.js` for behavior.
3. Write `README.md`: `# Title`, a one-line summary, then a ```` ```twig {"preview":true} ```` example,
   `## Installation` with `::: installation`, `## Usage`, more examples under `##`/`###` headings. Every
   ```` ```twig {…} ```` block is a demo preview and a screenshot test.
4. `tools/sync-demo`, then open `/r/<recipe>` and `/preview/<recipe>/<example>?theme=dark` in the demo.
5. Record the screenshots (`npx playwright test --project=examples --update-snapshots`, browser in Docker),
   review them, and commit them with the recipe.
6. Behavior gets a spec in `tests/e2e/` (a `/lab` page when it must survive Turbo or Live re-renders);
   new color pairs go in `tools/contrast/pairs.json`.
7. Add the recipe to the index in `README.md`, commit, and lint the exported kit (below).

## Commands

```bash
tools/sync-demo                 # copy every recipe into demo/ (like ux:install --force); idempotent, deletes nothing
tools/tests/sync-demo.sh        # proves sync-demo == ux:install (needs demo/vendor)
node tools/contrast/check.mjs   # theme contrast gate; kit.css and theme/assets/styles/flowbite-xor.css stay identical
tools/tests/fresh-install.sh    # fresh skeleton + ux:install dashboard-home from the exported kit renders (PHP=… COMPOSER_BIN=…)

# lint the kit as users download it
tmp=$(mktemp -d) && git archive HEAD | tar -x -C "$tmp" && demo/vendor/bin/ux-toolkit-kit-lint "$tmp"
demo/vendor/bin/ux-toolkit-kit-debug .   # what the toolkit sees

(cd demo && composer install && php bin/console tailwind:build)
npx playwright test             # smoke + lab (Turbo/Live) + axe on every demo page + README screenshots + recipe specs (needs Docker)
```

`git archive` exports committed files only: commit before linting.

## Screenshots

`<recipe>/tests/screenshots/*.png` are the visual-regression baseline (byte-identical upstream copies
for base recipes). Never update them as a side effect: a visual change is a deliberate commit made
with `npx playwright test --project=examples --update-snapshots` (browser in Docker, same image as CI),
reviewed, and logged in `UPSTREAM.md` when it touches a copied recipe. Icons used by recipes are
committed under `demo/assets/icons/` (Iconify on-demand is off in the demo).
