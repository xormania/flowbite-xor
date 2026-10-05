# Dashboard Home

A dashboard home: page header, key figures, two cards and a table of recent orders.

```twig {"preview":true}
<div class="w-full">
    <twig:DashboardHome />
</div>
```

## Installation

::: installation

## Usage

It renders with sample data, so a page shows up right after `ux:install dashboard-home`:

```php
// src/Controller/DashboardController.php
#[Route('/', name: 'app_dashboard')]
public function index(): Response
{
    return $this->render('dashboard/index.html.twig');
}
```

```twig
{# templates/dashboard/index.html.twig #}
{% extends 'layouts/app.html.twig' %}

{% block title %}Dashboard{% endblock %}
{% block content %}
    <twig:DashboardHome />
{% endblock %}
```

Then pass your own figures:

```twig
<twig:DashboardHome
    :stats="[{label: 'Revenue', value: revenue|format_currency('USD'), trend: 'up', change: '12%', period: 'vs last month'}]"
    :channels="channels"
    :activity="activity"
    :orders="orders"
>
    <twig:block name="actions"><twig:Button as="a" href="{{ path('app_report') }}">Download report</twig:Button></twig:block>
</twig:DashboardHome>
```
