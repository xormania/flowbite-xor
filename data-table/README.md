# Data Table

A server-driven table: search, filters, sortable columns, a page size and pages, in a Turbo Frame that keeps Back and Forward working.

```twig {"preview":true}
<twig:DataTable :table="table" id="orders" label="Orders">
    <twig:block name="cell_status">
        <twig:Badge variant="{{ {paid: 'success', pending: 'warning', refunded: 'gray'}[row.status] }}">{{ row.status|capitalize }}</twig:Badge>
    </twig:block>
    <twig:block name="cell_total">${{ row.total }}</twig:block>
</twig:DataTable>
```

## Installation

::: installation

Run `ux:install` from your project's root directory: besides its template, this recipe copies PHP classes into
`src/FlowbiteXor/DataTable/`, in the `App\FlowbiteXor\DataTable` namespace. If your project's root namespace is not
`App`, change the `namespace` and `use` lines of those files to match.

## Usage

Each table is one class extending `AbstractDataTable`. It declares its columns, and loads one page of rows for a
query that is already checked: the sort is one of the columns you made sortable (`$query->sortField` holds its server
field, never a value from the URL), each filter value is one of the filter's choices, the page is at least 1 and the
page size one of `pageSizes()`. Return the page's rows and the number of rows matching the search and filters on every
page; a page past the end shows the last one.

```php
// src/Table/OrdersTable.php
namespace App\Table;

use App\FlowbiteXor\DataTable\AbstractDataTable;
use App\FlowbiteXor\DataTable\Column;
use App\FlowbiteXor\DataTable\Filter;
use App\FlowbiteXor\DataTable\TableQuery;
use App\FlowbiteXor\DataTable\TableResult;

final class OrdersTable extends AbstractDataTable
{
    public function __construct(private readonly OrderRepository $orders)
    {
    }

    public function columns(): array
    {
        return [
            Column::make('number', 'Order')->sortable('o.number'),
            Column::make('customer', 'Customer')->sortable('c.name'),
            Column::make('status', 'Status'),
            Column::make('total', 'Total')->sortable('o.total'),
        ];
    }

    public function filters(): array
    {
        return [Filter::choice('status', 'Status', ['paid' => 'Paid', 'pending' => 'Pending', 'refunded' => 'Refunded'])];
    }

    public function defaultSort(): string
    {
        return 'number';
    }

    protected function loadPage(TableQuery $query): TableResult
    {
        $qb = $this->orders->createQueryBuilder('o')->join('o.customer', 'c');
        if ('' !== $query->search) {
            $qb->andWhere('o.number LIKE :search OR c.name LIKE :search')->setParameter('search', '%'.addcslashes($query->search, '%_').'%');
        }
        if (isset($query->filters['status'])) {
            $qb->andWhere('o.status = :status')->setParameter('status', $query->filters['status']);
        }
        $total = (int) (clone $qb)->select('COUNT(o.id)')->getQuery()->getSingleScalarResult();
        if (null !== $query->sortField) {
            $qb->orderBy($query->sortField, $query->direction)->addOrderBy('o.id', $query->direction);
        }
        $rows = $qb->setFirstResult($query->offset())->setMaxResults($query->pageSize)->getQuery()->getResult();

        return new TableResult($rows, $total);
    }
}
```

The controller hands the request to the table; the template renders it:

```php
#[Route('/orders', name: 'app_orders')]
public function orders(Request $request, OrdersTable $table): Response
{
    return $this->render('orders/index.html.twig', ['table' => $table->handleRequest($request)]);
}
```

```twig
<twig:DataTable :table="table" id="orders" label="Orders" />
```

A cell shows the row's value for the column's key (`row.number`, from an array or an object). To render a cell
yourself, pass a `cell_<key>` block; `row` is the current row. Write it as `<twig:block>`: inside a
`{% block %}` tag, `<twig:…>` components are not compiled.

```twig
<twig:DataTable :table="table" id="orders" label="Orders">
    <twig:block name="cell_customer">
        <a href="{{ path('app_customer', {id: row.customer.id}) }}" class="font-medium text-fg-brand hover:underline">{{ row.customer.name }}</a>
    </twig:block>
</twig:DataTable>
```

Rows are identified by `id` (the array key, `getId()` or the `id` property). Override `rowId()` when yours is
called something else. A row's element id is `<table id>-row-<row id>`.

### What you can override

| Method | Default | |
|---|---|---|
| `columns()` | required | The columns, in order. `Column::make(key, label)`, `->sortable(field)` to sort by a server field (the key when omitted). |
| `loadPage(TableQuery)` | required | One page of rows, and the total. |
| `filters()` | none | `Filter::choice(key, label, [value => label])`: a select above the table. |
| `pageSizes()` | `[10, 25, 50]` | The page sizes users can choose; the first is the default. One size hides the select. |
| `defaultSort()`, `defaultDirection()` | none, `'asc'` | The sort when the URL names none. |
| `paramPrefix()` | `''` | Groups the URL parameters (`?orders[page]=2`) when a page shows several tables. |
| `rowId(row)` | `id` | The stable id of a row. |

### URL and history

The table's state is in the URL: `q` (search), `f[<filter>]`, `sort`, `dir`, `page` and `size`, without the default
values. The table renders in a Turbo Frame (`<turbo-frame id="orders" data-turbo-action="advance">`): its links and
its search form reload only the frame and add a history entry, so Back and Forward step through every search, sort and
page, and a copied URL opens the same state. The URL's other parameters are kept. Without Turbo, the links and the
form load whole pages and still work.

The search, filters and page size apply when the form is submitted (the Apply button, or Enter in the search field).

Changing the search, a filter, the sort or the page size goes back to the first page.
