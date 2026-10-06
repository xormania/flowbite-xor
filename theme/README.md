# Theme

The Flowbite color roles (light and dark) with this kit's contrast fixes, as one stylesheet for `assets/styles/app.css`.

## Installation

::: installation

## Usage

The recipe copies `assets/styles/flowbite-xor.css`, Flowbite's theme with every color role checked for contrast. A role is a named color used through utilities such as `bg-brand`, `text-heading` or `border-default`. The file defines the roles (`@theme`), their dark values (`.dark`) and the `dark:` variant (`@custom-variant dark`), and gives Turbo Drive's progress bar the brand color. Import it after Tailwind and Flowbite's stylesheet in `assets/styles/app.css`:

```css
@import "tailwindcss";

/* AssetMapper: `php bin/console importmap:require flowbite/dist/flowbite.min.css` downloads it to assets/vendor */
@import "../vendor/flowbite/dist/flowbite.min.css";
/* Webpack Encore: @import "flowbite/dist/flowbite.min.css"; */

@import "./flowbite-xor.css";

/* The templates of your app (Tailwind scans the project root by default; list them if you build from elsewhere) */
@source "../../templates";
```

### Dark mode

Dark mode is class based: the `.dark` overrides and the `dark:` variant apply below an element with the `dark` class, normally `<html class="dark">`. The `theme-toggle` recipe switches it and documents a snippet that sets it before the first paint.

### Contrast

In both themes, text roles reach a contrast of 4.5:1 on the backgrounds they are meant for, and the focus ring 3:1. The kit's repository checks [these pairs](https://github.com/xormania/flowbite-xor/blob/main/tools/contrast/pairs.json) on every change. Keep small `fg-brand` text off `brand-soft` backgrounds: in dark mode that pair is below 4.5:1, so use `fg-brand-strong` there.
