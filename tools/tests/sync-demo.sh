#!/usr/bin/env bash
# Checks that tools/sync-demo copies exactly what `ux:install --force` copies, is idempotent
# and deletes nothing. Runs the real installer of the demo app (needs `composer install` in demo/;
# the toolkit bundle is registered in the dev environment only).
#
# Usage: tools/tests/sync-demo.sh [<kit dir>]   (default: the fixture kit next to this script)
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
kit="$(cd "${1:-$root/tools/tests/fixtures/sync-kit}" && pwd)"
console="$root/demo/bin/console"
kits_dir="$root/demo/vendor/symfony/ux-toolkit/kits"
php="${PHP:-php}"

work="$(mktemp -d)"
link_name="sync-demo-check-$$"
cleanup() { rm -f "$kits_dir/$link_name"; rm -rf "$work"; }
trap cleanup EXIT

# The installer only reads local kits from its own kits/ directory: expose the kit there.
ln -s "$kit" "$kits_dir/$link_name"

mkdir -p "$work/installer" "$work/sync"
for manifest in "$kit"/*/manifest.json; do
    recipe="$(basename "$(dirname "$manifest")")"
    APP_ENV=dev $php "$console" ux:install "$recipe" --kit="$link_name" --force --no-interaction --destination="$work/installer" > "$work/install-$recipe.log" 2>&1 \
        || { cat "$work/install-$recipe.log"; echo "ux:install $recipe failed"; exit 1; }
done

$php "$root/tools/sync-demo" --kit="$kit" --target="$work/sync" > /dev/null

if ! diff -r "$work/installer" "$work/sync"; then
    echo "FAIL: sync-demo output differs from ux:install output"
    exit 1
fi
echo "ok: sync-demo copies the same files as ux:install ($(find "$work/sync" -type f | wc -l) file(s))"

second="$($php "$root/tools/sync-demo" --kit="$kit" --target="$work/sync")"
if ! grep -q ' 0 file(s) copied' <<< "$second"; then
    echo "FAIL: second run is not a no-op: $second"
    exit 1
fi
echo "ok: second run copies nothing"

echo 'keep me' > "$work/sync/unrelated.txt"
$php "$root/tools/sync-demo" --kit="$kit" --target="$work/sync" > /dev/null
[ "$(cat "$work/sync/unrelated.txt")" = 'keep me' ] || { echo "FAIL: unrelated file touched"; exit 1; }
echo "ok: unrelated files are left alone"
