<?php

/*
 * Checks the data tables' limits on what a request makes the server do: the page a query asks for never starts past
 * maxRows(), fetch() counts once and loads rows once at most (never for a page past the end, never when nothing
 * matches), and the Live table's selection keeps at most maxSelection() ids of at most 128 characters.
 *
 * Usage, with the demo's dependencies installed (its autoloader maps App\FlowbiteXor\… to the recipes' src/):
 *     php tools/tests/data-table.php
 */

use App\FlowbiteXor\DataTable\AbstractDataTable;
use App\FlowbiteXor\DataTable\Column;
use App\FlowbiteXor\DataTable\TableQuery;
use App\FlowbiteXor\DataTableLive\AbstractLiveDataTable;

require \dirname(__DIR__, 2).'/demo/vendor/autoload.php';

$failures = 0;
function check(bool $condition, string $what): void
{
    global $failures;
    echo ($condition ? 'ok   ' : 'FAIL ').$what."\n";
    $failures += $condition ? 0 : 1;
}

/** A table of $total rows that records each loader call. */
trait RecordingTable
{
    /** @var list<string> */
    public array $calls = [];

    public function __construct(public int $total = 120)
    {
    }

    public function columns(): array
    {
        return [Column::make('number', 'Order')->sortable()];
    }

    public function pageSizes(): array
    {
        return [50, 10];
    }

    protected function countRows(TableQuery $query): int
    {
        $this->calls[] = 'count';

        return $this->total;
    }

    protected function loadRows(TableQuery $query): array
    {
        $this->calls[] = 'rows@'.$query->offset();
        $rows = [];
        for ($id = $query->offset() + 1; $id <= min($this->total, $query->offset() + $query->pageSize); ++$id) {
            $rows[] = ['id' => $id, 'number' => $id];
        }

        return $rows;
    }
}

final class Table extends AbstractDataTable
{
    use RecordingTable;
}

final class LiveTable extends AbstractLiveDataTable
{
    use RecordingTable;
}

// the page a query asks for
$table = new Table(1_000_000);
$query = TableQuery::fromValues(['page' => 1_000_000, 'pageSize' => 50], $table);
check(200 === $query->page && 9_950 === $query->offset(), 'page 1,000,000 at 50 rows asks for page 200, offset 9,950');
check($query->offset() < $table->maxRows(), 'the offset stays below maxRows()');
$query = TableQuery::fromValues(['page' => 1_000_000, 'pageSize' => 10], $table);
check(1_000 === $query->page && 9_990 === $query->offset(), 'at 10 rows, page 1,000, offset 9,990');
check(5 === $query->withPage(5)->page && 1_000 === $query->withPage(\PHP_INT_MAX)->page, 'withPage() keeps the same bound');

// fetch(): one count, one load of rows at most
[$query, $result] = $table->fetch(TableQuery::fromValues(['page' => 1_000_000, 'pageSize' => 50], $table));
check(['count', 'rows@9950'] === $table->calls, 'a deep page in a large table: one count, one load at offset 9,950');
check(1_000_000 === $result->total && 50 === \count($result->rows), 'the total is the matching rows, the rows one page');

$table = new Table(120);
[$query, $result] = $table->fetch(TableQuery::fromValues(['page' => 150, 'pageSize' => 50], $table));
check(['count', 'rows@100'] === $table->calls, 'a page past the end: one count, then the last page loaded once');
check(3 === $query->page && 20 === \count($result->rows), 'the last page is the one shown');

$table = new Table(0);
[$query, $result] = $table->fetch(TableQuery::fromValues(['page' => 7], $table));
check(['count'] === $table->calls && [] === $result->rows && 1 === $query->page, 'no matching row: the rows are not loaded');

// the Live table's selection
$live = new LiveTable(120);
$ids = array_map('strval', range(1, 5_000));
check(1_000 === \count($live->hydrateSelectedIds($ids)), '5,000 ids sent: the first 1,000 kept');
check(['1', '2'] === $live->hydrateSelectedIds([1, '1', 2, str_repeat('x', 129), ['nested'], null]), 'ids once each, as strings; too long and non-scalar ids dropped');
check(\strlen(str_repeat('x', 128)) === \strlen($live->hydrateSelectedIds([str_repeat('x', 128)])[0] ?? ''), 'an id of 128 characters is kept');
check([] === $live->hydrateSelectedIds('1,2,3'), 'a selection that is not a list is empty');
check([str_repeat('😀', 128)] === $live->hydrateSelectedIds([str_repeat('😀', 128)]), 'an id of 128 multibyte characters (512 bytes) is kept');
check([] === $live->hydrateSelectedIds([str_repeat('é', 129)]), 'an id of 129 multibyte characters is dropped');

$live = new LiveTable(120);
$live->pageSize = 50;
$live->selectedIds = array_map('strval', range(1_001, 1_990));
$live->prepare();
$live->selectPage();
check(1_000 === \count($live->selectedIds) && $live->isSelectionFull(), '"Select this page" stops at maxSelection()');
check($live->isSelected(['id' => 1]) && !$live->isSelected(['id' => 11]), 'it added the page\'s first rows up to the limit');

exit($failures > 0 ? 1 : 0);
