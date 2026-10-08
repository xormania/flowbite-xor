<?php

namespace App\Tests\DataTable;

use App\FlowbiteXor\DataTable\TableQuery;
use App\Tests\DataTable\Fixtures\RecordingDataTable;
use PHPUnit\Framework\TestCase;

/**
 * The page a query asks for never starts past the table's maxRows() (10,000), whatever the request says.
 */
final class TableQueryTest extends TestCase
{
    public function testADeepPageAtFiftyRowsIsCutToPage200(): void
    {
        $query = TableQuery::fromValues(['page' => 1_000_000, 'pageSize' => 50], new RecordingDataTable(1_000_000));

        self::assertSame(200, $query->page);
        self::assertSame(9_950, $query->offset());
    }

    public function testTheOffsetStaysBelowMaxRows(): void
    {
        $table = new RecordingDataTable(1_000_000);
        $query = TableQuery::fromValues(['page' => 1_000_000, 'pageSize' => 50], $table);

        self::assertLessThan($table->maxRows(), $query->offset());
    }

    public function testADeepPageAtTenRowsIsCutToPage1000(): void
    {
        $query = TableQuery::fromValues(['page' => 1_000_000, 'pageSize' => 10], new RecordingDataTable(1_000_000));

        self::assertSame(1_000, $query->page);
        self::assertSame(9_990, $query->offset());
    }

    public function testWithPageKeepsTheSameBound(): void
    {
        $query = TableQuery::fromValues(['page' => 1, 'pageSize' => 10], new RecordingDataTable(1_000_000));

        self::assertSame(5, $query->withPage(5)->page);
        self::assertSame(1_000, $query->withPage(\PHP_INT_MAX)->page);
    }
}
