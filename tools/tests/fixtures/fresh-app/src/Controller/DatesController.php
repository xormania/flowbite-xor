<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class DatesController extends AbstractController
{
    #[Route('/dates', name: 'app_dates')]
    public function dates(): Response
    {
        $form = $this->createFormBuilder(['startsOn' => new \DateTimeImmutable('2026-03-12')])
            ->add('startsOn', DateType::class, [
                'widget' => 'single_text',
                'input' => 'datetime_immutable',
                'block_prefix' => 'flowbite_date_picker',
                'attr' => ['min' => '2026-01-01'],
            ])
            ->getForm();

        return $this->render('dates/index.html.twig', ['form' => $form]);
    }
}
