<?php

namespace App\Kit;

use App\Form\ForgotPasswordType;
use App\Form\LoginType;
use App\Form\ProfileType;
use App\Form\RegistrationType;
use Symfony\Component\Form\FormFactoryInterface;

/**
 * The variables a README example of a block can use: blocks taking a Symfony form get one as `form`.
 */
final class PreviewForms
{
    private const FORMS = [
        'login' => LoginType::class,
        'signup' => RegistrationType::class,
        'forgot-password' => ForgotPasswordType::class,
        'settings-profile' => ProfileType::class,
    ];

    public function __construct(
        private readonly FormFactoryInterface $formFactory,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function contextFor(string $recipe): array
    {
        if (!isset(self::FORMS[$recipe])) {
            return [];
        }
        $data = 'settings-profile' === $recipe ? ['name' => 'Bonnie Green', 'email' => 'bonnie@example.com'] : null;

        return ['form' => $this->formFactory->create(self::FORMS[$recipe], $data, ['csrf_protection' => false])->createView()];
    }
}
