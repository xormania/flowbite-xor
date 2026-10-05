<?php

namespace App\Twig\Lab;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * A modal Drawer (native <dialog>) inside a Live Component that re-renders while it is open, and a
 * non-modal Drawer that leaves the page usable.
 */
#[AsLiveComponent]
final class LiveDrawer
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
