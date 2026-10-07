<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class LiveOrdersController extends AbstractController
{
    #[Route('/live-orders', name: 'app_live_orders')]
    public function index(): Response
    {
        return $this->render('live_orders/index.html.twig');
    }
}
