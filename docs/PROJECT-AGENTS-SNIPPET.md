# Snippet for projects using flowbite-xor

Paste the block below into a project's `AGENTS.md` or `CLAUDE.md`. It tells agents (and people) working
on the project how to use the kit's recipes.

````markdown
## UI: flowbite-xor

The UI is built from the [flowbite-xor](https://github.com/xormania/flowbite-xor) Symfony UX Toolkit kit.
Its recipes are copied into `templates/components/`, `templates/layouts/`, `templates/form/`,
`assets/controllers/` and `assets/styles/flowbite-xor.css` (the theme's color roles); we own those files.

- **Use the kit's components, not raw Flowbite HTML.** `<twig:Button>`, `<twig:Modal>`, `<twig:Dropdown>`,
  `<twig:Toast>`, `<twig:FormField>`… A missing one is installed with
  `php bin/console ux:install <recipe> --kit=https://github.com/xormania/flowbite-xor` (the kit's README
  lists them), not written by hand.
- **No Flowbite JavaScript.** Never `import 'flowbite'` or call `initFlowbite()`: behavior lives in the
  recipes' Stimulus controllers, which survive Turbo visits and Live Component re-renders.
- **Colors through the theme's roles only**: `bg-brand`, `text-heading`, `text-body`, `border-default`,
  `bg-neutral-primary-soft`, `text-fg-danger-strong`… Never raw palette colors (`bg-blue-700`,
  `text-gray-500`) or `dark:` color overrides: the roles already switch with the theme and pass the
  contrast checks.
- **Icons with UX Icons from the `flowbite` set**: `<twig:ux:icon name="flowbite:check-circle-outline" />` or
  `ux_icon('flowbite:check-circle-outline')`. Run `php bin/console ux:icons:lock` to commit the icons in use.
- **Toasts through Turbo Streams.** The toast region (`#toasts`) is `data-turbo-permanent`: Turbo keeps the
  one already on screen, so toasts rendered inside it on a later page are dropped. Render
  `<twig:Toast:Stream>` in the page body (every kit layout does it for flash messages) or in a Turbo Stream
  response.
- **Live Components inside `data-turbo-permanent` elements work** (they keep their state and stay live,
  verified in the kit's tests). A permanent element keeps its node, not its scroll position: the sidebar
  restores its own.
- **Forms answer 303 or 422.** A submitted form redirects (303) when it succeeds and re-renders with 422
  when it has errors; Turbo Drive rejects a 200. Forms render through the kit's form theme: set
  `twig.form_themes: ['form/flowbite_layout.html.twig']` for your own forms (the kit's form blocks apply it
  themselves).
- **Layouts:** pages extend `layouts/app.html.twig` (or `auth`, `settings`, `error`, `blank`). Inside a
  component's content (`<twig:Card>…</twig:Card>`), `block('x')` means the component's block: reach the
  page's own blocks with `block(outerBlocks.x)`.
- **Stable ids inside Live Components and Turbo Frames**: give a `<twig:Tooltip>` an explicit `id`, e.g.
  `id="stock-{{ row.id }}"`; its generated id would change on every re-render.
- **CSS order:** Flowbite's stylesheet loads after Tailwind's utilities and wins ties, so a responsive variant it
  does not ship loses to a base class it does (`flex max-md:hidden` stays `flex`, `hidden xl:flex` stays
  hidden). Mark the variant important (`max-md:hidden!`) and check the computed style.
````
