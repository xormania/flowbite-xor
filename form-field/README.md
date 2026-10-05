# Form Field

A labelled form control with its help text and error message, wired by id (used by the form theme).

```twig {"preview":true}
<div class="w-full max-w-sm space-y-6">
    <twig:FormField for="email" label="Email" help="We never share it." required>
        <twig:Input id="email" type="email" placeholder="name@example.com" aria-describedby="email-help" required />
    </twig:FormField>
    <twig:FormField for="username" label="Username" error="This username is already taken.">
        <twig:Input id="username" value="bonnie" aria-invalid="true" aria-describedby="username-error" />
    </twig:FormField>
</div>
```

## Installation

::: installation

## Usage

```twig
<twig:FormField for="email" label="Email" help="Hint" error="{{ error }}" required>
    <twig:Input id="email" aria-describedby="email-help email-error" aria-invalid="{{ error ? 'true' : 'false' }}" />
</twig:FormField>
```

The component lays the field out and gives the help and error their ids (`<for>-help`, `<for>-error`); the control references them with `aria-describedby` and sets `aria-invalid` when there is an error (the form theme does it for Symfony forms).
