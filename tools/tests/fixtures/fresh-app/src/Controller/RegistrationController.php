<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class RegistrationController extends AbstractController
{
    #[Route('/register', name: 'app_register')]
    public function register(): Response
    {
        $form = $this->createFormBuilder()
            ->add('email', EmailType::class)
            ->add('plainPassword', PasswordType::class, ['label' => 'Password', 'help' => 'At least 12 characters.'])
            ->getForm();

        return $this->render('registration/register.html.twig', ['form' => $form]);
    }
}
