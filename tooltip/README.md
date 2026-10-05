# Tooltip

A short label shown while a control is hovered or focused, also announced as its description.

```twig {"preview":true}
<div class="flex gap-4 pt-12">
    <twig:Tooltip content="Saved 2 minutes ago" id="tooltip-saved">
        <twig:Button variant="outline">Saved</twig:Button>
    </twig:Tooltip>
    <twig:Tooltip content="Delete the draft" placement="bottom" id="tooltip-delete">
        <twig:Button variant="outline" size="icon" aria-label="Delete">
            <twig:ux:icon name="flowbite:close-outline" class="size-5" aria-hidden="true" />
        </twig:Button>
    </twig:Tooltip>
</div>
```

## Installation

::: installation

## Usage

```twig
<twig:Tooltip content="Text" placement="top | bottom | left | right">
    <twig:Button>Hover or focus me</twig:Button>
</twig:Tooltip>
```

Wrap a focusable element: the tooltip opens on hover and on keyboard focus, closes on Escape, and the element gets `aria-describedby`. Tooltips only describe; never put the only label of an icon button in one (give the button an `aria-label`).

Inside a Live Component or a Turbo Frame, pass a stable `id` (e.g. `id="stock-{{ row.id }}"`) so a re-render keeps the same tooltip id.
