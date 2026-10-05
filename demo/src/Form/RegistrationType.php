<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * The signup block's form, as in its README.
 */
final class RegistrationType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, ['constraints' => [new Assert\NotBlank()]])
            ->add('email', EmailType::class, ['constraints' => [new Assert\NotBlank(), new Assert\Email()]])
            ->add('plainPassword', PasswordType::class, ['label' => 'Password', 'help' => 'At least 12 characters.', 'constraints' => [new Assert\NotBlank(), new Assert\Length(min: 12)]])
            ->add('terms', CheckboxType::class, ['label' => 'I accept the terms', 'constraints' => [new Assert\IsTrue(message: 'You must accept the terms.')]]);
    }
}
