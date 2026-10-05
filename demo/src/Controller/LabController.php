<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Turbo / Live Component scenario pages (one route per scenario under /lab/).
 */
#[Route('/lab')]
final class LabController extends AbstractController
{
    /**
     * Scenario name => description; each scenario gets its own "/lab/<name>" route.
     */
    private const SCENARIOS = [];

    #[Route('', name: 'app_lab')]
    public function index(): Response
    {
        return $this->render('lab/index.html.twig', [
            'scenarios' => self::SCENARIOS,
        ]);
    }
}
