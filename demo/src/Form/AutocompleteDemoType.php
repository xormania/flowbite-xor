<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * The autocomplete recipe in a Symfony form: one choice, several choices with tags, and a remote search.
 */
final class AutocompleteDemoType extends AbstractType
{
    public const COUNTRIES = ['France' => 'FR', 'Germany' => 'DE', 'Haiti' => 'HT', 'Italy' => 'IT', 'Japan' => 'JP', 'Spain' => 'ES', 'United Kingdom' => 'GB', 'United States' => 'US'];

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('country', ChoiceType::class, [
                'choices' => self::COUNTRIES,
                'autocomplete' => true,
                'placeholder' => 'Choose a country',
                'constraints' => [new Assert\NotBlank()],
            ])
            ->add('languages', ChoiceType::class, [
                'choices' => ['English' => 'en', 'French' => 'fr', 'German' => 'de', 'Haitian Creole' => 'ht', 'Japanese' => 'ja', 'Spanish' => 'es'],
                'multiple' => true,
                'required' => false,
                'autocomplete' => true,
                'help' => 'Choose several.',
                // a label with its own id: Tom Select keeps it, and the hidden select points at it
                'label_attr' => ['id' => 'languages-label'],
            ])
            ->add('customer', CustomerAutocompleteField::class);
    }
}
