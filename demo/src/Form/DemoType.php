<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\CheckboxType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\Extension\Core\Type\PasswordType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\UrlType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Every field type the form theme styles, with constraints so that an empty submit shows errors.
 */
final class DemoType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('name', TextType::class, [
                'help' => 'As it appears on your invoices.',
                'constraints' => [new Assert\NotBlank(), new Assert\Length(min: 2)],
            ])
            ->add('email', EmailType::class, [
                'attr' => ['placeholder' => 'name@example.com'],
                'constraints' => [new Assert\NotBlank(), new Assert\Email()],
            ])
            ->add('password', PasswordType::class, [
                'constraints' => [new Assert\NotBlank(), new Assert\Length(min: 8)],
            ])
            ->add('age', IntegerType::class, [
                'required' => false,
                'constraints' => [new Assert\Range(min: 18, max: 120)],
            ])
            ->add('website', UrlType::class, [
                'required' => false,
                'default_protocol' => null,
                'attr' => ['placeholder' => 'https://example.com'],
                'constraints' => [new Assert\Url(requireTld: true)],
            ])
            ->add('birthday', DateType::class, [
                'required' => false,
                'widget' => 'single_text',
            ])
            ->add('bio', TextareaType::class, [
                'required' => false,
                'help' => 'At most 200 characters.',
                'attr' => ['rows' => 3],
                'constraints' => [new Assert\Length(max: 200)],
            ])
            ->add('country', ChoiceType::class, [
                'placeholder' => 'Choose a country',
                'choices' => ['France' => 'fr', 'Germany' => 'de', 'Japan' => 'jp', 'United States' => 'us'],
                'constraints' => [new Assert\NotBlank()],
            ])
            ->add('plan', ChoiceType::class, [
                'expanded' => true,
                'choices' => ['Free' => 'free', 'Pro' => 'pro', 'Team' => 'team'],
                'help' => 'You can change it later.',
                'constraints' => [new Assert\NotBlank()],
            ])
            ->add('interests', ChoiceType::class, [
                'expanded' => true,
                'multiple' => true,
                'required' => false,
                'choices' => ['Design' => 'design', 'Engineering' => 'engineering', 'Marketing' => 'marketing'],
                'constraints' => [new Assert\Count(min: 1, minMessage: 'Pick at least one interest.')],
            ])
            ->add('terms', CheckboxType::class, [
                'label' => 'I accept the terms',
                'constraints' => [new Assert\IsTrue(message: 'You must accept the terms.')],
            ])
            ->add('save', SubmitType::class, ['label' => 'Create account']);
    }
}
