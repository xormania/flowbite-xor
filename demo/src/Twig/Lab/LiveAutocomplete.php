<?php

namespace App\Twig\Lab;

use App\Form\AutocompleteDemoType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\FormInterface;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\ComponentWithFormTrait;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * Autocomplete fields in a Live form: a change re-renders the form, and Tom Select keeps working with its value.
 */
#[AsLiveComponent]
final class LiveAutocomplete extends AbstractController
{
    use ComponentWithFormTrait;
    use DefaultActionTrait;

    #[LiveProp]
    public int $renders = 0;

    protected function instantiateForm(): FormInterface
    {
        return $this->createForm(AutocompleteDemoType::class);
    }

    #[LiveAction]
    public function rerender(): void
    {
        ++$this->renders;
    }
}
