<?php

namespace App\FlowbiteXor\DataTableLive;

use App\FlowbiteXor\DataTable\AbstractDataTable;
use App\FlowbiteXor\DataTable\DataTableView;
use App\FlowbiteXor\DataTable\TableQuery;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveArg;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\Attribute\PreReRender;
use Symfony\UX\LiveComponent\DefaultActionTrait;
use Symfony\UX\LiveComponent\Metadata\UrlMapping;
use Symfony\UX\TwigComponent\Attribute\PostMount;

/**
 * A data table rendered as a Live Component: the same columns(), filters() and loadPage() as AbstractDataTable,
 * plus row selection. Its state is in the URL (the same `q`, `f`, `sort`, `dir`, `page` and `size` parameters),
 * replaced on each change: Back leaves the page, and the URL brings the last state back. The selection is not in
 * the URL.
 *
 *     #[AsLiveComponent(name: 'OrdersTable', template: 'components/DataTableLive.html.twig')]
 *     final class OrdersTable extends AbstractLiveDataTable { ... }
 *
 * Render it with `<twig:OrdersTable tableId="orders" label="Orders" />`; a bulk action is a #[LiveAction] of the
 * subclass reading $this->selectedIds (check them: they come from the browser).
 */
abstract class AbstractLiveDataTable extends AbstractDataTable
{
    use DefaultActionTrait;

    #[LiveProp(writable: true, onUpdated: 'firstPage', url: new UrlMapping(as: 'q'))]
    public string $search = '';

    /**
     * The chosen value of each filter, by filter key (not `$filters`: Symfony's property accessor would read the
     * filters() method instead).
     *
     * @var array<string, string>
     */
    #[LiveProp(writable: true, onUpdated: 'firstPage', url: new UrlMapping(as: 'f'))]
    public array $filterValues = [];

    #[LiveProp(writable: true, url: true)]
    public ?string $sort = null;

    #[LiveProp(writable: true, url: new UrlMapping(as: 'dir'))]
    public string $direction = 'asc';

    #[LiveProp(writable: true, url: true)]
    public int $page = 1;

    #[LiveProp(writable: true, onUpdated: 'firstPage', url: new UrlMapping(as: 'size'))]
    public int $pageSize = 0;

    /**
     * The ids of the selected rows, on every page.
     *
     * @var list<string>
     */
    #[LiveProp(writable: true)]
    public array $selectedIds = [];

    /** The prefix of the rows' element ids, unique on the page. */
    #[LiveProp]
    public string $tableId = 'table';

    /** The table's accessible name, also its caption. */
    #[LiveProp]
    public ?string $label = null;

    private ?DataTableView $view = null;

    /**
     * Whether rows can be selected. Override it to return false for a table without bulk actions.
     */
    public function selectable(): bool
    {
        return true;
    }

    #[LiveAction]
    public function sortBy(#[LiveArg] string $column): void
    {
        $this->direction = $column === $this->sort && 'asc' === $this->direction ? 'desc' : 'asc';
        $this->sort = $column;
        $this->page = 1;
    }

    #[LiveAction]
    public function goTo(#[LiveArg] int $page): void
    {
        $this->page = $page;
    }

    /**
     * Adds the rows of the current page to the selection; the rows selected on other pages stay selected.
     */
    #[LiveAction]
    public function selectPage(): void
    {
        foreach ($this->getView()->result->rows as $row) {
            $this->selectedIds[] = (string) $this->rowId($row);
        }
        $this->selectedIds = array_values(array_unique($this->selectedIds));
    }

    #[LiveAction]
    public function clearSelection(): void
    {
        $this->selectedIds = [];
    }

    public function firstPage(): void
    {
        $this->page = 1;
    }

    /**
     * Checks the state (initial URL values are not checked by Live Components) and loads the page, before the
     * component renders its state: a page past the end becomes the last page, an unknown sort the default one.
     */
    #[PostMount]
    #[PreReRender]
    public function prepare(): void
    {
        [$query, $result] = $this->fetch(TableQuery::fromValues([
            'search' => $this->search,
            'filters' => $this->filterValues,
            'sort' => $this->sort,
            'direction' => $this->direction,
            'page' => $this->page,
            'pageSize' => $this->pageSize,
        ], $this));

        $this->search = $query->search;
        $this->filterValues = $query->filters;
        $this->sort = $query->sort;
        $this->direction = $query->direction;
        $this->page = $query->page;
        $this->pageSize = $query->pageSize;
        $this->selectedIds = array_values(array_unique(array_map('strval', array_filter($this->selectedIds, 'is_scalar'))));
        $this->view = new DataTableView($this, $query, $result, '');
    }

    /**
     * The checked query, its page of rows and the page window, for the template.
     */
    public function getView(): DataTableView
    {
        if (null === $this->view) {
            $this->prepare();
        }

        return $this->view ?? throw new \LogicException('The table did not load.');
    }

    /**
     * Whether a row is selected.
     */
    public function isSelected(mixed $row): bool
    {
        return \in_array((string) $this->rowId($row), $this->selectedIds, true);
    }
}
