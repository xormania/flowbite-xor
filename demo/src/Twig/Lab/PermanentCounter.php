<?php

namespace App\Twig\Lab;

use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * A Live Component living inside a data-turbo-permanent element, kept across Turbo visits.
 */
#[AsLiveComponent]
final class PermanentCounter
{
    use DefaultActionTrait;

    #[LiveProp]
    public int $count = 0;

    #[LiveAction]
    public function increment(): void
    {
        ++$this->count;
    }
}
