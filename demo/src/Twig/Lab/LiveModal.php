<?php

namespace App\Twig\Lab;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * A Modal (native <dialog>) inside a Live Component that re-renders while it is open or closed.
 */
#[AsLiveComponent]
final class LiveModal
{
    use DefaultActionTrait;

    #[LiveProp]
    public int $renders = 0;

    #[LiveAction]
    public function rerender(): void
    {
        ++$this->renders;
    }
}
