# flowbite-xor

A [Symfony UX Toolkit](https://symfony.com/bundles/ux-toolkit/current/index.html) kit built on the free
[Flowbite](https://flowbite.com/) v4 library and Tailwind CSS v4: copy-in recipes (a theme, Twig components,
Stimulus controllers, a form theme, layouts and blocks) for xor's Symfony projects.

`ux:install` copies a recipe's files into your project, where you own them. Every behavior is a Stimulus
controller (no Flowbite JavaScript, no global `initFlowbite()`), so components keep working when Turbo
navigates and when Live Components re-render them. Every change to the files copied from the official
`flowbite-4` kit is listed in [`UPSTREAM.md`](UPSTREAM.md).

## Install

Prepare the project once, in this order:

```bash
# contrib recipes: twig-tailwind-extra (the `tailwind_classes` filter) registers its bundle through one
composer config extra.symfony.allow-contrib true
# regular dependencies before the toolkit: TwigComponentBundle needs TwigBundle, and required only through
# `--dev symfony/ux-toolkit`, symfony/property-access is dev-only and cache:clear fails ("non-existent service
# property_accessor")
composer require symfony/twig-bundle symfony/ux-twig-component
# http-client: the toolkit downloads the kit from GitHub with it
composer require --dev symfony/ux-toolkit:^3.5 symfony/http-client
```

Then set up Tailwind, Flowbite's stylesheet and the theme as [`INSTALL.md`](INSTALL.md) says, and install recipes:

```bash
# from main
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor

# from a release tag, branch or commit SHA (no "/" allowed: use the SHA for branches like feat/x)
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor:<version>
```

`ux:install` installs the recipes a recipe depends on and prints the `composer require` command for the
packages they need: run it. `ux:install dashboard-home`, for instance, brings the layouts and every component
the dashboard uses, and renders a working page on a fresh skeleton; so does a form block like `signup`,
through the form theme (both checked in CI).

## Recipes

✦ ships a Stimulus controller. Each recipe's README has its examples, props and usage.

### Theme

| Recipe | |
|---|---|
| [`theme`](theme/README.md) | The Flowbite color roles (light and dark) with this kit's contrast fixes, as one stylesheet for `assets/styles/app.css`. |
| [`theme-toggle`](theme-toggle/README.md) ✦ | A button switching between the light and dark themes, remembered in `localStorage` and following the system preference until the user chooses. |

### Components from the official kit

| Recipe | |
|---|---|
| [`alert`](alert/README.md) ✦ | The alert component can be used to provide information to your users such as success or error messages, but also highlighted information complementing the normal flow of paragraphs and headers on a page. |
| [`avatar`](avatar/README.md) | Use the avatar component to show a visual representation of a user profile using an image element or SVG object based on multiple styles and sizes |
| [`badge`](badge/README.md) | The badge component can be used to complement other elements such as buttons or text elements as a label or to show the count of a given data, such as the number of comments for an article or how much time has passed by since a comment has been made. |
| [`button`](button/README.md) | Use the button component inside forms, as links, social login, payment options with support for multiple styles, colors, sizes, gradients, and shadows |
| [`button-group`](button-group/README.md) | The button group component from Flowbite can be used to stack together multiple buttons and links inside a single element. |
| [`card`](card/README.md) | Use these responsive card components to show data entries and information to your users in multiple forms and contexts such as for your blog, application, user profiles, and more. |
| [`checkbox`](checkbox/README.md) | The checkbox component can be used to receive one or more selected options from the user in the form of a square box available in multiple styles, sizes, colors, and variants coded with the utility classes from Tailwind CSS and with support for dark mode. |
| [`dropdown`](dropdown/README.md) ✦ | The dropdown component can be used to show a list of menu items when clicking on an element such as a button and hiding it when focusing outside of the triggering element. |
| [`indicator`](indicator/README.md) | Use the indicator component to show a number count, account status, or as a loading label positioned relative to the parent component coded with Tailwind CSS |
| [`input`](input/README.md) | The input field is an important part of the form element that can be used to create interactive controls to accept data from the user based on multiple input types, such as text, email, number, password, URL, phone number, and more. |
| [`kbd`](kbd/README.md) | The KBD (Keyboard) component can be used to indicate a textual user input from the keyboard inside other elements such as in text, tables, cards, and more. |
| [`label`](label/README.md) | A text element that identifies form controls and other content. |
| [`modal`](modal/README.md) ✦ | Use the modal component to show interactive dialogs and notifications to your website users available in multiple sizes, colors, and styles |
| [`pagination`](pagination/README.md) | Use the Tailwind CSS pagination element to indicate a series of content across various pages based on multiple styles and sizes |
| [`radio`](radio/README.md) | The radio component can be used to allow the user to choose a single option from one or more available options coded with the utility classes from Tailwind CSS and available in multiple styles, variants, and colors and support dark mode. |
| [`select`](select/README.md) | Get started with the select component to allow the user to choose from one or more options from a dropdown list based on multiple styles, sizes, and variants |
| [`skeleton`](skeleton/README.md) | Use the skeleton component to indicate a loading status with placeholder elements that look very similar to the type of content that is being loaded such as paragraphs, heading, images, videos, and more. |
| [`spinner`](spinner/README.md) | An indicator that can be used to show a loading state. |
| [`table`](table/README.md) | Use the table component to show text, images, links, and other elements inside a structured set of data made up of rows and columns of table cells |
| [`tabs`](tabs/README.md) ✦ | Use the following default tabs component example to show a list of links that the user can navigate from on your website. |
| [`textarea`](textarea/README.md) | The textarea component is a multi-line text field input that can be used to receive longer chunks of text from the user in the form of a comment box, description field, and more. |
| [`toggle`](toggle/README.md) | Use the toggle component to switch between a binary state of true or false using a single click available in multiple sizes, variants, and colors |

### Components added by this kit

| Recipe | |
|---|---|
| [`breadcrumb`](breadcrumb/README.md) | A trail of links showing where the current page sits in the site hierarchy. |
| [`drawer`](drawer/README.md) ✦ | A panel sliding over one side of the page, for navigation, filters or details, as a native `<dialog>`. |
| [`empty-state`](empty-state/README.md) | What a list or page shows when it has nothing yet, with a way forward. |
| [`navbar`](navbar/README.md) ✦ | The bar on top of the app: brand, search, actions, and the menu button opening the sidebar on small screens. |
| [`page-header`](page-header/README.md) | The top of a page: its title, a short description and the page's actions. |
| [`progress`](progress/README.md) | A bar showing how far a task has come. |
| [`sidebar`](sidebar/README.md) ✦ | The app's main navigation: grouped links with icons and counts, collapsible to icons, opened over the page on small screens. |
| [`stat-card`](stat-card/README.md) | A key figure with its label and, optionally, how it changed over a period. |
| [`toast`](toast/README.md) ✦ | Short-lived notifications in a fixed region, added on page load or by Turbo Streams, dismissed after a timeout or by the user. |
| [`tooltip`](tooltip/README.md) ✦ | A short label shown while a control is hovered or focused, also announced as its description. |

### Forms

| Recipe | |
|---|---|
| [`form-theme`](form-theme/README.md) | A Symfony form theme that renders every row through `FormField` and every control through the kit's `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Label` and `Button` components. |
| [`form-field`](form-field/README.md) | A labelled form control with its help text and error message, wired by id (used by the form theme). |

### Layouts

| Recipe | |
|---|---|
| [`layouts`](layouts/README.md) | Page layouts to extend: an app shell with sidebar and navbar, a centered auth ground, settings, errors and a blank page. |

### Blocks

| Recipe | |
|---|---|
| [`dashboard-home`](dashboard-home/README.md) | A dashboard home: page header, key figures, two cards and a table of recent orders. |
| [`login`](login/README.md) | A sign-in card rendering a Symfony login form through the form theme, with the last authentication error. |
| [`signup`](signup/README.md) | A registration card rendering a Symfony form through the form theme. |
| [`forgot-password`](forgot-password/README.md) | A card asking for an email address to send a password reset link, then confirming it was sent. |
| [`settings-profile`](settings-profile/README.md) | A profile settings card: avatar, name and a Symfony form rendered through the form theme. |
| [`not-found`](not-found/README.md) | The content of a 404 (or any error) page: status, title, explanation and a way back. |

A Live Component `data-table` (sortable, paginated) is planned, not built yet.

## Updating

Recipes are copies you own, so an update is a change you review like any other. Commit first, then re-run
`ux:install <recipe>` against the newer kit version: for each file that already exists it asks before
overwriting (`--force` overwrites them all, `--no-interaction` keeps them all). Review the result with
`git diff` and keep your own changes where you need them. Pin a version with `--kit=…:<tag>` to install
the same files on every machine.

## Turbo and Live Components

Rules the recipes follow, verified by the Playwright specs against the demo's `/lab` pages
(`tests/e2e/lab.*.spec.ts`) and its `/demo` app:

- **Stimulus only.** A controller connects to new markup (Turbo visits, Turbo Frames, Live re-renders,
  Turbo Streams) and cleans up everything in `disconnect()`: a dropdown stays open through a Live re-render,
  a `<dialog>` (modal, drawer) stays modal, tooltips and dropdowns keep working in re-sorted Live rows.
- **`data-turbo-permanent` keeps the node, not its scroll.** The sidebar restores its scroll position and
  collapsed state itself; the app layout scrolls the document, which Turbo restores on Back/Forward.
- **A Live Component inside a `data-turbo-permanent` element keeps its state and stays live** (verified,
  so no rule against it).
- **Toasts go through Turbo Streams.** The toast region is permanent: render flash messages with
  `<twig:Toast:Stream>` (every layout does, from `base.html.twig`), never inside the region.
- **Forms answer 303 or 422.** A submitted form redirects (303) when it succeeds and answers 422 with its
  errors; Turbo Drive rejects a 200.
- **Stable ids in re-rendered markup.** Give a tooltip (or any component with a generated id) an explicit
  `id` inside a Live Component or a Turbo Frame.

## Versioning

Versions are git tags `vX.Y.Z`: install one with `--kit=https://github.com/xormania/flowbite-xor:v0.1.0`.
Without a version, `ux:install` downloads `main`, the latest work.

## Targets

| | |
|---|---|
| Symfony UX Toolkit | ^3.5 (blocks need 3.5) |
| PHP | ≥ 8.4 (required by the toolkit) |
| Symfony | 7.4 LTS (demo app); toolkit supports ^7.4 \| ^8.0 |
| Assets | AssetMapper (Encore: npm dependencies declared) |
| Tailwind CSS | 4.x |
| Flowbite | 4.x |

## Coding agents

Paste [`docs/PROJECT-AGENTS-SNIPPET.md`](docs/PROJECT-AGENTS-SNIPPET.md) into your project's `AGENTS.md` or
`CLAUDE.md`: it tells agents to use the kit's components, theme roles and icons, and how they behave with Turbo.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the repository layout, the checks and the conventions, and
[`CHANGELOG.md`](CHANGELOG.md) for what changed.

## License

MIT — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE) (Symfony UX, Flowbite).
