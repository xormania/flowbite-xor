<?php

namespace App\Twig\Lab;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveArg;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * A table re-sorted by a Live action; every row holds a Dropdown that must keep working after the redraw.
 */
#[AsLiveComponent]
final class LiveTable
{
    use DefaultActionTrait;

    private const ROWS = [
        ['id' => 'apple', 'name' => 'Apple', 'stock' => 12],
        ['id' => 'banana', 'name' => 'Banana', 'stock' => 3],
        ['id' => 'cherry', 'name' => 'Cherry', 'stock' => 40],
    ];

    #[LiveProp]
    public string $sort = 'name';

    #[LiveProp]
    public string $direction = 'asc';

    #[LiveAction]
    public function sortBy(#[LiveArg] string $column): void
    {
        $this->direction = $column === $this->sort && 'asc' === $this->direction ? 'desc' : 'asc';
        $this->sort = $column;
    }

    /**
     * @return list<array{id: string, name: string, stock: int}>
     */
    public function getRows(): array
    {
        $rows = self::ROWS;
        usort($rows, fn (array $a, array $b) => ('asc' === $this->direction ? 1 : -1) * ($a[$this->sort] <=> $b[$this->sort]));

        return $rows;
    }
}
