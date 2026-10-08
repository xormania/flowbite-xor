<?php

namespace App\FlowbiteXor\Editor;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

/**
 * The editor's formatting, and nothing else: what the `editor` recipe's toolbar can produce is what this policy keeps.
 * Paragraphs and line breaks, bold, italic, underline, strike, inline code, level 2 and 3 headings, lists (an ordered
 * list keeps its `start`), quotes, horizontal lines, and links to https, http, mailto or a relative URL, always with
 * `rel="noopener noreferrer nofollow"`. No `style`, `class`, `id`, `data-*`, event attribute, image or `target`.
 * Other formatting and structure tags (`b`, `span`, `div`, `h1`, tables…) are unwrapped, their text kept; scripts,
 * styles, images, media, frames and forms are removed with their content.
 *
 * Copied into your app by `ux:install editor`: change it with the recipe's toolbar, never one without the other.
 */
final class EditorHtmlPolicy
{
    /** The most bytes of HTML a field accepts by default. */
    public const MAX_BYTES = 100_000;

    /** The most characters of text a field accepts by default. */
    public const MAX_CHARS = 20_000;

    private const ELEMENTS = ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'h2', 'h3', 'ul', 'li', 'blockquote', 'hr'];

    /** Tags removed with their text kept (formatting and structure from elsewhere); anything else not allowed is dropped whole. */
    private const UNWRAPPED = ['b', 'i', 'del', 'strike', 'ins', 'mark', 'small', 'sub', 'sup', 'span', 'font', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'h1', 'h4', 'h5', 'h6', 'pre', 'kbd', 'samp', 'abbr', 'cite', 'q', 'dl', 'dt', 'dd', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption'];

    private readonly HtmlSanitizer $sanitizer;

    public function __construct()
    {
        $config = (new HtmlSanitizerConfig())
            // a parser safeguard; fields reject longer input before sanitizing (EditorType)
            ->withMaxInputLength(10 * self::MAX_BYTES)
            ->allowLinkSchemes(['https', 'http', 'mailto'])
            ->allowRelativeLinks(true)
            ->allowElement('ol', ['start'])
            ->allowElement('a', ['href', 'title'])
            ->forceAttribute('a', 'rel', 'noopener noreferrer nofollow');
        foreach (self::ELEMENTS as $element) {
            $config = $config->allowElement($element);
        }
        foreach (self::UNWRAPPED as $element) {
            $config = $config->blockElement($element);
        }
        $this->sanitizer = new HtmlSanitizer($config);
    }

    /** The HTML with only the editor's formatting; '' when it holds no text (e.g. `<p></p>`). */
    public function sanitize(string $html): string
    {
        $clean = trim($this->sanitizer->sanitize($html));

        return self::isEmpty($clean) ? '' : $clean;
    }

    /** The number of characters of text, not counting markup. */
    public static function textLength(string $html): int
    {
        return mb_strlen(html_entity_decode(strip_tags($html), \ENT_QUOTES | \ENT_HTML5, 'UTF-8'));
    }

    /** Whether the HTML holds no text and no horizontal line. */
    public static function isEmpty(string $html): bool
    {
        return '' === trim(html_entity_decode(strip_tags($html), \ENT_QUOTES | \ENT_HTML5, 'UTF-8'), " \t\n\r\0\x0B\u{A0}") && !str_contains($html, '<hr');
    }
}
