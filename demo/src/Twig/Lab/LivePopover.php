<?php

namespace App\Twig\Lab;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * A Popover whose Live Component re-renders while it is open (action and model change).
 */
#[AsLiveComponent]
final class LivePopover
{
    use DefaultActionTrait;

    #[LiveProp]
    public int $renders = 0;

    #[LiveProp(writable: true)]
    public string $note = '';

    #[LiveAction]
    public function rerender(): void
    {
        ++$this->renders;
    }
}
