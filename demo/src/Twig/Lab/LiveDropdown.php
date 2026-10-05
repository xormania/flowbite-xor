<?php

namespace App\Twig\Lab;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * A Dropdown whose Live Component re-renders while the menu is open (action and model change).
 */
#[AsLiveComponent]
final class LiveDropdown
{
    use DefaultActionTrait;

    #[LiveProp]
    public int $renders = 0;

    #[LiveProp(writable: true)]
    public string $query = '';

    #[LiveAction]
    public function rerender(): void
    {
        ++$this->renders;
    }
}
