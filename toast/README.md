# Toast

Short-lived notifications in a fixed region, added on page load or by Turbo Streams, dismissed after a timeout or by the user.

```twig {"preview":true}
<twig:ToastRegion class="static max-w-sm">
    <twig:Toast variant="success" timeout="0">Order #1042 has been shipped.</twig:Toast>
    <twig:Toast variant="danger" timeout="0">The payment could not be processed.</twig:Toast>
</twig:ToastRegion>
```

## Installation

::: installation

## Usage

Put one region in your layout, outside the content Turbo replaces. It is `data-turbo-permanent`, so toasts survive Turbo visits:

```twig
<twig:ToastRegion />
```

Add toasts with Turbo Streams, from a `*.stream.html.twig` response, through Mercure, or written in the page itself, which is how flash messages work:

```twig
{% for message in app.flashes('success') %}
    <twig:Toast:Stream variant="success">{{ message }}</twig:Toast:Stream>
{% endfor %}
```

Do not write toasts inside the region for pages reached by Turbo Drive: Turbo keeps the region already on screen and drops the new page's copy, with its toasts.

The region is a polite live region, so new toasts are announced (`danger` ones interrupt, with `role="alert"`). Toasts pause while hovered or focused and never move focus.
