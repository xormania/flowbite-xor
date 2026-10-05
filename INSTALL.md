# Getting started

This kit (flowbite-xor) provides ready-to-use and fully-customizable UI Twig components based on [Flowbite](https://flowbite.com/) components's **design**.

Install a recipe from it with:

```
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor
```

## Requirements

This kit requires TailwindCSS and Flowbite v4 to work, and two settings of a fresh Symfony project:

### Symfony

- Allow contrib recipes (`composer config extra.symfony.allow-contrib true`) before requiring the recipes' packages: `tales-from-a-dev/twig-tailwind-extra`, which provides the `tailwind_classes` filter, registers its bundle through one.
- Require `symfony/ux-twig-component` as a regular dependency before `composer require --dev symfony/ux-toolkit`: pulled in by the toolkit only, its `symfony/property-access` is a dev dependency, FrameworkBundle leaves `property_access` off and `cache:clear` fails with "non-existent service property_accessor".

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
