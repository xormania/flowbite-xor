<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Turbo / Live Component scenario pages (one route per scenario under /lab/), each exercised by
 * tests/e2e/lab.*.spec.ts.
 */
#[Route('/lab')]
final class LabController extends AbstractController
{
    /**
     * Scenario name => description; each scenario gets its own "/lab/<name>" route.
     */
    private const SCENARIOS = [
        'live-dropdown' => 'A Dropdown open while its Live Component re-renders (action and model change).',
        'live-modal' => 'A Modal (<dialog>) across Live re-renders, open and closed.',
        'live-table' => 'A Live table re-sorting rows that hold Dropdowns.',
        'turbo-nav' => 'Turbo Drive visits between two pages: a data-turbo-permanent panel keeps its scroll, the theme persists.',
        'turbo-frame-detail' => 'A list and a detail Turbo Frame holding a Dropdown, reloaded several times.',
        'permanent-plus-live' => 'A Live Component inside a data-turbo-permanent element across Turbo visits.',
    ];

    private const ITEMS = ['apple' => 'Apple', 'banana' => 'Banana', 'cherry' => 'Cherry'];

    #[Route('', name: 'app_lab')]
    public function index(): Response
    {
        return $this->render('lab/index.html.twig', ['scenarios' => self::SCENARIOS]);
    }

    #[Route('/live-dropdown', name: 'app_lab_live_dropdown')]
    #[Route('/live-modal', name: 'app_lab_live_modal')]
    #[Route('/live-table', name: 'app_lab_live_table')]
    public function live(string $_route): Response
    {
        $name = str_replace('_', '-', substr($_route, \strlen('app_lab_')));

        return $this->render('lab/live.html.twig', [
            'name' => $name,
            'description' => self::SCENARIOS[$name],
            'component' => 'Lab:'.str_replace(' ', '', ucwords(str_replace('-', ' ', $name))),
        ]);
    }

    #[Route('/turbo-nav/{page}', name: 'app_lab_turbo_nav', requirements: ['page' => 'one|two'], defaults: ['page' => 'one'])]
    public function turboNav(string $page): Response
    {
        return $this->render('lab/turbo_nav.html.twig', ['page' => $page, 'description' => self::SCENARIOS['turbo-nav']]);
    }

    #[Route('/turbo-frame-detail/{item}', name: 'app_lab_turbo_frame_detail', defaults: ['item' => null])]
    public function turboFrameDetail(?string $item): Response
    {
        if (null !== $item && !isset(self::ITEMS[$item])) {
            throw $this->createNotFoundException();
        }

        return $this->render('lab/turbo_frame_detail.html.twig', [
            'items' => self::ITEMS,
            'item' => $item,
            'description' => self::SCENARIOS['turbo-frame-detail'],
        ]);
    }

    #[Route('/permanent-plus-live/{page}', name: 'app_lab_permanent_plus_live', requirements: ['page' => 'one|two'], defaults: ['page' => 'one'])]
    public function permanentPlusLive(string $page): Response
    {
        return $this->render('lab/permanent_plus_live.html.twig', ['page' => $page, 'description' => self::SCENARIOS['permanent-plus-live']]);
    }
}
