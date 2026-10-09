#!/usr/bin/env bash
#
# The commit a push's changes are counted from: where the branch left dev (git merge-base HEAD origin/dev). CI's
# Changes job routes the jobs from the changes since it (tools/ci-changes.sh) and hands it to Contrast, whose
# tools/readme-pairing.mjs reads the same range; run locally, tools/readme-pairing.mjs asks this script. Prints
# nothing for a push to main or dev, a run by hand, or a HEAD with no history shared with origin/dev: those check
# everything, and have no range.
#
# Usage: tools/ci-base.sh   (EVENT: the GitHub event, default push; REF: the pushed ref, default the checked-out branch)

set -euo pipefail

event=${EVENT:-push}
ref=${REF:-$(git symbolic-ref -q HEAD || true)}
if [ "$event" = push ] && [ "$ref" != refs/heads/main ] && [ "$ref" != refs/heads/dev ]; then
    git merge-base HEAD origin/dev 2>/dev/null || true
fi
