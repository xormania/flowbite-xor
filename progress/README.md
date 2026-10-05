# Progress

A bar showing how far a task has come.

```twig {"preview":true}
<div class="w-full max-w-md space-y-6">
    <twig:Progress value="45" label="Upload" showValue />
    <twig:Progress value="80" label="Storage" variant="warning" size="lg" showValue />
    <twig:Progress value="100" label="Import" variant="success" size="sm" />
</div>
```

## Installation

::: installation

## Usage

```twig
<twig:Progress value="45" label="Upload" showValue variant="brand | success | danger | warning" size="sm | default | lg" />
```

Without a `label`, give the bar an accessible name: `<twig:Progress value="45" aria-label="Upload" />` names the wrapper, so pass a `label` whenever you can.
