# Theme Toggle

A button switching between the light and dark themes, remembered in `localStorage` and following the system preference until the user chooses.

```twig {"preview":true}
<twig:ThemeToggle />
```

## Installation

::: installation

## Usage

```twig
<twig:ThemeToggle label="Toggle dark mode" storageKey="theme" />
```

### No flash on load

Add this snippet to `<head>`, before any stylesheet, so the theme is set before the first paint (the controller only connects after the page has rendered). The `layouts` recipe's `base.html.twig` already has it. If you change `storageKey`, change `'theme'` in the snippet too:

```html
<script>
    try {
        const theme = localStorage.getItem('theme');
        document.documentElement.classList.toggle('dark', 'dark' === theme || ('light' !== theme && matchMedia('(prefers-color-scheme: dark)').matches));
    } catch (e) {}
</script>
```

Turbo Drive keeps the `<html>` element between visits, so the theme persists across navigations; the controller reconnects on every page and keeps `aria-pressed` in sync.
