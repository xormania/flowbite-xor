# Layouts

Page layouts to extend: an app shell with sidebar and navbar, a centered auth ground, settings, errors and a blank page.

## Installation

::: installation

## Usage

The recipe copies six templates to `templates/layouts/`. Extend one from a page:

```twig
{% extends 'layouts/app.html.twig' %}

{% block title %}Orders{% endblock %}
{% block brand %}<a href="{{ path('app_home') }}">Acme</a>{% endblock %}
{% block sidebar %}
    <twig:Sidebar:Group label="Overview">
        <twig:Sidebar:Item href="{{ path('app_orders') }}" route="app_orders">Orders</twig:Sidebar:Item>
    </twig:Sidebar:Group>
{% endblock %}
{% block page_title %}Orders{% endblock %}
{% block page_description %}Every order placed in the last 30 days.{% endblock %}
{% block content %}…{% endblock %}
```

| Layout | For | Blocks |
|--------|-----|--------|
| `base.html.twig` | every other layout: meta, the no-flash theme snippet, the `app` importmap entrypoint with `data-turbo-track="reload"`, the Turbo progress bar in the brand color, the `ToastRegion` and flash messages as toasts | `title`, `head`, `stylesheets`, `javascripts`, `body_class`, `toasts`, `body` |
| `app.html.twig` | the application: `Sidebar` (`data-turbo-permanent`, so it keeps its scroll and collapsed state across Turbo visits), `Navbar` with the menu button for small screens, `PageHeader` | `brand`, `sidebar`, `navbar_search`, `navbar_actions` (theme toggle by default), `page_title`, `page_description`, `page_before`, `page_actions`, `content` |
| `auth.html.twig` | login, signup, password reset: a centered column | `brand`, `content` |
| `settings.html.twig` | settings pages: the app shell with a secondary navigation and panels | `settings_nav`, `settings_nav_label`, `settings_content` (and the `app` blocks) |
| `error.html.twig` | error pages, e.g. `templates/bundles/TwigBundle/Exception/error404.html.twig` | `content` |
| `blank.html.twig` | anything else | `content` |

Settings navigation items, with the current one marked:

```twig
{% block settings_nav %}
    <li><a href="{{ path('app_settings_profile') }}" aria-current="page" class="block rounded-base px-3 py-2 text-sm font-medium text-body hover:bg-neutral-secondary-medium hover:text-heading aria-[current=page]:bg-brand-softer aria-[current=page]:text-fg-brand-strong">Profile</a></li>
{% endblock %}
```

Flash messages added with `$this->addFlash('success', '…')` (also `warning`, `danger`, anything else as `info`) appear as toasts on the next page, whatever its layout, Turbo visit or not.
