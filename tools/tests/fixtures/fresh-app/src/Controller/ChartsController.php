<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\UX\Chartjs\Builder\ChartBuilderInterface;
use Symfony\UX\Chartjs\Model\Chart;

final class ChartsController extends AbstractController
{
    #[Route('/charts', name: 'app_charts')]
    public function charts(ChartBuilderInterface $chartBuilder): Response
    {
        $visits = $chartBuilder->createChart(Chart::TYPE_LINE)
            ->setData(['labels' => ['Mon', 'Tue', 'Wed'], 'datasets' => [['label' => 'Visits', 'data' => [4, 6, 5]]]])
            ->setOptions(['scales' => ['y' => ['beginAtZero' => true]]]);

        return $this->render('charts/index.html.twig', ['visits' => $visits]);
    }
}
