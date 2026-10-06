#!/usr/bin/env bash
# On a fresh Symfony Docker project (dunglas/symfony-docker: FrankenPHP in worker mode, its PHP image, the latest
# Symfony by default), README.md's install steps with the kit downloaded from GitHub, the archive users get
# (`--kit=https://github.com/xormania/flowbite-xor:<ref>`), give the same pages as fresh-install.sh.
#
#   KIT_REF=<tag or full commit SHA> tools/tests/docker-install.sh
#   (SYMFONY_VERSION=… default 8.1.*, KIT_REPOSITORY=… default xormania/flowbite-xor; needs Docker and git)
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
ref="${KIT_REF:?set KIT_REF to a tag or a full commit SHA of the kit}"
repository="${KIT_REPOSITORY:-xormania/flowbite-xor}"
toolkit_version="${UX_TOOLKIT_VERSION:-3.5.1}"
export SYMFONY_VERSION="${SYMFONY_VERSION:-8.1.*}"
# the template commit UPSTREAM.md records for the demo
template_commit=422756611d61e0108600ed7ec1370ec677d0e8d0
work="$(mktemp -d)"
app="$work/app"
cleanup() { if [ -f "$app/compose.yaml" ]; then (cd "$app" && docker compose down -v --remove-orphans > /dev/null 2>&1) || true; fi; }
trap cleanup EXIT

git clone --quiet https://github.com/dunglas/symfony-docker "$app"
git -C "$app" checkout --quiet "$template_commit"
cd "$app"
# FrankenPHP 1.13 (Mercure 1.0) refuses the template's Mercure configuration: the demo's Caddyfile and no
# `demo` directive, as in UPSTREAM.md's Symfony Docker section
cp "$root/demo/frankenphp/Caddyfile" frankenphp/Caddyfile
sed -i '/MERCURE_EXTRA_DIRECTIVES/d' compose.override.yaml

docker compose build --pull
# the first start creates the Symfony project (the template's entrypoint)
docker compose up --wait --wait-timeout 600 || { docker compose logs php; exit 1; }

x() { docker compose exec -T php "$@"; }

# README.md's install steps, inside the container (see fresh-install.sh for why each package)
x composer config extra.symfony.allow-contrib true
x composer require --no-interaction --no-progress symfony/twig-bundle "symfony/ux-twig-component:^3.5"
x composer require --no-interaction --no-progress --dev "symfony/ux-toolkit:$toolkit_version" symfony/http-client
x composer require --no-interaction --no-progress symfony/asset-mapper symfony/stimulus-bundle

for recipe in dashboard-home signup; do
    x bin/console ux:install "$recipe" --kit="https://github.com/$repository:$ref" --no-interaction > "$work/install-$recipe.log" 2>&1 \
        || { cat "$work/install-$recipe.log"; echo "FAIL: ux:install $recipe"; exit 1; }
done
grep -h '^ *\$ composer require ' "$work"/install-*.log | sed 's/^ *\$ composer //' | while IFS= read -r arguments; do
    echo "ux:install suggested: composer $arguments"
    x sh -c "composer $arguments --no-interaction --no-progress" < /dev/null
done

# the app a user writes (tools/tests/fixtures/fresh-app); the container owns the project files
tar -C "$root/tools/tests/fixtures/fresh-app" -c . | x tar -x -C /app

# a cache built from scratch (see fresh-install.sh), then fresh workers for the new code
x rm -rf var/cache
x bin/console cache:warmup --no-interaction > /dev/null
docker compose restart php
docker compose up --wait --wait-timeout 300

"$root/tools/tests/check-fresh-app.sh" https://localhost --insecure || {
    echo "--- routes"; x bin/console debug:router --no-interaction 2>&1 | head -30 || true
    echo "--- logs"; docker compose logs --tail 50 php || true
    exit 1
}
echo "ok: $(x bin/console --version --no-ansi | head -1), kit $repository:$ref from GitHub, in Symfony Docker"
