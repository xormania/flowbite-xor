<?php

namespace App\Kit;

use App\Demo\OrdersTable;
use App\Form\ForgotPasswordType;
use App\Form\LoginType;
use App\Form\ProfileType;
use App\Form\RegistrationType;
use Symfony\Component\Form\FormFactoryInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * The variables a README example can use: blocks taking a Symfony form get one as `form`, the data table's examples
 * the demo's orders as `table`, read from the current request like an app's controller would.
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
        private readonly OrdersTable $orders,
        private readonly RequestStack $requestStack,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function contextFor(string $recipe): array
    {
        if ('data-table' === $recipe) {
            return ['table' => $this->orders->handleRequest($this->requestStack->getCurrentRequest() ?? new Request())];
        }
        if (!isset(self::FORMS[$recipe])) {
            return [];
        }
        $data = 'settings-profile' === $recipe ? ['name' => 'Bonnie Green', 'email' => 'bonnie@example.com'] : null;

        return ['form' => $this->formFactory->create(self::FORMS[$recipe], $data, ['csrf_protection' => false])->createView()];
    }
}
