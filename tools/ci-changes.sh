#!/usr/bin/env bash
#
# Which CI jobs a change could affect. Reads the changed paths, one per line, on stdin and prints one
# `<job>=true|false` line per job of .github/workflows/ci.yml, for $GITHUB_OUTPUT. A job is skipped only when none of
# the paths could change what it checks. A path not listed counts as part of the kit, which runs every job but
# Contrast and Workflows. A workflow runs Workflows (actionlint) and the jobs that run the same commands it runs; a
# workflow or a file under .github/ that is not listed runs everything.
#
# Usage: git diff --name-only --no-renames <base> HEAD | tools/ci-changes.sh
# Test:  tools/tests/ci-changes.sh

set -euo pipefail

jobs=(lint-kit php static-site fresh-install contrast demo workflows)
declare -A run
for job in "${jobs[@]}"; do run[$job]=false; done

all() { for job in "${jobs[@]}"; do run[$job]=true; done; }
on() { for job in "$@"; do run[$job]=true; done; }

while IFS= read -r path; do
    [ -n "$path" ] || continue
    case "$path" in
        # The workflow and this script decide what runs: a change to either runs everything
        .github/workflows/ci.yml | tools/ci-changes.sh | tools/tests/ci-changes.sh) all ;;

        # Read by people only: no job checks them
        docs/* | CHANGELOG.md | CONTRIBUTING.md | FOR-AGENTS.md | AGENTS.md | SECURITY.md | LICENSE | NOTICE) ;;
        .github/pull_request_template.md | .github/dependabot.yml) ;;

        # The other workflows. CI cannot run them (they deploy, tag or upload), so it runs the jobs that run what they
        # run: pages.yml builds the static site, release.yml checks the install from GitHub (docker-install.sh) and
        # calls pages.yml. audit.yml and codeql.yml run themselves on the pull request that changes them.
        .github/workflows/pages.yml) on static-site workflows ;;
        .github/workflows/release.yml) on static-site fresh-install workflows ;;
        .github/workflows/audit.yml | .github/workflows/codeql.yml | .github/actionlint.yaml) on workflows ;;
        .github/*) all ;;

        # The browser tests and their tools
        tests/* | playwright.config.ts) on demo ;;
        package.json | package-lock.json) on contrast demo ;;

        # Repository tools, each with the jobs that run it
        tools/contrast/* | tools/llms-txt.mjs | llms.txt) on contrast ;;
        tools/tests/fresh-install.sh | tools/tests/check-fresh-app.sh | tools/tests/docker-install.sh) on fresh-install ;;
        tools/tests/live-action.php | tools/tests/fixtures/fresh-app/*) on fresh-install ;;
        tools/tests/sync-demo.sh | tools/tests/fixtures/sync-kit/*) on demo ;;
        tools/phpstan.neon) on php ;;
        tools/*) on php static-site demo ;;

        # The demo app: its PHP tests, its static export and the browser tests run against it. docker-install.sh copies
        # the demo's Compose file and Caddyfile into a fresh Symfony Docker project.
        demo/compose.yaml | demo/frankenphp/Caddyfile) on php static-site demo fresh-install ;;
        demo/*) on php static-site demo ;;

        # A recipe's own tests (upstream specs, screenshot baselines): only the browser tests read them
        */tests/*) on demo ;;

        # Anything else is part of the kit (recipes, kit.css, kit.js, manifest.json, README.md, .gitattributes...)
        *)
            on lint-kit php static-site fresh-install demo
            case "$path" in
                kit.css | theme/* | README.md | */README.md) on contrast ;;
            esac
            ;;
    esac
done

for job in "${jobs[@]}"; do echo "$job=${run[$job]}"; done
