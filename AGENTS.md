# AGENTS.md — working on flowbite-xor

Rules for agents (and humans) changing this repository. The build plan, [`docs/PLAN.md`](docs/PLAN.md),
is the source of truth; its §1 decisions are settled.

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
- **Never commit** `demo/vendor/`, `demo/var/`, `demo/public/assets/`, `demo/assets/vendor/`,
  `node_modules/`, Playwright output (`test-results/`, `playwright-report/`).
- **Commits:** Conventional Commits (`feat(sidebar): …`, `chore(demo): …`). One PR per plan phase.

## Commands

```bash
tools/sync-demo                 # copy every recipe into demo/ (like ux:install --force); idempotent, deletes nothing
tools/tests/sync-demo.sh        # proves sync-demo == ux:install (needs demo/vendor)

# lint the kit as users download it
tmp=$(mktemp -d) && git archive HEAD | tar -x -C "$tmp" && demo/vendor/bin/ux-toolkit-kit-lint "$tmp"
demo/vendor/bin/ux-toolkit-kit-debug .   # what the toolkit sees

(cd demo && composer install && php bin/console importmap:install && php bin/console tailwind:build)
npx playwright test             # e2e against the demo (tests/e2e/)
```

`git archive` exports committed files only: commit before linting.
