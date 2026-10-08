<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\UX\Autocomplete\Form\AsAutocompleteField;
use Symfony\UX\Autocomplete\Form\AutocompleteChoiceType;

#[AsAutocompleteField]
final class CustomerField extends AbstractType
{
    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'choices' => ['Bonnie Green' => 'bonnie', 'Jese Leos' => 'jese', 'Neil Sims' => 'neil'],
            'required' => false,
        ]);
    }

    public function getParent(): string
    {
        return AutocompleteChoiceType::class;
    }
}
