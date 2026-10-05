<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * The login block's form, as in its README: the field names form_login reads.
 */
final class LoginType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('_username', EmailType::class, ['label' => 'Email', 'attr' => ['autocomplete' => 'email']])
            ->add('_password', PasswordType::class, ['label' => 'Password', 'attr' => ['autocomplete' => 'current-password']])
            ->add('_remember_me', CheckboxType::class, ['label' => 'Remember me', 'required' => false]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['csrf_field_name' => '_csrf_token', 'csrf_token_id' => 'authenticate']);
    }

    public function getBlockPrefix(): string
    {
        return '';
    }
}
