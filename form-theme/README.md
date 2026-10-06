# Form theme

A Symfony form theme that renders every row through `FormField` and every control through the kit's `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Label` and `Button` components.

## Installation

::: installation

## Usage

Use it for every form of the application in `config/packages/twig.yaml`:

```yaml
twig:
    form_themes: ['form/flowbite_layout.html.twig']
```

or for one form:

```twig
{% form_theme form 'form/flowbite_layout.html.twig' %}
{{ form(form) }}
```

What it renders:

- **Rows**: a `FormField` with the label, the control, the help text (`<id>_help`) and the errors (`<id>_error`). The control gets `aria-describedby` pointing at both, and `aria-invalid="true"` when there are errors. Required fields get a marker on the label.
- **Groups**: expanded choices (radios, checkboxes), dates in three selects and sub-forms are a `fieldset` whose `legend` is the label.
- **Controls**: text-like types through `Input`, `textarea` through `Textarea`, collapsed choices through `Select`, checkboxes and radios through `Checkbox`/`Radio` with a `Label`, buttons through `Button`. To pick a `Button` variant, give the button field `'attr' => ['variant' => 'outline']` in the form type, or `attr: {variant: 'outline'}` in Twig.
- Everything else (hidden, range, color, collections) falls back to Symfony's `tailwind_2_layout.html.twig`.

The theme only arranges components: their classes stay in the component templates, so a form and a hand-written page look the same.

### With a Live Component

A form in a Live Component (`ComponentWithFormTrait`) re-renders through the same theme; errors appear on the fields the user has changed:

```php
// src/Twig/Components/ProfileForm.php
#[AsLiveComponent]
final class ProfileForm extends AbstractController
{
    use ComponentWithFormTrait;
    use DefaultActionTrait;

    protected function instantiateForm(): FormInterface
    {
        return $this->createForm(ProfileType::class);
    }

    #[LiveAction]
    public function save(): void
    {
        $this->submitForm();
        // ... persist $this->getForm()->getData()
    }
}
```

```twig
{# templates/components/ProfileForm.html.twig #}
<div {{ attributes }}>
    {{ form_start(form, {attr: {'data-action': 'live#action:prevent', 'data-live-action-param': 'save', novalidate: true}}) }}
        {{ form_row(form.name) }}
        {{ form_row(form.email) }}
        <twig:Button type="submit">Save</twig:Button>
    {{ form_end(form) }}
</div>
```
