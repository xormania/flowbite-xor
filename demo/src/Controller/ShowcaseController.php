<?php

namespace App\Controller;

use App\Kit\KitReader;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class ShowcaseController extends AbstractController
{
    public function __construct(
        private readonly KitReader $kit,
    ) {
    }

    #[Route('/', name: 'app_index')]
    public function index(): Response
    {
        return $this->render('showcase/index.html.twig', [
            'kit' => $this->kit->getKit(),
            'recipes' => $this->kit->getRecipes(),
        ]);
    }

    #[Route('/r/{recipe}', name: 'app_recipe', requirements: ['recipe' => '[a-z0-9][a-z0-9-]*'])]
    public function recipe(string $recipe): Response
    {
        if (null === $found = $this->kit->getRecipe($recipe)) {
            throw $this->createNotFoundException(\sprintf('Recipe "%s" does not exist in the kit.', $recipe));
        }

        return $this->render('showcase/recipe.html.twig', [
            'recipe' => $found,
            'examples' => $this->kit->getExamples($found),
        ]);
    }
}
