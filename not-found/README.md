# Not Found

The content of a 404 (or any error) page: status, title, explanation and a way back.

```twig {"preview":true}
<twig:NotFound homeHref="#" />
```

## Installation

::: installation

## Usage

Symfony renders `templates/bundles/TwigBundle/Exception/error404.html.twig` for a 404 in production (preview it in dev at `/_error/404`):

```twig
{# templates/bundles/TwigBundle/Exception/error404.html.twig #}
{% extends 'layouts/error.html.twig' %}

{% block title %}Page not found{% endblock %}
{% block content %}
    <twig:NotFound homeHref="{{ path('app_home') }}" />
{% endblock %}
```

Other errors, in `error.html.twig`:

```twig
<twig:NotFound :status="status_code" title="Something went wrong" message="Please try again in a moment." homeHref="{{ path('app_home') }}">
    <twig:block name="actions"><twig:Button as="a" href="mailto:support@example.com" variant="outline">Contact support</twig:Button></twig:block>
</twig:NotFound>
```
