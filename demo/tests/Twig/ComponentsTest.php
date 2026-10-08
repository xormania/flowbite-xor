<?php

namespace App\Tests\Twig;

use App\Tests\Snapshot\Html5Driver;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Snapshots\MatchesSnapshots;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\UX\TwigComponent\Test\InteractsWithTwigComponents;
use Symfony\UX\TwigComponent\Test\RenderedComponent;

/**
 * Recipes rendered through the demo's Twig, as an app renders them (the templates tools/sync-demo copies). Each
 * rendering is compared with a snapshot in __snapshots__/: a change in a recipe's markup shows in the diff of its
 * snapshot. Write the missing snapshots with `bin/phpunit`, rewrite changed ones with UPDATE_SNAPSHOTS=true, and
 * review them like any other change; CI sets CREATE_SNAPSHOTS=false, so a missing snapshot fails there.
 */
final class ComponentsTest extends KernelTestCase
{
    use InteractsWithTwigComponents;
    use MatchesSnapshots;

    public function testBadge(): void
    {
        $rendered = $this->renderTwigComponent('Badge', ['variant' => 'success', 'shape' => 'pill', 'class' => 'ms-2'], 'Paid');

        $badge = $rendered->crawler()->filter('div');
        self::assertCount(1, $badge);
        self::assertSame('Paid', trim($badge->text()));
        // tailwind_classes merges the class prop into the variant's classes
        self::assertStringContainsString('ms-2', (string) $badge->attr('class'));
        self::assertStringContainsString('rounded-full', (string) $badge->attr('class'));
        $this->assertMatchesSnapshot($rendered->toString(), new Html5Driver());
    }

    public function testABadgeTagNotInItsListRendersADiv(): void
    {
        $rendered = $this->renderTwigComponent('Badge', ['as' => 'SCRIPT'], 'x');

        self::assertCount(0, $rendered->crawler()->filter('script'));
        self::assertCount(1, $rendered->crawler()->filter('div'));
    }

    public function testBreadcrumb(): void
    {
        // a component with parts: a template in the `<twig:…>` syntax, as a page writes it
        $html = self::getContainer()->get('twig')->createTemplate(<<<'TWIG'
            <twig:Breadcrumb>
                <twig:Breadcrumb:Item href="/">Home</twig:Breadcrumb:Item>
                <twig:Breadcrumb:Item href="/projects">Projects</twig:Breadcrumb:Item>
                <twig:Breadcrumb:Item>Flowbite</twig:Breadcrumb:Item>
            </twig:Breadcrumb>
            TWIG)->render();
        $rendered = new RenderedComponent($html);

        self::assertSame(['/', '/projects'], $rendered->crawler()->filter('a')->extract(['href']));
        self::assertSame('Flowbite', trim($rendered->crawler()->filter('[aria-current="page"]')->text()));
        $this->assertMatchesSnapshot($html, new Html5Driver());
    }

    /**
     * @return iterable<string, array{string, string}>
     */
    public static function links(): iterable
    {
        yield 'relative' => ['/orders?page=2', '/orders?page=2'];
        yield 'https' => ['https://example.com/', 'https://example.com/'];
        yield 'javascript' => ['javascript:alert(1)', '#'];
        yield 'javascript, mixed case after a tab and spaces' => ["\t  JaVa\tScRiPt:alert(1)", '#'];
        yield 'data' => ['data:text/html,<script>alert(1)</script>', '#'];
    }

    #[DataProvider('links')]
    public function testABreadcrumbLinkKeepsOnlyAllowedSchemes(string $href, string $expected): void
    {
        $rendered = $this->renderTwigComponent('Breadcrumb:Item', ['href' => $href], 'Level');

        self::assertSame($expected, $rendered->crawler()->filter('a')->attr('href'));
    }
}
