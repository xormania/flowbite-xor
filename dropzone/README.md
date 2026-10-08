# Dropzone

File uploads with [Symfony UX Dropzone](https://symfony.com/bundles/ux-dropzone/current/index.html), styled with the kit's theme: drag and drop or browse, a preview of the picked image, several files that add up across picks.

```twig {"preview":true}
<div class="w-full max-w-md">
    <twig:FormField for="dropzone-default" label="Profile picture">
        <twig:Dropzone id="dropzone-default" name="photo" />
    </twig:FormField>
</div>
```

## Installation

::: installation

Then:

1. Run the `composer require` command `ux:install` prints (`symfony/ux-dropzone`). Symfony Flex registers the bundle
   and adds its Stimulus controller to `assets/controllers.json` and its entry to `importmap.php`; the package has no
   Flex recipe of its own.
2. Import the stylesheet after the kit's, in `assets/styles/app.css`:

   ```css
   @import "./flowbite-xor-dropzone.css";
   ```

3. Turn off UX Dropzone's own stylesheet in `assets/controllers.json`: this recipe's replaces it.

   ```json
   "@symfony/ux-dropzone": {
       "dropzone": {
           "enabled": true,
           "fetch": "eager",
           "autoimport": {
               "@symfony/ux-dropzone/dist/style.min.css": false
           }
       }
   }
   ```

## Usage

`Dropzone` renders UX Dropzone's markup with its controller, and the kit's `dropzone-assist` controller next to it.
`class` goes to the box's wrapper; every other attribute goes to the `<input type="file">`: `id`, `name`, `accept`,
`required`, `disabled`, `form`, `capture`, `aria-*`, `data-*`. A `data-controller` you pass joins UX Dropzone's, on
the wrapper, so your own controller can listen to its events.

```twig
<twig:Dropzone id="photo" name="photo" accept="image/png,image/jpeg" hint="PNG or JPG, up to 1 MB" />
<twig:Dropzone id="attachments" name="attachments[]" multiple />
```

- Give it a stable `id`, and its label a matching `for` (`FormField` does both): a click on the label opens the file
  chooser.
- `placeholder` is the main line and `hint` a smaller one, which also describes the input.
- `multiple`: picks add up in a list under the box, each file with its own Remove button; a file picked twice is
  kept once. Name the input with `[]` (`attachments[]`) so the server receives every file.
- `removeLabel` names the Remove buttons, followed by the file name: "Remove photo.png".
- `reselect` shows a note in the box, which describes the input, such as a file the server did not keep.
- The `content` block replaces the icon and the placeholder, for a custom look; `hint` and `reselect` stay under it.
- In an invalid field, set `aria-invalid="true"` and point `aria-describedby` at the error: the box turns red.

### Outside a form

A hand-written form needs `method="post"` and `enctype="multipart/form-data"`. Without the `enctype`, the browser
sends the file names only, and Turbo sends no file.

```twig
<form method="post" action="{{ path('app_upload') }}" enctype="multipart/form-data">
    <twig:FormField for="files" label="Files">
        <twig:Dropzone id="files" name="files[]" multiple />
    </twig:FormField>
    <twig:Button type="submit" class="mt-4">Upload</twig:Button>
</form>
```

### Saving the files

The controller reads the files from the request (`$request->files->get('photo')`, `$request->files->all('files')`
for several), checks them with the Validator (`File`, `Image`, and `All` plus `Count` for several), and moves them
out of PHP's temporary directory. Never trust the name or the type the browser sent:

```php
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\String\Slugger\SluggerInterface;

/** @param UploadedFile $file a file the Validator accepted */
function store(UploadedFile $file, SluggerInterface $slugger, string $uploadDir): string
{
    $name = $slugger->slug(pathinfo($file->getClientOriginalName(), \PATHINFO_FILENAME))->lower();
    // the extension guessed from the content, not the one the browser sent
    $fileName = \sprintf('%s-%s.%s', $name, bin2hex(random_bytes(6)), $file->guessExtension() ?? 'bin');
    $file->move($uploadDir, $fileName); // a directory outside public/, served by a controller that checks access

    return $fileName;
}
```

### Limits

The Validator's constraints decide what is accepted: the browser checks nothing, `accept` only filters the file
chooser. PHP's own limits come first: a file over `upload_max_filesize` reaches the controller as an upload error
(the `File` constraint reports it), and a request over `post_max_size` reaches it empty, every field and file
dropped. Raise both in `php.ini` above your largest constraint, `post_max_size` above the sum of the files.

### With Turbo

- Turbo submits a `multipart/form-data` form with its files. Answer 303 on success and 422 with the errors, as for
  any form.
- Files never come back from the server: after a 422, or when a Turbo Stream replaces the field, the zone is empty
  and the user picks the files again. Say so next to the errors.
- After Back, a zone for one file starts empty. A zone for several files lists what its input holds: Turbo's copy of
  the page keeps the files in some browsers (Chromium), not in others.
- A zone inside a `data-turbo-permanent` element keeps its files across visits.

### Events

UX Dropzone dispatches these events on the wrapper, all bubbling: `dropzone:connect`, `dropzone:change` (the `File`,
or the `FileList` with `multiple`), `dropzone:clear` (one file, Remove) and `dropzone:remove` (several files, the
removed `File`). Listen to them from your own controller, on the `Dropzone` (its `data-controller` joins UX
Dropzone's on the wrapper) or on an element around it:

```twig
<div data-controller="photo-upload" data-action="dropzone:change->photo-upload#show">
    <twig:Dropzone id="photo" name="photo" />
</div>
```

### Content Security Policy

The markup has no `style` attribute and no inline handler. UX Dropzone shows and hides its parts through the CSSOM,
which a policy allows, and shows an image preview as a `data:` URL: the policy's `img-src` needs `data:`.

## Examples

### Hint and accepted types

```twig {"preview":true}
<div class="w-full max-w-md">
    <twig:FormField for="dropzone-hint" label="Cover image">
        <twig:Dropzone id="dropzone-hint" name="cover" accept="image/png,image/jpeg" placeholder="Drop an image or browse" hint="PNG or JPG, up to 2 MB" />
    </twig:FormField>
</div>
```

### Multiple files

```twig {"preview":true}
<div class="w-full max-w-md">
    <twig:FormField for="dropzone-multiple" label="Attachments">
        <twig:Dropzone id="dropzone-multiple" name="attachments[]" multiple hint="Up to 3 files" />
    </twig:FormField>
</div>
```

### Invalid

```twig {"preview":true}
<div class="w-full max-w-md">
    <twig:FormField for="dropzone-invalid" label="Profile picture" help="PNG or JPG, up to 1 MB." error="The file is too large (1.5 MB). The maximum allowed size is 1 MB.">
        <twig:Dropzone id="dropzone-invalid" name="photo" accept="image/png,image/jpeg" aria-invalid="true" aria-describedby="dropzone-invalid_help dropzone-invalid_error" />
    </twig:FormField>
</div>
```

### Disabled

```twig {"preview":true}
<div class="w-full max-w-md">
    <twig:FormField for="dropzone-disabled" label="Contract">
        <twig:Dropzone id="dropzone-disabled" name="contract" disabled hint="Uploads are closed" />
    </twig:FormField>
</div>
```

### Custom content

```twig {"preview":true}
<div class="w-full max-w-md">
    <twig:FormField for="dropzone-custom" label="Invoice">
        <twig:Dropzone id="dropzone-custom" name="invoice" accept="application/pdf" hint="PDF only">
            <twig:ux:icon name="flowbite:paper-clip-outline" class="size-8 text-body" aria-hidden="true" />
            <p class="text-sm text-body"><span class="font-semibold text-heading">Click to upload</span> or drag and drop</p>
        </twig:Dropzone>
    </twig:FormField>
</div>
```

## Accessibility

- The file input stays the control: it covers the box, takes the focus (the box shows the focus ring), opens the
  chooser with Enter or Space, and is named by its label.
- After a pick made from the keyboard, focus moves to the Remove button, named "Remove photo.png", which tells a
  screen reader what was picked; Remove puts it back on the input. With `multiple`, the list is announced as it
  changes, and removing a file focuses the next Remove button, else the input.
- A file dropped outside the input (on the list or the preview) is refused, so the browser never opens it in the tab.

## Security

`Dropzone` has no tag, URL or attribute-name prop. Its attributes render escaped, as the kit's README says
(*Security*).
