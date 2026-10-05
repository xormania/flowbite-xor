<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * The form of the live-form lab scenario.
 */
final class ProfileType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, ['constraints' => [new Assert\NotBlank(), new Assert\Length(min: 2)]])
            ->add('email', EmailType::class, ['constraints' => [new Assert\NotBlank(), new Assert\Email()]])
            ->add('bio', TextareaType::class, ['required' => false, 'help' => 'At most 200 characters.', 'constraints' => [new Assert\Length(max: 200)]]);
    }
}
