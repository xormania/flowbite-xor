#!/usr/bin/env bash
# Checks the app that fresh-install.sh and docker-install.sh build from tools/tests/fixtures/fresh-app: `/` renders
# the dashboard through the layouts, `/register` renders the signup form through the form theme (no
# `twig.form_themes` setting: the block applies the theme itself), `/orders` renders a DataTable whose PHP classes
# ux:install copied into src/, `/live-orders` a DataTableLive that answers a Live action, `/pick` autocomplete fields and
# the Autocomplete component, `/dates` a DateType opted into the date picker, `/charts`
# two charts, and all answer 200.
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

# the data-table-live recipe's PHP works as a Live Component: the page renders it, and its `goTo` action, sent as the
# live controller sends it (tools/tests/live-action.php), answers with the requested page
page="$(fetch /live-orders "$@")"
grep -qE 'data-live-name-value="LiveOrders"' <<< "$page" \
    || { echo "FAIL: the live orders table is not a Live Component" >&2; exit 1; }
body="$("${PHP:-php}" "$(dirname "$0")/live-action.php" "$work/page.html" '{"page":"2"}')"
status="$(curl -s "$@" -o "$work/action.html" -w '%{http_code}' -X POST "$base/_components/LiveOrders/goTo" \
    -H 'Accept: application/vnd.live-component+html' -H 'X-Requested-With: XMLHttpRequest' --data-urlencode "data=$body")"
[ "$status" = 200 ] || { echo "FAIL: the live orders table's goTo action answered $status" >&2; exit 1; }
grep -qE 'Showing <span[^>]*>11–20</span> of <span[^>]*>25</span>' "$work/action.html" \
    || { echo "FAIL: the live orders table's goTo action did not render page 2" >&2; exit 1; }
echo "ok: the live orders DataTableLive renders and answers a Live action (HTTP 200)"

# the autocomplete recipe: a form field with `'autocomplete' => true` renders through the form theme with UX
# Autocomplete's controller and the label reference for Tom Select, the Autocomplete component renders a Select with
# the controller, and the remote field's search URL answers with its JSON results
page="$(fetch /pick "$@")"
select="$(grep -oE '<select[^>]*id="form_country"[^>]*>' <<< "$page")"
for expected in 'data-controller="symfony--ux-autocomplete--autocomplete"' 'aria-labelledby="form_country-ts-label"' 'rounded-base'; do
    grep -q -- "$expected" <<< "$select" || { echo "FAIL: the autocomplete form field lacks $expected" >&2; exit 1; }
done
select="$(grep -oE '<select[^>]*id="fruit"[^>]*>' <<< "$page")"
for expected in 'data-controller="symfony--ux-autocomplete--autocomplete"' 'aria-labelledby="fruit-ts-label"' 'tom-select-options-value="{&quot;create&quot;:true}"' 'rounded-base'; do
    grep -q -- "$expected" <<< "$select" || { echo "FAIL: the Autocomplete component lacks $expected" >&2; exit 1; }
done
url="$(grep -oE '<select[^>]*id="form_customer"[^>]*>' <<< "$page" | grep -oE 'autocomplete-url-value="[^"]*"' | cut -d'"' -f2)"
[ -n "$url" ] || { echo "FAIL: the remote autocomplete field has no search URL" >&2; exit 1; }
fetch "$url?query=bon" "$@" | grep -q '"text":"Bonnie Green"' \
    || { echo "FAIL: the remote autocomplete field's search URL does not find Bonnie Green" >&2; exit 1; }
echo "ok: the autocomplete fields and component render, and the remote search answers (HTTP 200)"

# the date-picker recipe through the form theme's opt-in: the typed field takes the field's id, the hidden input its
# name and value, and the calendar its bounds
page="$(fetch /dates "$@")"
grep -oE '<input[^>]*>' <<< "$page" | grep 'id="form_startsOn"' | grep -q 'data-date-picker-target="input"' \
    || { echo "FAIL: the opted-in date field is not the date picker's text field" >&2; exit 1; }
grep -oE '<input[^>]*>' <<< "$page" | grep 'name="form\[startsOn\]"' | grep 'type="hidden"' | grep -q 'value="2026-03-12"' \
    || { echo "FAIL: the date picker's hidden input lacks the field's name or value" >&2; exit 1; }
grep -qE 'data-calendar-min-date-value="2026-01-01"' <<< "$page" \
    || { echo "FAIL: the date picker's calendar lacks the field's min" >&2; exit 1; }
echo "ok: the date picker renders an opted-in DateType (HTTP 200)"

# the chart recipe: a Chart from arrays and one from ChartBuilderInterface, each with its canvas for UX Chart.js, its
# theme controller and its data table; Flex put UX Chart.js's controller and chart.js in the import map
page="$(fetch /charts "$@")"
for expected in 'data-controller="chart"' 'data-controller="symfony--ux-chartjs--chart"' 'role="img"' '<table id="revenue-table"' 'bg-chart-1' '"@symfony/ux-chartjs"' '"chart.js"'; do
    grep -qF -- "$expected" <<< "$page" || { echo "FAIL: the charts page lacks $expected" >&2; exit 1; }
done
grep -oE 'data-symfony--ux-chartjs--chart-view-value="[^"]*' <<< "$page" | grep -q 'Mon' \
    || { echo "FAIL: the ChartBuilderInterface chart lost its labels" >&2; exit 1; }
echo "ok: the chart recipe renders charts from arrays and from ChartBuilderInterface (HTTP 200)"
