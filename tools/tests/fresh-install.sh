#!/usr/bin/env bash
# On a fresh Symfony skeleton, `ux:install dashboard-home` (which brings `layouts`) from this
# kit, as GitHub's archive gives it, yields a working dashboard page; `ux:install signup` yields a form rendered
# through the form theme without any `twig.form_themes` setting.
#
#   tools/tests/fresh-install.sh            # PHP=… COMPOSER_BIN=… to use other binaries
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
php="${PHP:-php}"
composer="${COMPOSER_BIN:-composer}"
symfony_version="${SYMFONY_VERSION:-7.4.*}"
toolkit_version="${UX_TOOLKIT_VERSION:-3.5.1}"
port="${PORT:-8100}"
work="$(mktemp -d)"
server_pid=
cleanup() { [ -n "$server_pid" ] && kill "$server_pid" 2>/dev/null || true; rm -rf "$work"; }
trap cleanup EXIT

app="$work/app"
$composer create-project --no-interaction --no-progress "symfony/skeleton:$symfony_version" "$app"
cd "$app"
$composer config platform.php "$($php -r 'echo PHP_VERSION;')"
# README.md's install steps, command for command:
# - contrib recipes: tales-from-a-dev/twig-tailwind-extra (the `tailwind_classes` filter of every recipe) registers
#   its bundle through one
# - symfony/ux-twig-component as a regular dependency, with TwigBundle (its bundle needs it): required only through
#   `--dev symfony/ux-toolkit`, its symfony/property-access is dev-only, so FrameworkBundle leaves property_access
#   off while Flex enables TwigComponentBundle in every environment, and cache:clear fails ("non-existent service
#   property_accessor")
# - symfony/http-client with the toolkit, which downloads kits from GitHub with it
# - AssetMapper (the layouts' importmap entrypoint) and StimulusBundle (it loads the recipes' controllers)
$composer config extra.symfony.allow-contrib true
$composer require --no-interaction --no-progress symfony/twig-bundle "symfony/ux-twig-component:^3.5"
$composer require --no-interaction --no-progress --dev "symfony/ux-toolkit:$toolkit_version" symfony/http-client
$composer require --no-interaction --no-progress symfony/asset-mapper symfony/stimulus-bundle

kit="vendor/symfony/ux-toolkit/kits/flowbite-xor-local"
mkdir -p "$kit"
git -C "$root" archive HEAD | tar -x -C "$kit"

for recipe in dashboard-home signup data-table data-table-live; do
    $php bin/console ux:install "$recipe" --kit=flowbite-xor-local --no-interaction > "install-$recipe.log" 2>&1 \
        || { cat "install-$recipe.log"; echo "FAIL: ux:install $recipe"; exit 1; }
done
# the installer prints the Composer packages the installed recipes need: run each printed command through a shell,
# as a user pasting it would (a constraint such as `^7.4|^8.0` would pipe the line into another command)
grep -h '^ *\$ composer require ' install-*.log | sed 's/^ *\$ composer //' | while IFS= read -r arguments; do
    echo "ux:install suggested: composer $arguments"
    sh -c "$composer $arguments --no-interaction --no-progress" < /dev/null
done

# the app a user writes: a dashboard page and a registration page (tools/tests/fixtures/fresh-app)
cp -R "$root/tools/tests/fixtures/fresh-app/." .

# a cache built from scratch: cache:clear keeps the cached routes when its own boot rebuilt the container in the
# same second as their build (the route cache checks the container file's mtime, one-second resolution), and the
# controllers copied above would answer 404 (UPSTREAM.md, Toolkit findings)
rm -rf var/cache
$php bin/console cache:warmup --no-interaction > /dev/null
$php -S "127.0.0.1:$port" -t public > "$work/server.log" 2>&1 &
server_pid=$!
for _ in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 1; done

"$root/tools/tests/check-fresh-app.sh" "http://127.0.0.1:$port" || {
    echo "--- routes"; $php bin/console debug:router --no-interaction 2>&1 | head -30 || true
    echo "--- src/Controller"; ls -la src/Controller || true
    echo "--- server log"; tail -20 "$work/server.log" || true
    exit 1
}
