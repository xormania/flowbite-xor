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

- **Active item:** `route` compares with `app.current_route`, `:active` forces it; otherwise the controller marks the item whose link matches the current URL, which also keeps a `data-turbo-permanent` sidebar right across Turbo visits.
- **Turbo:** add `data-turbo-permanent` (the sidebar has an `id`) to keep it, its collapsed state and its scroll position across visits.
- **Small screens:** the sidebar is hidden; the `Navbar` toggle (or any `sidebar:toggle` window event) opens it over the page, Escape closes it.
