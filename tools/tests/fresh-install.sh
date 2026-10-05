#!/usr/bin/env bash
# Phase 6 acceptance: on a fresh Symfony skeleton, `ux:install dashboard-home` (which brings `layouts`) from this
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

for recipe in dashboard-home signup; do
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
mkdir -p templates/registration
cat > src/Controller/RegistrationController.php <<'PHP'
<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class RegistrationController extends AbstractController
{
    #[Route('/register', name: 'app_register')]
    public function register(): Response
    {
        $form = $this->createFormBuilder()
            ->add('email', EmailType::class)
            ->add('plainPassword', PasswordType::class, ['label' => 'Password', 'help' => 'At least 12 characters.'])
            ->getForm();

        return $this->render('registration/register.html.twig', ['form' => $form]);
    }
}
PHP
cat > templates/registration/register.html.twig <<'TWIG'
{% extends 'layouts/auth.html.twig' %}

{% block title %}Create an account{% endblock %}
{% block content %}
    <twig:SignupForm :form="form" />
{% endblock %}
TWIG
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

fetch() { # fetch <path> <file>: fails unless the page answers 200
    local status
    status="$(curl -s -o "$2" -w '%{http_code}' "http://127.0.0.1:$port$1")"
    if [ "$status" != 200 ]; then
        grep -o '<title>[^<]*' "$2" || true
        echo "FAIL: $1 answered $status"
        exit 1
    fi
}

fetch / "$work/page.html"
page="$(tr '\n' ' ' < "$work/page.html")"
for expected in '<h1[^>]*>[[:space:]]*Dashboard[[:space:]]*</h1>' 'Recent orders' '<aside[^>]*id="sidebar"[^>]*data-turbo-permanent' 'id="toasts"'; do
    grep -qE -- "$expected" <<< "$page" || { echo "FAIL: the dashboard page lacks $expected"; exit 1; }
done
echo "ok: ux:install dashboard-home on a fresh skeleton renders the dashboard (HTTP 200)"

# no twig.form_themes here: the block applies the form theme itself. Symfony's default layout would print a bare
# <input id="form_email"> and <label for="form_email" class="required">; the theme prints the kit's components.
fetch /register "$work/register.html"
page="$(tr '\n' ' ' < "$work/register.html")"
grep -oE '<input[^>]*>' <<< "$page" | grep 'id="form_email"' | grep -q 'rounded-base' \
    || { echo "FAIL: the signup email field is not the Input component"; exit 1; }
grep -oE '<label[^>]*>' <<< "$page" | grep 'for="form_email"' | grep -q 'text-heading' \
    || { echo "FAIL: the signup email label is not FormField's"; exit 1; }
grep -qE '<p id="form_plainPassword_help"[^>]*>[[:space:]]*At least 12 characters' <<< "$page" \
    || { echo "FAIL: the signup password help is not FormField's"; exit 1; }
echo "ok: ux:install signup on a fresh skeleton renders its form through the form theme (HTTP 200)"
