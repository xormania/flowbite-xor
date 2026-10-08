<?php

namespace App\Form;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Two dates through the date-picker opt-in: the end's earliest day follows the start (`end_min`). Both end in March
 * 2026, so the empty calendars open on that month (today's, clamped to the bounds) whatever the date.
 */
final class StayType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $picker = ['widget' => 'single_text', 'block_prefix' => 'flowbite_date_picker', 'required' => false];
        $builder
            ->add('start', DateType::class, $picker + ['attr' => ['min' => '2026-03-01', 'max' => '2026-03-31']])
            ->add('end', DateType::class, $picker + [
                'attr' => ['min' => $options['end_min'] ?? '2026-03-01', 'max' => '2026-03-31'],
                'constraints' => null === $options['end_min'] ? [] : [new Assert\GreaterThanOrEqual($options['end_min'])],
            ]);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['end_min' => null, 'csrf_protection' => false]);
        $resolver->setAllowedTypes('end_min', ['null', 'string']);
    }
}
