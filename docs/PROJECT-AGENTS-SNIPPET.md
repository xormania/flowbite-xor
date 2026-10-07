# Snippet for projects using flowbite-xor

Paste the block below into a project's `AGENTS.md` or `CLAUDE.md`. It tells agents (and people) working
on the project how to use the kit's recipes.

````markdown
## UI: flowbite-xor

The UI is built from the [flowbite-xor](https://github.com/xormania/flowbite-xor) Symfony UX Toolkit kit.
Its recipes are copied into `templates/components/`, `templates/layouts/`, `templates/form/`,
`assets/controllers/` and `assets/styles/flowbite-xor.css` (the theme's color roles); we own those files.

- **Use the kit's components, not raw Flowbite HTML.** `<twig:Button>`, `<twig:Modal>`, `<twig:Dropdown>`,
  `<twig:Toast:Stream>`, `<twig:FormField>`… A missing one is installed with
  `php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor` (the kit's README
  lists them), not written by hand.
- **No Flowbite JavaScript.** Never `import 'flowbite'` or call `initFlowbite()`: behavior lives in the
  recipes' Stimulus controllers, which survive Turbo visits and Live Component re-renders.
- **Colors through the theme's roles only**: `bg-brand`, `text-heading`, `text-body`, `border-default`,
  `bg-neutral-primary-soft`, `text-fg-danger-strong`… Never raw palette colors (`bg-blue-700`,
  `text-gray-500`) or `dark:` color overrides: the roles already switch with the theme and pass the
  contrast checks.
- **Icons with UX Icons from the `flowbite` set**: `<twig:ux:icon name="flowbite:check-circle-outline" />` or
  `ux_icon('flowbite:check-circle-outline')`. Write each name in full: `php bin/console ux:icons:lock` finds only
  those, downloads them into `assets/icons/`, and you commit that folder. A name built from a variable
  (`flowbite:arrow-{{ dir }}-outline`) is missed.
- **Toasts through Turbo Streams.** The toast region (`#toasts`) is `data-turbo-permanent`: Turbo keeps the
  one already on screen, so toasts rendered inside it on a later page are dropped. Render
  `<twig:Toast:Stream>` in the page body (every kit layout does it for flash messages) or in a Turbo Stream
  response.
- **Lists of records: `ux:install data-table`**, then one class per table extending
  `App\FlowbiteXor\DataTable\AbstractDataTable` with `columns()` and `loadPage(TableQuery): TableResult`; the
  controller passes `$table->handleRequest($request)` to `<twig:DataTable :table="table" id="…" />`. The query is
  already checked: sort by `$query->sortField`, never by a raw request value. Custom cells go in
  `<twig:block name="cell_<key>">` (not `{% block %}`, which does not compile `<twig:…>` inside a component).
  Keep `src/FlowbiteXor/` as the recipe installed it. For row selection, bulk actions or search while typing,
  `ux:install data-table-live`: the same class extends `AbstractLiveDataTable` with
  `#[AsLiveComponent(name: '…', template: 'components/DataTableLive.html.twig')]`, rendered as
  `<twig:Name tableId="…" />` with no controller code; a bulk action is a `#[LiveAction]` reading `$this->selectedIds`
  (browser input: check each id). Back leaves a Live table; the plain one walks its states.
- **Searchable selects: `ux:install autocomplete`**, then `'autocomplete' => true` on a choice field (`ChoiceType`,
  `EntityType`, `CountryType`…; `'multiple' => true` for several, `'tom_select_options' => ['create' => true]` for
  typed values). Options searched on the server: a field class with `#[AsAutocompleteField]` whose parent is
  `AutocompleteChoiceType` (or `#[AsEntityAutocompleteField]` with `BaseEntityAutocompleteType`); its search URL is
  public unless you set its `security` option. Outside a form: `<twig:Autocomplete id="…" name="…">` with
  `<option>`s inside, its label with a matching `for` and no `id` of its own. In a Live Component form, use the form
  option, not the component. Never import Tom Select's own stylesheet: the recipe's replaces it.
- **Live Components may sit inside `data-turbo-permanent` elements**: they keep their state and stay live
  across visits. A permanent element keeps its node but not its scroll position: if it scrolls, restore the
  position yourself, as the kit's `Sidebar` does.
- **Forms answer 303 or 422.** A submitted form redirects (303) when it succeeds and re-renders with 422
  when it has errors; Turbo Drive rejects a 200. Forms render through the kit's form theme: set
  `twig.form_themes: ['form/flowbite_layout.html.twig']` for your own forms (`LoginForm`, `SignupForm`,
  `ForgotPasswordForm` and `SettingsProfile` apply it themselves).
- **Layouts:** pages extend `layouts/app.html.twig` (or `auth`, `settings`, `error`, `blank`). Inside a
  component's content (`<twig:Card>…</twig:Card>`), `block('x')` means the component's block: reach the
  page's own blocks with `block(outerBlocks.x)`.
- **Props and attributes are trusted input.** Give `as`, attribute names and URLs values the code chose
  (constants, `path()`, `url()`), never request or user data unchecked. `as` falls back to the component's default
  tag, and the kit's link props (`Sidebar:Item href`, `LoginForm forgotPasswordHref`…) render `#` for a URL that is
  not relative, http(s), mailto or tel; an `href` or `src` given as an attribute is not checked.
- **No inline script, style or event handler** (`<script>`, `<style>`, `style="…"`, `onclick="…"`) in
  templates: a Content Security Policy blocks them unless they carry its nonce or hash, and no nonce covers an
  attribute. Behavior goes in Stimulus controllers, styles in Tailwind classes or the stylesheet. Under a policy,
  set `csp_script_nonce` and `csp_style_nonce` for the layouts (the `layouts` README).
- **Stable ids inside Live Components and Turbo Frames**: give a `<twig:Tooltip>` an explicit `id`, e.g.
  `id="stock-{{ row.id }}"`; its generated id would change on every re-render.
- **CSS order:** `flowbite.min.css` is imported after Tailwind and has its own copies of common utilities
  (`flex`, `hidden`…). Coming last, they beat a responsive variant that Flowbite's file lacks: `flex max-md:hidden`
  stays `flex`, `hidden xl:flex` stays hidden. Mark the variant important (`max-md:hidden!`) and check the
  computed style in the browser. Its `max-w-2xl` is also 16rem, not 42rem: do not use it.
````
