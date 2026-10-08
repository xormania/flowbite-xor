# For agents

You are a coding agent, and your human just gave you this repository's URL. This page tells you what flowbite-xor
gives you, how to set a Symfony project up for it, and how to build pages with it while writing as little code as
possible. The same text, as plain markdown:
<https://raw.githubusercontent.com/xormania/flowbite-xor/main/FOR-AGENTS.md>. Every page of the kit, with one line
each: [`llms.txt`](llms.txt).

## What you get

flowbite-xor is a [Symfony UX Toolkit](https://symfony.com/bundles/ux-toolkit/current/index.html) kit: Twig
components, Stimulus controllers, a form theme, page layouts and blocks (ready-made parts of a page), styled with
Flowbite v4 and Tailwind CSS v4. Each one is a recipe: `php bin/console ux:install <recipe>` copies its files into
the project, which then owns them.

- Every behavior is a Stimulus controller, so components keep working through Turbo visits, Turbo Frames and
  Streams, and Live Component re-renders. There is no Flowbite JavaScript.
- Colors come from the theme's color roles, which switch with light and dark and pass contrast checks.
- The components print no inline script, style or event handler: they work under a strict Content Security Policy.
- Each recipe's README is written for you: its props, its examples, and what to do in forms, Live Components and
  Turbo Frames.

## Set your human's project up

Run these on a Symfony project (`composer create-project symfony/skeleton`), once, in this order. PHP 8.4 or later
with the `zip` extension is required. With Symfony Docker, run each command in the container
(`docker compose exec php composer …`, `docker compose exec php bin/console …`).

```bash
composer config extra.symfony.allow-contrib true
composer require symfony/twig-bundle symfony/ux-twig-component
composer require --dev symfony/ux-toolkit:^3.5 symfony/http-client
composer require symfony/asset-mapper symfony/stimulus-bundle
composer require symfonycasts/tailwind-bundle
php bin/console tailwind:init          # keep Tailwind's major version 4
php bin/console importmap:require "flowbite/dist/flowbite.min.css@^4.0.2"
php bin/console ux:install theme --kit=https://github.com/xormania/flowbite-xor
```

Then make `assets/styles/app.css` start with these imports, in this order:

```css
@import 'tailwindcss';
@import '../vendor/flowbite/dist/flowbite.min.css';
@import './flowbite-xor.css';
```

Keep `php bin/console tailwind:build --watch` running while you work, or run `tailwind:build` after each change.
[`INSTALL.md`](INSTALL.md) explains each step, and Webpack Encore.

## Your first moves

1. Paste the block in [`docs/PROJECT-AGENTS-SNIPPET.md`](docs/PROJECT-AGENTS-SNIPPET.md) into the project's
   `AGENTS.md` or `CLAUDE.md`, so every later session follows the same rules.
2. Install the recipes the task needs. `ux:install` brings the recipes a recipe depends on, then prints a
   `composer require` command: run it.

   ```bash
   php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor
   ```

3. Read the recipe's README before using it: `<recipe>/README.md` in this repository.
4. Pages extend `layouts/app.html.twig` (`ux:install layouts`), or `auth`, `settings`, `error` or `blank`. A block
   such as `dashboard-home` or `login` shows a whole page, controller included, in its README.

## Which recipe

| You need | Install |
|---|---|
| The app's shell: sidebar, navbar, page layouts, flash toasts | `layouts` |
| A page title with its actions | `page-header` |
| Forms rendered with the kit's components | `form-theme` |
| A searchable select, one or several choices, server-side search | `autocomplete` |
| A date field, typed or picked, in a form | `date-picker` |
| File uploads, drag and drop or browse, one file or several | `dropzone` |
| Rich text (formatted descriptions, posts, comments) stored as HTML | `editor` |
| Dates inline: one, several or a range | `calendar` |
| A list of records with search, filters, sorting and pages | `data-table` (Turbo Frame) |
| The same, with row selection, bulk actions or search while typing | `data-table-live` (Live Component) |
| A dialog | `modal` |
| A side panel | `drawer` |
| A menu of actions | `dropdown` |
| Free content next to a button: text, links, a small form | `popover` |
| A hint on hover or focus | `tooltip` |
| Notifications, also from Turbo Streams | `toast` |
| Key figures | `stat-card` |
| A chart of numbers, with its data as a table | `chart` |
| An empty list's message | `empty-state` |
| Sign in, sign up, password reset, profile settings, a 404 page | `login`, `signup`, `forgot-password`, `settings-profile`, `not-found` |
| A light/dark switch | `theme-toggle` |

Buttons, inputs, selects, cards, badges, alerts, tabs and the rest of Flowbite's basics are recipes too: the
[README](README.md#recipes) lists every recipe with one line.

## Working well

- **Install a recipe, never write raw Flowbite HTML** for something the kit has. Never `import 'flowbite'` or call
  `initFlowbite()`.
- **Colors through the theme's roles only** (`bg-brand`, `text-heading`, `text-body`, `border-default`…), never
  palette colors such as `bg-blue-700`, and no `dark:` color overrides.
- **Icons from UX Icons' `flowbite` set**, each name written in full (`flowbite:check-circle-outline`), then
  `php bin/console ux:icons:lock` and commit `assets/icons/`.
- **Form controllers answer 303 or 422**: redirect with `Response::HTTP_SEE_OTHER` on success, render the invalid
  form (422) on errors. Turbo Drive rejects a 200 after a submit.
- **Opt form fields in, with no template code**: `'autocomplete' => true` on a choice field;
  `'widget' => 'single_text', 'block_prefix' => 'flowbite_date_picker'` on a `DateType`.
- **No colors in chart data**: the theme's chart roles apply; for a color of your own, write a role as
  `'var(--color-…)'`.
- **Stable ids in re-rendered markup**: inside a Live Component or a Turbo Frame, give `Tooltip`, `Popover`,
  `DatePicker` and `Chart` an explicit `id`.
- **Toasts go through Turbo Streams**: render `<twig:Toast:Stream>` in the page or in a Stream response, never
  inside the permanent toast region.
- **One owner per region**: a Live Component or a Turbo Frame or Stream, not both.
- **Props and attributes are trusted input**: give `as`, attribute names and URLs values the code chose, never
  request or user data unchecked. Validate dates and bounds on the server: the calendar's only guide the user.
- **No inline `<script>`, `<style>`, `style="…"` or `onclick="…"`** in templates: behavior goes in Stimulus
  controllers, styles in Tailwind classes.
- **Check your work in a browser** in light and dark: the recipes' READMEs show what each example should look like.

## Updating

Recipes are copies the project owns. Commit first, then reinstall from a newer version with `--force` and review
`git diff`:

```bash
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor:<version> --force
```

Versions are git tags `X.Y.Z` ([`CHANGELOG.md`](CHANGELOG.md)). Without a version, `ux:install` takes `main`.

## Quick reference

| You need | Read |
|---|---|
| Every page, one line each | [`llms.txt`](llms.txt) |
| The rules to paste into the project | [`docs/PROJECT-AGENTS-SNIPPET.md`](docs/PROJECT-AGENTS-SNIPPET.md) |
| Every recipe, one line each | [`README.md`](README.md#recipes) |
| A recipe's props and examples | `<recipe>/README.md` |
| Each setup step explained | [`INSTALL.md`](INSTALL.md) |
| Turbo, Live Components, security | [`README.md`](README.md#turbo-and-live-components) |
| Every example rendered, light and dark | <https://xormania.github.io/flowbite-xor/> |
| Changing the kit itself | [`CONTRIBUTING.md`](CONTRIBUTING.md), [`AGENTS.md`](AGENTS.md) |
