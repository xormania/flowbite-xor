# Getting started

This kit (flowbite-xor) provides ready-to-use and fully-customizable UI Twig components based on [Flowbite](https://flowbite.com/) components's **design**.

Install a recipe from it with:

```
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor
```

## Requirements

This kit requires TailwindCSS and Flowbite v4 to work:

### TailwindCSS

- If you use Symfony AssetMapper, you can install TailwindCSS with the [TailwindBundle](https://symfony.com/bundles/TailwindBundle/current/index.html),
- If you use Webpack Encore, you can follow the [TailwindCSS installation guide for Symfony](https://tailwindcss.com/docs/installation/framework-guides/symfony)

## Installation

1. Install Flowbite's stylesheet (base styles of the form controls), either with `importmap:require` for AssetMapper, or `npm` for Webpack Encore. The kit uses no Flowbite JavaScript: every behavior lives in the recipes' Stimulus controllers.

```
# With AssetMapper
php bin/console importmap:require flowbite/dist/flowbite.min.css

# With npm
npm install flowbite
```

2. Install the `theme` recipe (Flowbite's color roles with this kit's contrast fixes, light and dark), then modify the file `assets/styles/app.css` with the following content:

```
php bin/console ux:install theme --kit=https://github.com/xormania/flowbite-xor
```

```css
@import 'tailwindcss';

/* With AssetMapper (downloaded by importmap:require)... */
@import '../vendor/flowbite/dist/flowbite.min.css';
/* ... or with Webpack Encore */
/* @import 'flowbite/dist/flowbite.min.css'; */

/* Theme roles, `.dark` overrides and `@custom-variant dark`, installed by the `theme` recipe */
@import './flowbite-xor.css';
```
