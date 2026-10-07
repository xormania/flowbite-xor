<?php

namespace App\Controller;

use App\Table\OrdersTable;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class OrdersController extends AbstractController
{
    #[Route('/orders', name: 'app_orders')]
    public function index(Request $request, OrdersTable $table): Response
    {
        return $this->render('orders/index.html.twig', ['table' => $table->handleRequest($request)]);
    }
}
