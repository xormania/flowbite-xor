<?php

namespace App\FlowbiteXor\Editor;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;

/**
 * `{{ post.body|flowbite_editor_html }}`: prints HTML written with the editor, sanitized again with
 * {@see EditorHtmlPolicy}, so content saved by another path is safe too. Never print it with `|raw`.
 */
final class EditorExtension extends AbstractExtension
{
    public function __construct(private readonly EditorHtmlPolicy $policy)
    {
    }

    public function getFilters(): array
    {
        return [new TwigFilter('flowbite_editor_html', fn (?string $html): string => null === $html ? '' : $this->policy->sanitize($html), ['is_safe' => ['html']])];
    }
}
