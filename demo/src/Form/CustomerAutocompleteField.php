<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\UX\Autocomplete\Form\AsAutocompleteField;
use Symfony\UX\Autocomplete\Form\AutocompleteChoiceType;

/**
 * A remote autocomplete field (UX Autocomplete 3.5's AutocompleteChoiceType): the options are searched on the
 * server as the user types, from an in-memory list here.
 */
#[AsAutocompleteField]
final class CustomerAutocompleteField extends AbstractType
{
    public const CUSTOMERS = ['Bonnie Green', 'Jese Leos', 'Neil Sims', 'Lana Byrd', 'Thomas Lean', 'Roberta Casas', 'Michael Gough', 'Karen Nelson', 'Helene Engels', 'Robert Brown'];

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'choices' => array_combine(self::CUSTOMERS, self::CUSTOMERS),
            'placeholder' => 'Search a customer',
            'required' => false,
        ]);
    }

    public function getParent(): string
    {
        return AutocompleteChoiceType::class;
    }
}
