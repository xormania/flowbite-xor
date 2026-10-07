<?php

namespace App\Demo;

use App\FlowbiteXor\DataTable\AbstractDataTable;
use App\FlowbiteXor\DataTable\Column;
use App\FlowbiteXor\DataTable\Filter;
use App\FlowbiteXor\DataTable\TableQuery;
use App\FlowbiteXor\DataTable\TableResult;

/**
 * The demo's data table: 57 made-up orders held in memory, searched, filtered, sorted and sliced like a query would.
 */
final class OrdersTable extends AbstractDataTable
{
    private const CUSTOMERS = ['Bonnie Green', 'Jese Leos', 'Neil Sims', 'Lana Byrd', 'Thomas Lean', 'Roberta Casas', 'Michael Gough', 'Karen Nelson'];
    private const STATUSES = ['paid' => 'Paid', 'pending' => 'Pending', 'refunded' => 'Refunded'];

    public function columns(): array
    {
        return [
            Column::make('number', 'Order')->sortable(),
            Column::make('customer', 'Customer')->sortable(),
            Column::make('status', 'Status'),
            Column::make('total', 'Total')->sortable(),
        ];
    }

    public function filters(): array
    {
        return [Filter::choice('status', 'Status', self::STATUSES)];
    }

    public function defaultSort(): string
    {
        return 'number';
    }

    public function defaultDirection(): string
    {
        return 'desc';
    }

    protected function loadPage(TableQuery $query): TableResult
    {
        $rows = array_values(array_filter(self::orders(), static fn (array $order): bool => ('' === $query->search
                || str_contains(strtolower($order['number'].' '.$order['customer']), strtolower($query->search)))
            && (!isset($query->filters['status']) || $order['status'] === $query->filters['status'])));

        if (null !== $query->sortField) {
            $field = $query->sortField;
            usort($rows, static fn (array $a, array $b): int => ('asc' === $query->direction ? 1 : -1) * ($a[$field] <=> $b[$field] ?: $a['id'] <=> $b['id']));
        }

        return new TableResult(\array_slice($rows, $query->offset(), $query->pageSize), \count($rows));
    }

    /**
     * @return list<array{id: int, number: string, customer: string, status: string, total: int}>
     */
    private static function orders(): array
    {
        $statuses = array_keys(self::STATUSES);
        $orders = [];
        for ($id = 1; $id <= 57; ++$id) {
            $orders[] = [
                'id' => $id,
                'number' => \sprintf('#%04d', 1000 + $id),
                'customer' => self::CUSTOMERS[($id * 5) % \count(self::CUSTOMERS)],
                'status' => $statuses[($id * 7) % 3],
                'total' => 20 + ($id * 37) % 480,
            ];
        }

        return $orders;
    }
}
