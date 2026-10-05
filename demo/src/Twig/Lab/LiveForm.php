<?php

namespace App\Twig\Lab;

use App\Form\ProfileType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\FormInterface;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveAction;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\ComponentWithFormTrait;
use Symfony\UX\LiveComponent\DefaultActionTrait;

/**
 * A form rendered through the form theme inside a Live Component: each changed field is validated on
 * the server and the form re-renders without losing focus or what the user typed.
 */
#[AsLiveComponent]
final class LiveForm extends AbstractController
{
    use ComponentWithFormTrait;
    use DefaultActionTrait;

    #[LiveProp]
    public bool $saved = false;

    protected function instantiateForm(): FormInterface
    {
        return $this->createForm(ProfileType::class);
    }

    #[LiveAction]
    public function save(): void
    {
        $this->submitForm();
        $this->saved = true;
    }
}
