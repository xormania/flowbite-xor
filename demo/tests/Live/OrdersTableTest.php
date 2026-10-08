<?php

namespace App\Tests\Live;

use App\Demo\LiveOrdersTable;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\UX\LiveComponent\Test\InteractsWithLiveComponents;
use Symfony\UX\LiveComponent\Test\TestLiveComponent;

/**
 * The demo's Live data table (`OrdersTable`, 57 orders, 10 per page by default, sorted by number descending), driven
 * through real Live requests: each set() and call() posts what the live controller would post, through the
 * endpoint, the checksum and the hydration, so a writable prop gets any value a crafted request could send.
 */
final class OrdersTableTest extends KernelTestCase
{
    use InteractsWithLiveComponents;

    private function table(): TestLiveComponent
    {
        return $this->createLiveComponent('OrdersTable', ['tableId' => 'orders', 'label' => 'Orders']);
    }

    private static function state(TestLiveComponent $component): LiveOrdersTable
    {
        $table = $component->component();
        self::assertInstanceOf(LiveOrdersTable::class, $table);

        return $table;
    }

    public function testAPagePastTheEndShowsTheLastPage(): void
    {
        $component = $this->table()->set('page', 999);

        self::assertSame(6, self::state($component)->page);
        self::assertCount(7, $component->render()->crawler()->filter('tbody tr'), '57 rows: the 6th page holds 7');
    }

    public function testAPageSizeTheTableDoesNotOfferFallsBackToTheFirst(): void
    {
        $component = $this->table()->set('pageSize', 1_000_000);

        self::assertSame(10, self::state($component)->pageSize);
        self::assertCount(10, $component->render()->crawler()->filter('tbody tr'));
    }

    public function testASortableColumnSorts(): void
    {
        $component = $this->table()->call('sortBy', ['column' => 'total']);

        $table = self::state($component);
        self::assertSame('total', $table->sort);
        self::assertSame('asc', $table->direction);
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function unknownSorts(): iterable
    {
        yield 'a column that is not sortable' => ['status'];
        yield 'a row field that is no column' => ['id'];
        yield 'SQL' => ['number; DROP TABLE orders'];
    }

    #[DataProvider('unknownSorts')]
    public function testOnlyTheSortableColumnsSort(string $sort): void
    {
        foreach ([$this->table()->set('sort', $sort), $this->table()->call('sortBy', ['column' => $sort])] as $component) {
            $table = self::state($component);
            self::assertSame('number', $table->sort, 'the default sort');
            self::assertSame('desc', $table->direction, 'in its default direction');
        }
    }

    public function testASelectionTheBrowserSendsIsCutToMaxSelection(): void
    {
        $component = $this->table()->set('selectedIds', array_map('strval', range(1, 5_000)));

        $table = self::state($component);
        self::assertSame(1_000, $table->maxSelection());
        self::assertCount(1_000, $table->selectedIds);
        self::assertTrue($table->isSelectionFull());
        self::assertStringContainsString('1000 selected, the most this table selects', $component->render()->crawler()->filter('[role="status"]')->text());
    }

    public function testHostileIdsAreDroppedFromTheSelection(): void
    {
        $component = $this->table()->set('selectedIds', ['7', 7, str_repeat('x', 129), ['nested'], null, '8']);

        self::assertSame(['7', '8'], self::state($component)->selectedIds);
    }

    public function testSelectThisPageStopsAtMaxSelection(): void
    {
        $component = $this->table()
            ->set('selectedIds', array_map('strval', range(1_001, 1_995)))
            ->call('selectPage');

        $table = self::state($component);
        self::assertCount(1_000, $table->selectedIds);
        self::assertSame(['57', '56', '55', '54', '53'], \array_slice($table->selectedIds, 995), 'the first rows of the page, in its order');
    }
}
