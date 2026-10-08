<?php

namespace App\Controller;

use App\Form\CustomerField;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PickController extends AbstractController
{
    #[Route('/pick', name: 'app_pick')]
    public function pick(): Response
    {
        $form = $this->createFormBuilder()
            ->add('country', ChoiceType::class, ['choices' => ['France' => 'FR', 'Haiti' => 'HT'], 'autocomplete' => true])
            ->add('customer', CustomerField::class)
            ->getForm();

        return $this->render('pick/index.html.twig', ['form' => $form]);
    }
}
