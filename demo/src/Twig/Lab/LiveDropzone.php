<?php

namespace App\Twig\Lab;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * Files uploaded from a Live Component through a `files` action: a Dropzone the re-renders leave alone
 * (`data-live-ignore`), in a wrapper whose id changes after each upload so that Live gives it a fresh zone. Nothing
 * is stored: the names and sizes are listed, and PHP deletes the temporary files.
 */
#[AsLiveComponent]
final class LiveDropzone
{
    use DefaultActionTrait;

    /** @var list<array{name: string, size: int}> */
    #[LiveProp]
    public array $uploads = [];

    /** @var list<string> */
    #[LiveProp]
    public array $errors = [];

    #[LiveProp(writable: true)]
    public string $note = '';

    #[LiveProp]
    public int $attempts = 0;

    #[LiveAction]
    public function upload(Request $request, ValidatorInterface $validator): void
    {
        ++$this->attempts;
        $files = $request->files->all('photos');
        $violations = $validator->validate($files, [
            new Assert\Count(min: 1, max: 3, minMessage: 'Choose at least one image.'),
            new Assert\All([new Assert\Image(maxSize: '1M')]),
        ]);
        $this->errors = array_values(array_unique(array_map(static fn ($violation): string => (string) $violation->getMessage(), iterator_to_array($violations))));
        if ([] !== $this->errors) {
            return;
        }
        foreach ($files as $file) {
            if ($file instanceof UploadedFile) {
                $this->uploads[] = ['name' => $file->getClientOriginalName(), 'size' => (int) $file->getSize()];
            }
        }
    }
}
