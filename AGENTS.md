# AGENTS.md

Instructions for coding agents working on this repository, a Symfony UX Toolkit kit.

- Follow [`CONTRIBUTING.md`](CONTRIBUTING.md): conventions, adding a recipe, checks, commit and pull request
  standard. The same rules apply to people.
- The official `flowbite-4` kit is a reference, not a constraint: change a copied recipe when this kit needs it, and
  give every deviation a row in [`UPSTREAM.md`](UPSTREAM.md).
- Behavior lives in Stimulus controllers only: no `import 'flowbite'`, no `initFlowbite()`.
- Run the checks in `CONTRIBUTING.md` that cover your change before pushing; CI runs all of them.
- Never update screenshot baselines as a side effect, and never commit `demo/vendor/`, `demo/var/`,
  `demo/public/assets/`, `demo/assets/vendor/`, `node_modules/` or Playwright output (`test-results/`,
  `playwright-report/`).
- Commits and pull requests: plain words, the `type(scope): what changes` format, the pull request template,
  no AI attribution lines.
