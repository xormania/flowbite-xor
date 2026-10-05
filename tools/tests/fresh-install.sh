#!/usr/bin/env bash
# Phase 6 acceptance: on a fresh Symfony skeleton, `ux:install dashboard-home` (plus `layouts`) from this
# kit, as GitHub's archive gives it, yields a working dashboard page.
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
# as README.md says: tales-from-a-dev/twig-tailwind-extra (the `tailwind_classes` filter of every
# recipe) registers its bundle through a contrib recipe
$composer config extra.symfony.allow-contrib true
# symfony/ux-twig-component first, as a regular dependency: required only through `--dev symfony/ux-toolkit`,
# its symfony/property-access is dev-only, so FrameworkBundle leaves property_access off while Flex enables
# TwigComponentBundle in every environment, and cache:clear fails ("non-existent service property_accessor").
$composer require --no-interaction --no-progress symfony/twig-bundle symfony/asset-mapper symfony/stimulus-bundle symfony/http-client "symfony/ux-twig-component:^3.5"
$composer require --no-interaction --no-progress --dev "symfony/ux-toolkit:$toolkit_version"

kit="vendor/symfony/ux-toolkit/kits/flowbite-xor-local"
mkdir -p "$kit"
git -C "$root" archive HEAD | tar -x -C "$kit"

for recipe in layouts dashboard-home; do
    $php bin/console ux:install "$recipe" --kit=flowbite-xor-local --no-interaction > "install-$recipe.log" 2>&1 \
        || { cat "install-$recipe.log"; echo "FAIL: ux:install $recipe"; exit 1; }
done
# the installer prints the Composer packages the installed recipes need
packages="$(grep -ho 'composer require .*' install-*.log | sed 's/^composer require //' | tr ' ' '\n' | grep . | sort -u | tr '\n' ' ')"
echo "Composer packages suggested by ux:install: $packages"
# shellcheck disable=SC2086
$composer require --no-interaction --no-progress $packages

# a deterministic check: no Iconify API calls, missing icons render nothing
mkdir -p config/packages
printf 'ux_icons:\n    ignore_not_found: true\n    iconify:\n        on_demand: false\n' > config/packages/ux_icons.yaml

mkdir -p src/Controller templates/dashboard
cat > src/Controller/DashboardController.php <<'PHP'
<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class DashboardController extends AbstractController
{
    #[Route('/', name: 'app_dashboard')]
    public function index(): Response
    {
        return $this->render('dashboard/index.html.twig');
    }
}
PHP
cat > templates/dashboard/index.html.twig <<'TWIG'
{% extends 'layouts/app.html.twig' %}

{% block title %}Dashboard{% endblock %}
{% block brand %}Acme{% endblock %}
{% block content %}
    <twig:DashboardHome />
{% endblock %}
TWIG

$php bin/console cache:clear --no-interaction > /dev/null
$php -S "127.0.0.1:$port" -t public > "$work/server.log" 2>&1 &
server_pid=$!
for _ in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$port/" && break; sleep 1; done

status="$(curl -s -o "$work/page.html" -w '%{http_code}' "http://127.0.0.1:$port/")"
if [ "$status" != 200 ]; then
    grep -o '<title>[^<]*' "$work/page.html" || true
    echo "FAIL: the dashboard page answered $status"
    exit 1
fi
for expected in '<h1' 'Dashboard' 'Recent orders' 'id="sidebar"' 'data-turbo-permanent' 'id="toasts"'; do
    grep -q -- "$expected" "$work/page.html" || { echo "FAIL: the dashboard page lacks $expected"; exit 1; }
done
echo "ok: ux:install dashboard-home + layouts on a fresh skeleton renders the dashboard (HTTP 200)"
