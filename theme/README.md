# Theme

The Flowbite color roles (light and dark) with this kit's contrast fixes, as one stylesheet for `assets/styles/app.css`.

## Installation

::: installation

## Usage

The recipe copies `assets/styles/flowbite-xor.css`: Flowbite's theme (`@theme` roles, `.dark` overrides, `@custom-variant dark`) with every role checked for contrast. Import it after Tailwind and Flowbite's base styles in `assets/styles/app.css`:

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

Text roles reach 4.5:1 on the grounds they are meant for, and the focus ring 3:1, in both themes. The kit checks a list of pairs in CI (`tools/contrast/pairs.json`). Keep small `fg-brand` text off `brand-soft` grounds: in dark mode that pair is below 4.5:1, so use `fg-brand-strong` there.
