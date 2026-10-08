<?php

namespace App\Twig\Lab;

use App\Form\StayType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\FormInterface;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\ComponentWithFormTrait;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * Date pickers in a Live form: each pick reaches the server, and the end's earliest day follows the start.
 */
#[AsLiveComponent]
final class LiveDatePicker extends AbstractController
{
    use ComponentWithFormTrait;
    use DefaultActionTrait;

    protected function instantiateForm(): FormInterface
    {
        $start = $this->formValues['start'] ?? null;

        return $this->createForm(StayType::class, null, [
            'end_min' => \is_string($start) && 1 === preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) ? $start : null,
        ]);
    }
}
