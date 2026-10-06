# flowbite-xor

A [Symfony UX Toolkit](https://symfony.com/bundles/ux-toolkit/current/index.html) kit built on the free
[Flowbite](https://flowbite.com/) v4 library and Tailwind CSS v4. A kit is a set of recipes. A recipe (not a
Symfony Flex recipe) is one thing you install with `php bin/console ux:install`: the theme, a Twig component and
its Stimulus controller, the form theme, the page layouts, or a block, a ready-made part of a page such as a
login card or a dashboard.

`ux:install` copies a recipe's files into your project, where you own them. Every behavior is a Stimulus
controller (no Flowbite JavaScript, no global `initFlowbite()`), so components keep working when Turbo
navigates and when Live Components re-render them.

22 components are copied from the UX Toolkit's official `flowbite-4` kit, which loads Flowbite's JavaScript.
This kit replaces that JavaScript with its own Stimulus controllers, fixes the contrast of some theme colors, and
adds components, a form theme, layouts and blocks. [`UPSTREAM.md`](UPSTREAM.md) lists every change to the copied
files.

## Install

Requires PHP 8.4 or later with the `zip` extension (the toolkit unpacks GitHub's archive of the kit).
On a new project (`composer create-project symfony/skeleton`), run these once, in this order:

```bash
# 1. Allow Flex contrib recipes. Every component uses the `tailwind_classes` Twig filter, and a contrib
#    recipe enables its bundle (tales-from-a-dev/twig-tailwind-extra).
composer config extra.symfony.allow-contrib true
# 2. Twig and Twig components as regular dependencies. If they only come in with the toolkit (a dev
#    dependency), cache:clear fails with "non-existent service property_accessor".
composer require symfony/twig-bundle symfony/ux-twig-component
# 3. The toolkit, and the HTTP client it downloads the kit with.
composer require --dev symfony/ux-toolkit:^3.5 symfony/http-client
# 4. AssetMapper and StimulusBundle: the layouts load the `app` importmap entrypoint, and StimulusBundle
#    loads the recipes' controllers from assets/controllers/.
composer require symfony/asset-mapper symfony/stimulus-bundle
```

Then set up Tailwind CSS, Flowbite's stylesheet and the `theme` recipe as the *Tailwind CSS* and *Installation*
sections of [`INSTALL.md`](INSTALL.md) say (its *Symfony* steps are the commands above). After that, install recipes:

```bash
# from main
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor

# from a release tag (`0.1.0`), a branch, or a full 40-character commit SHA (no "/": use the SHA for feat/x)
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor:<version>
```

`ux:install` also installs the recipes a recipe depends on. It then prints the commands that install the
packages they need: run the `composer require` one. The `importmap:require` and `npm install` lines are for
Flowbite's stylesheet, already installed if you followed INSTALL.md. `ux:install dashboard-home`, for instance,
brings the layouts and every component the dashboard uses, but not the `theme`. Its README shows the controller
and template that render it.

### Icons

The recipes show icons from the `flowbite` set of [UX Icons](https://symfony.com/bundles/ux-icons/current/index.html).
An icon that is not in `assets/icons/` is downloaded from the Iconify API the first time a page shows it, which
needs `symfony/http-client`. Before you deploy, save the icons in the project and commit them:

```bash
php bin/console ux:icons:lock
```

Run it again when your templates use new icons.

## Recipes

Recipes marked ✦ come with a Stimulus controller, copied to `assets/controllers/` and loaded by StimulusBundle.
Each recipe's README has its examples, props and usage.

### Theme

| Recipe | |
|---|---|
| [`theme`](theme/README.md) | Flowbite's color roles, with this kit's contrast fixes, as one stylesheet to import in `assets/styles/app.css`. A role is a named color with a light and a dark value, used as a utility: `bg-brand`, `text-heading`, `border-default`. |
| [`theme-toggle`](theme-toggle/README.md) ✦ | A button switching between the light and dark themes, remembered in `localStorage` and following the system preference until the user chooses. |

### Components from the official `flowbite-4` kit

| Recipe | |
|---|---|
| [`alert`](alert/README.md) ✦ | A message for information, success, a warning or an error, optionally dismissible. |
| [`avatar`](avatar/README.md) ✦ | A user's picture, with a fallback, in several sizes, round or with rounded corners. |
| [`badge`](badge/README.md) | A small label or count next to other content, such as a number of comments. |
| [`button`](button/README.md) | A button, or a link that looks like one, in several colors, sizes and styles. |
| [`button-group`](button-group/README.md) | Several buttons or links joined into one control. |
| [`card`](card/README.md) | A box grouping related content: text, images, a form. |
| [`checkbox`](checkbox/README.md) | A square box to select one or more options. |
| [`dropdown`](dropdown/README.md) ✦ | A menu that opens from a button and closes when the user clicks or focuses outside it. |
| [`indicator`](indicator/README.md) | A dot or number placed on another element: a status, a count, a loading label. |
| [`input`](input/README.md) | A single-line field for any input type: text, email, number, password, URL… |
| [`kbd`](kbd/README.md) | A keyboard key or shortcut shown in text. |
| [`label`](label/README.md) | A text element that identifies form controls and other content. |
| [`modal`](modal/README.md) ✦ | A dialog over the page, as a native `<dialog>`, with a close button. |
| [`pagination`](pagination/README.md) | Links to the pages of a long list. |
| [`radio`](radio/README.md) | A round button to choose one option among several. |
| [`select`](select/README.md) | A list to choose one or more options. |
| [`skeleton`](skeleton/README.md) | Placeholders shaped like the content that is loading. |
| [`spinner`](spinner/README.md) | A spinning indicator for a loading state. |
| [`table`](table/README.md) | Rows and columns of data. |
| [`tabs`](tabs/README.md) ✦ | Tabs that switch between panels, in a row or a column. |
| [`textarea`](textarea/README.md) | A multi-line text field, for a comment or a description. |
| [`toggle`](toggle/README.md) | A switch for an on/off setting. |

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
| [`tooltip`](tooltip/README.md) ✦ | A short text shown while a control is hovered or focused, also announced as its description. |

### Forms

| Recipe | |
|---|---|
| [`form-theme`](form-theme/README.md) | A Symfony form theme that renders every row through `FormField` and every control through the kit's `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Label` and `Button` components. |
| [`form-field`](form-field/README.md) | A labelled form control with its help text and error message, wired by id (used by the form theme). |

### Layouts

| Recipe | |
|---|---|
| [`layouts`](layouts/README.md) | Page layouts to extend: an app shell with sidebar and navbar, a centered column for login, signup and password reset, settings, errors and a blank page. |

### Blocks

A block is a ready-made part of a page, built from the components above. Each one is a Twig component with
its own name: `dashboard-home` renders as `<twig:DashboardHome>`, `login` as `<twig:LoginForm>`, `signup` as
`<twig:SignupForm>`, `forgot-password` as `<twig:ForgotPasswordForm>`, `settings-profile` as
`<twig:SettingsProfile>` and `not-found` as `<twig:NotFound>`.

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

Recipes are copies you own, so an update is a change you review like any other. Commit first, then reinstall
the recipe from the newer version with `--force`:

```bash
php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor:<version> --force
```

`--force` replaces every file of the recipe and of every recipe it depends on: `ux:install dashboard-home --force`
also replaces the layouts and every component the dashboard uses. Without it, the command asks about each existing
file of those recipes, but a "yes" replaces only files older than the kit's commit: a file you edited, or any file
of a fresh clone, is kept even though the command lists it as installed. Review the result with `git diff` and
bring back your own changes where you need them (`git checkout -p`). Pinning a version installs the same files on
every machine.

## Turbo and Live Components

How the recipes behave with Turbo and Live Components, and what your own pages and controllers must do:

- **Stimulus only.** A controller connects to new markup (Turbo visits, Turbo Frames, Live re-renders,
  Turbo Streams) and cleans up everything in `disconnect()`: a dropdown stays open through a Live re-render,
  a `<dialog>` (modal, drawer) stays modal, tooltips and dropdowns keep working in re-sorted Live rows.
- **`data-turbo-permanent` keeps the node, not its scroll.** The sidebar restores its scroll position and
  collapsed state itself; the app layout scrolls the document, which Turbo restores on Back/Forward.
- **Live Components work inside a `data-turbo-permanent` element**: they keep their state and stay live.
- **Toasts go through Turbo Streams.** The toast region (`<twig:ToastRegion>`, `id="toasts"`) is
  `data-turbo-permanent`: on a Turbo visit, Turbo keeps the region already on screen and drops the new page's copy,
  with any toast written inside it. Render each toast with `<twig:Toast:Stream>` instead, in the page or in a Turbo
  Stream response. The `layouts` recipe does this for flash messages in `templates/layouts/base.html.twig`, so
  every kit layout shows them.
- **Your form controllers answer 303 or 422.** Turbo Drive rejects a 200 after a form submit. On success,
  redirect with `$this->redirectToRoute('…', [], Response::HTTP_SEE_OTHER)` (the default is 302). On errors,
  render the form with `$this->render(…, ['form' => $form])`, which answers 422 when the submitted form is invalid.
- **Stable ids in re-rendered markup.** Give a `<twig:Tooltip>` an explicit `id` inside a Live Component or a
  Turbo Frame (`id="stock-{{ row.id }}"`): its generated id would change on every re-render.

## Security

Twig escapes what the components print, but escaping checks neither a tag name nor a URL. Props and attributes are
template input: give them values your code chose (constants, `path()`, `url()`), never request or stored user data
unchecked. On top of escaping, the components check what shapes their markup:

- **Tags.** An `as` prop renders only the tags its component lists: `Button` `button`, `a`; `Badge` `div`, `span`,
  `a`; `Avatar:GroupCount` `div`, `a`, `button`; `Card:Title` `span`, `div`, `p`, `h1`–`h6`; `Dropdown:Item` `a`,
  `button`; `FormField` `div`, `fieldset`. Any other value renders the default tag, without an error:
  `<twig:Button as="label">` is a `button`.
- **Link props.** The links of this kit's own recipes (`Breadcrumb:Item` and `Sidebar:Item` `href`, `LoginForm`
  `forgotPasswordHref` and `signupHref`, `ForgotPasswordForm` and `SignupForm` `loginHref`, `NotFound` `homeHref`)
  keep a relative, `http(s)`, `mailto` or `tel` URL, read as browsers read it (in any case, after leading spaces and
  control characters, with tabs and newlines inside). Any other scheme, `javascript:` and `data:` but also `sms:` or
  an app's `slack://`, silently renders `#`, and a sidebar item linking to `#` is never marked as the current page.
  The value is printed as text, even a `Markup` one (`|raw`).
- **Attributes.** Attributes given to a component, and `FormField`'s `labelAttr` and `helpAttr`, render with escaped
  names and values: a name cannot add another attribute. Otherwise they render as given, an `on…` handler or an
  `href` included. URLs given as attributes are not checked, as in the official kit: the `href` of `Button` or `Badge`
  with `as="a"`, of `Dropdown:Item` and of `Pagination:Link`, and the `src` of `Avatar:Image`. Check those yourself.
- **Content Security Policy.** The components print no inline script, style or event handler, so they work under a
  strict policy (nonces and `'strict-dynamic'`, no `'unsafe-inline'`). The layouts print their inline script and the
  importmap with your nonces: see *Content Security Policy* in [`layouts/README.md`](layouts/README.md).

`tests/e2e/hostile-props.spec.ts` renders each of these props with hostile values and checks what the browser parses.
The kit's demo enforces a strict Content Security Policy, and every browser test fails on a violation.

## Versioning

Versions are git tags `X.Y.Z`, without a `v`: GitHub names the archive of a `v1.2.3` tag `flowbite-xor-1.2.3`,
which the toolkit then cannot find. Install one with `--kit=https://github.com/xormania/flowbite-xor:<version>`;
without a version, `ux:install` downloads `main`, the latest work. [`CHANGELOG.md`](CHANGELOG.md) lists what
each version changes.

## Requirements

| | |
|---|---|
| Symfony UX Toolkit | ^3.5 (blocks need 3.5) |
| PHP | ≥ 8.4 (required by the toolkit), with the `zip` extension |
| Symfony | 7.4 LTS, the version CI tests; the toolkit also allows 8.x |
| Assets | AssetMapper. With Webpack Encore, override the layouts' `stylesheets` and `javascripts` blocks: they load the `app` importmap entrypoint |
| Tailwind CSS | 4.x |
| Flowbite | 4.x |

## Coding agents

Paste the block in [`docs/PROJECT-AGENTS-SNIPPET.md`](docs/PROJECT-AGENTS-SNIPPET.md) into your project's
`AGENTS.md` or `CLAUDE.md`: it tells agents to use the kit's components, color roles and icons, and how they
behave with Turbo.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the repository layout, the checks and the conventions, and
[`CHANGELOG.md`](CHANGELOG.md) for what changed.

## License

MIT — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE) (Symfony UX, Flowbite).
