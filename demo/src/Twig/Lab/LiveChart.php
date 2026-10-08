<?php

namespace App\Twig\Lab;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * A Chart whose data changes on the server: a range picked with a model, a sale added by an action.
 */
#[AsLiveComponent]
final class LiveChart
{
    use DefaultActionTrait;

    #[LiveProp(writable: true)]
    public int $range = 7;

    /** @var list<int> */
    #[LiveProp]
    public array $extra = [];

    #[LiveAction]
    public function addSale(): void
    {
        $this->extra[] = 5;
    }

    /**
     * @return list<string>
     */
    public function getLabels(): array
    {
        $range = 30 === $this->range ? 30 : 7;

        return array_map(static fn (int $day): string => 'Day '.$day, range(1, $range + \count($this->extra)));
    }

    /**
     * @return list<int>
     */
    public function getSales(): array
    {
        $range = 30 === $this->range ? 30 : 7;

        return [...array_map(static fn (int $day): int => ($day * 7) % 11 + 2, range(1, $range)), ...$this->extra];
    }
}
