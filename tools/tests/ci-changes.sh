#!/usr/bin/env bash
#
# tools/ci-changes.sh: for each change below, the CI jobs it runs. A job missing from a case's list must be skipped.

set -euo pipefail
cd "$(dirname "$0")/../.."

failures=0
check() {
    local expected="$1"; shift
    local actual
    actual=$(printf '%s\n' "$@" | tools/ci-changes.sh | sed -n 's/=true$//p' | paste -sd ' ' -)
    if [ "$actual" != "$expected" ]; then
        echo "FAIL: $* -> '$actual', expected '$expected'"
        failures=$((failures + 1))
    fi
}

all='lint-kit php static-site fresh-install contrast demo'
kit='lint-kit php static-site fresh-install demo'

check ''                          LICENSE .github/dependabot.yml
check 'contrast'                  .github/pull_request_template.md tools/docs-lint.mjs
check "$all"                      INSTALL.md
check 'contrast'                  docs/TESTING.md CHANGELOG.md FOR-AGENTS.md
check ''                          .github/workflows/audit.yml
check "$all"                      .github/workflows/ci.yml
check "$all"                      tools/ci-changes.sh
check 'demo'                      tests/e2e/lab.side-nav.spec.ts
check 'demo'                      alert/tests/screenshots/default-light.png
check 'contrast demo'             package-lock.json
check 'contrast'                  tools/contrast/pairs.json
check 'php static-site demo'      demo/src/Demo/DataTableCollector.php
check 'php'                       tools/phpstan.neon
check 'fresh-install'             tools/tests/fresh-install.sh
check 'fresh-install'             tools/tests/live-action.php
check 'fresh-install'             tools/tests/fixtures/fresh-app/templates/home.html.twig
check 'demo'                      tools/tests/fixtures/sync-kit/manifest.json
check 'php static-site fresh-install demo' demo/compose.yaml
check 'php static-site fresh-install demo' demo/frankenphp/Caddyfile
check "$kit"                      side-nav/assets/controllers/side_nav_controller.js
check "$all"                      side-nav/README.md
check "$all"                      kit.css
check "$kit"                      .gitattributes
check "$all"                      docs/NOTES.md kit.css

if [ "$failures" -gt 0 ]; then
    exit 1
fi
echo 'ci-changes: every case runs the expected jobs'
