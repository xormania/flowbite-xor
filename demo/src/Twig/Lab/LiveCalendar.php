<?php

namespace App\Twig\Lab;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * Calendars bound to Live properties (a date, a range), with bounds and a locale the server changes.
 */
#[AsLiveComponent]
final class LiveCalendar
{
    use DefaultActionTrait;

    #[LiveProp(writable: true)]
    public ?string $day = null;

    /** @var array{from: ?string, to: ?string} */
    #[LiveProp(writable: ['from', 'to'])]
    public array $stay = ['from' => null, 'to' => null];

    #[LiveProp(writable: true)]
    public string $minDay = '2026-03-01';

    #[LiveProp(writable: true)]
    public string $locale = 'en';

    #[LiveAction]
    public function clear(): void
    {
        $this->day = null;
        $this->stay = ['from' => null, 'to' => null];
    }
}
