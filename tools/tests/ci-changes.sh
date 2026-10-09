#!/usr/bin/env bash
#
# tools/ci-changes.sh: for each change below, the CI jobs it runs. A job missing from a case's list must be skipped.
# check takes the changed paths; check_git makes the change in a scratch repository and reads its paths as CI does
# (git diff --name-only --no-renames), so a deletion or a rename is classified by every path it touches.

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

# the change, as git commands run in a scratch repository holding every workflow of this one
check_git() {
    local expected="$1" change="$2"
    local repo actual
    repo=$(mktemp -d)
    (
        cd "$repo"
        git init -q && mkdir -p .github/workflows
        cp "$OLDPWD"/.github/workflows/*.yml .github/workflows/
        git add -A && git -c user.name=t -c user.email=t@t commit -qm base
        eval "$change"
        git -c user.name=t -c user.email=t@t commit -qam change
    )
    actual=$(git -C "$repo" diff --name-only --no-renames HEAD^ HEAD | tools/ci-changes.sh | sed -n 's/=true$//p' | paste -sd ' ' -)
    rm -rf "$repo"
    if [ "$actual" != "$expected" ]; then
        echo "FAIL: $change -> '$actual', expected '$expected'"
        failures=$((failures + 1))
    fi
}

all='lint-kit php static-site fresh-install contrast demo workflows'
kit='lint-kit php static-site fresh-install demo'
kit_contrast='lint-kit php static-site fresh-install contrast demo'

# Read by people only
check ''                          LICENSE NOTICE .github/dependabot.yml

# Read by people and agents: Contrast checks the generated lists, the plans and what the markdown teaches
check 'contrast'                  docs/TESTING.md CHANGELOG.md FOR-AGENTS.md .github/pull_request_template.md
check 'contrast'                  docs/ROADMAP.md CONTRIBUTING.md AGENTS.md
check 'contrast'                  tools/docs-lint.mjs tools/llms-txt.mjs llms.txt
check 'contrast'                  tools/test-inventory.mjs
check 'static-site contrast'      tools/fence-coverage.mjs
check "$kit_contrast"             INSTALL.md

# A workflow: actionlint reads it, and the jobs that run what it runs check that part (a workflow's own triggers run
# the rest: audit.yml and codeql.yml run on the pull request that changes them)
check 'static-site workflows'     .github/workflows/pages.yml
check 'static-site fresh-install workflows' .github/workflows/release.yml
check 'workflows'                 .github/workflows/audit.yml
check 'workflows'                 .github/workflows/codeql.yml
check 'workflows'                 .github/actionlint.yaml
check "$all"                      .github/workflows/ci.yml
check "$all"                      .github/workflows/nightly.yml
check "$all"                      .github/actions/setup/action.yml
check_git 'static-site workflows' 'git rm -q .github/workflows/pages.yml'
check_git 'workflows'             'git rm -q .github/workflows/codeql.yml'
check_git "$all"                  'git mv .github/workflows/pages.yml .github/workflows/site.yml'
check_git "$all"                  'git mv .github/workflows/ci.yml .github/workflows/checks.yml'

# A path no rule names is part of the kit
# A manifest makes a directory a recipe, which the inventory check (Contrast) reads
check "$kit_contrast"             new-recipe/manifest.json
check "$kit_contrast"             tabs/manifest.json
check "$kit"                      some-new-file.txt

check "$all"                      tools/ci-changes.sh
check 'workflows'                 tools/release-plan.sh
check 'workflows'                 tools/tests/release-plan.sh
# tools/test-inventory.mjs (Contrast) reads which specs and PHPUnit tests exist, the lab's routes and the recipes'
# controllers; a helper or a baseline it does not read
check 'contrast demo'             tests/e2e/lab.side-nav.spec.ts
check 'demo'                      tests/e2e/transitions.ts
check 'contrast demo'             tabs/tests/tabs.spec.ts
check 'demo'                      alert/tests/screenshots/default-light.png
check 'php static-site contrast demo' demo/tests/Editor/EditorTypeTest.php
check 'php static-site contrast demo' demo/src/Controller/LabController.php
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
check "$kit_contrast"             side-nav/assets/controllers/side_nav_controller.js
check "$kit_contrast"             side-nav/README.md
check "$kit_contrast"             kit.css
check "$kit"                      .gitattributes
check "$kit_contrast"             docs/NOTES.md kit.css

if [ "$failures" -gt 0 ]; then
    exit 1
fi
echo 'ci-changes: every case runs the expected jobs'
