# Stat Card

A key figure with its label and, optionally, how it changed over a period.

```twig {"preview":true}
<div class="grid w-full gap-4 sm:grid-cols-3">
    <twig:StatCard label="Revenue" value="$48,250" trend="up" change="12%" period="vs last month" />
    <twig:StatCard label="Refunds" value="$1,920" trend="down" change="3.4%" period="vs last month" />
    <twig:StatCard label="Active customers" value="1,284" />
</div>
```

## Installation

::: installation

## Usage

```twig
<twig:StatCard label="Revenue" value="{{ revenue|format_currency('USD') }}" trend="up | down" change="12%" period="vs last month" />
```

The trend is announced to screen readers ("Increased by 12%"), not only shown by the arrow and color.
