#!/usr/bin/env bash
# Checks the app that fresh-install.sh and docker-install.sh build from tools/tests/fixtures/fresh-app: `/` renders
# the dashboard through the layouts, `/register` renders the signup form through the form theme (no
# `twig.form_themes` setting: the block applies the theme itself), `/orders` renders a DataTable whose PHP classes
# ux:install copied into src/, and all answer 200.
#
#   tools/tests/check-fresh-app.sh <base URL> [curl option…]
set -euo pipefail

base="$1"
shift
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

fetch() { # fetch <path> [curl option…]: prints the page on one line, fails unless it answers 200
    local path="$1" status
    shift
    status="$(curl -s "$@" -o "$work/page.html" -w '%{http_code}' "$base$path")"
    if [ "$status" != 200 ]; then
        if [ -f "$work/page.html" ]; then grep -o '<title>[^<]*' "$work/page.html" >&2 || true; fi
        echo "FAIL: $path answered $status" >&2
        exit 1
    fi
    tr '\n' ' ' < "$work/page.html"
}

page="$(fetch / "$@")"
for expected in '<h1[^>]*>[[:space:]]*Dashboard[[:space:]]*</h1>' 'Recent orders' '<aside[^>]*id="sidebar"[^>]*data-turbo-permanent' 'id="toasts"'; do
    grep -qE -- "$expected" <<< "$page" || { echo "FAIL: the dashboard page lacks $expected" >&2; exit 1; }
done
echo "ok: the dashboard renders (HTTP 200)"

# Symfony's default layout would print a bare <input id="form_email"> and <label for="form_email" class="required">;
# the theme prints the kit's components
page="$(fetch /register "$@")"
grep -oE '<input[^>]*>' <<< "$page" | grep 'id="form_email"' | grep -q 'rounded-base' \
    || { echo "FAIL: the signup email field is not the Input component" >&2; exit 1; }
grep -oE '<label[^>]*>' <<< "$page" | grep 'for="form_email"' | grep -q 'text-heading' \
    || { echo "FAIL: the signup email label is not FormField's" >&2; exit 1; }
grep -qE '<p id="form_plainPassword_help"[^>]*>[[:space:]]*At least 12 characters' <<< "$page" \
    || { echo "FAIL: the signup password help is not FormField's" >&2; exit 1; }
echo "ok: the signup form renders through the form theme (HTTP 200)"

# the data-table recipe's PHP (src/FlowbiteXor/DataTable/) works in the app: the table reads its page, sort and filter
# from the URL, and its links keep them
page="$(fetch '/orders?page=2&sort=number&dir=desc&f%5Bstatus%5D=paid' "$@")"
grep -qE 'Showing <span[^>]*>11–12</span> of <span[^>]*>12</span>' <<< "$page" \
    || { echo "FAIL: the orders table does not show its second page of paid orders" >&2; exit 1; }
grep -qE '<turbo-frame[^>]*id="orders"[^>]*data-turbo-action="advance"' <<< "$page" \
    || { echo "FAIL: the orders table is not in its Turbo Frame" >&2; exit 1; }
grep -qE 'id="orders-row-2"' <<< "$page" \
    || { echo "FAIL: the orders table rows have no stable ids" >&2; exit 1; }
grep -qE 'href="/orders\?sort=number&amp;dir=desc&amp;f%5Bstatus%5D=paid"' <<< "$page" \
    || { echo "FAIL: the orders table page links lose the sort or the filter" >&2; exit 1; }
echo "ok: the orders DataTable renders from the recipe's PHP (HTTP 200)"
