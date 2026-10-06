# Sidebar

The app's main navigation: grouped links with icons and counts, collapsible to icons, opened over the page on small screens.

```twig {"preview":true}
<div class="h-96 w-full max-w-md overflow-hidden rounded-base border border-default">
    <twig:Sidebar id="sidebar-preview" storageKey="sidebar-preview">
        <twig:block name="header"><span class="text-lg font-semibold text-heading">[Product name]</span></twig:block>
        <twig:Sidebar:Group label="Overview">
            <twig:Sidebar:Item href="#dashboard" :active="true">
                <twig:block name="icon"><twig:ux:icon name="flowbite:chart-pie-outline" class="size-5" /></twig:block>
                Dashboard
            </twig:Sidebar:Item>
            <twig:Sidebar:Item href="#inbox" badge="3" :active="false">
                <twig:block name="icon"><twig:ux:icon name="flowbite:inbox-outline" class="size-5" /></twig:block>
                Inbox
            </twig:Sidebar:Item>
        </twig:Sidebar:Group>
        <twig:Sidebar:Group label="Account">
            <twig:Sidebar:Item href="#profile" :active="false">
                <twig:block name="icon"><twig:ux:icon name="flowbite:user-outline" class="size-5" /></twig:block>
                Profile
            </twig:Sidebar:Item>
        </twig:Sidebar:Group>
    </twig:Sidebar>
</div>
```

## Installation

::: installation

## Usage

```twig
<twig:Sidebar id="sidebar" data-turbo-permanent>
    <twig:block name="header">…brand…</twig:block>
    <twig:Sidebar:Group label="Overview">
        <twig:Sidebar:Item href="{{ path('app_dashboard') }}" route="app_dashboard" badge="3">
            <twig:block name="icon"><twig:ux:icon name="flowbite:chart-pie-outline" class="size-5" /></twig:block>
            Dashboard
        </twig:Sidebar:Item>
    </twig:Sidebar:Group>
</twig:Sidebar>
```

- **Active item:** on every page, Turbo visits included, the controller marks the item whose link has the current URL's path; a link to a fragment of the page (`#…`) is never marked. `route` also marks it on the server, before the controller connects. `:active` forces the state and turns the URL matching off for the whole sidebar, so do not use it in a `data-turbo-permanent` sidebar: Turbo keeps the first page's sidebar, and its forced state with it.
- **Turbo:** add `data-turbo-permanent` to keep the sidebar, its collapsed state and its scroll position across visits. Turbo needs an `id` for this; the sidebar always has one (`sidebar` by default).
- **Small screens:** the sidebar is hidden. The `Navbar` menu button opens it over the page, and Escape closes it. To open it from another button, dispatch a `sidebar:toggle` event on `window` with the sidebar's id: `window.dispatchEvent(new CustomEvent('sidebar:toggle', {detail: {id: 'sidebar'}}))`.
