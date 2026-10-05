# Drawer

A panel sliding over one side of the page, for navigation, filters or details, as a native `<dialog>`.

```twig {"preview":true}
<div style="min-height: 360px">
    <twig:Drawer id="filters" open>
        <twig:Drawer:Trigger>
            <twig:Button variant="outline" {{ ...drawer_trigger_attrs }}>Filters</twig:Button>
        </twig:Drawer:Trigger>
        <twig:Drawer:Content>
            <twig:Drawer:Header>
                <twig:Drawer:Title>Filters</twig:Drawer:Title>
            </twig:Drawer:Header>
            <twig:Drawer:Body>
                <p>Narrow the list down by status and date.</p>
                <twig:Drawer:Close>
                    <twig:Button {{ ...drawer_close_attrs }}>Apply</twig:Button>
                </twig:Drawer:Close>
            </twig:Drawer:Body>
        </twig:Drawer:Content>
    </twig:Drawer>
</div>
```

## Installation

::: installation

## Usage

```twig
<twig:Drawer id="menu" placement="left | right | top | bottom" :modal="true" :open="false">
    <twig:Drawer:Trigger>
        <twig:Button {{ ...drawer_trigger_attrs }}>Open</twig:Button>
    </twig:Drawer:Trigger>
    <twig:Drawer:Content>
        <twig:Drawer:Header><twig:Drawer:Title>Title</twig:Drawer:Title></twig:Drawer:Header>
        <twig:Drawer:Body>…</twig:Drawer:Body>
    </twig:Drawer:Content>
</twig:Drawer>
```

A modal drawer traps focus and makes the page inert (native `showModal()`); Escape or a click on the backdrop closes it. With `:modal="false"` the page stays usable and Escape still closes the drawer while focus is inside it.
