<?php

namespace App\Kit;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Reads the kit this demo showcases, the way the UX Toolkit discovers it:
 * the kit manifest at the root, and one recipe per "<dir>/manifest.json" at depth 1.
 */
final class KitReader
{
    /** @var array<string, Recipe>|null */
    private ?array $recipes = null;

    public function __construct(
        #[Autowire('%app.kit_dir%')]
        private readonly string $kitDir,
    ) {
    }

    /**
     * @return array{name: string, description: string, homepage: string, license: string}
     */
    public function getManifest(): array
    {
        return json_decode(file_get_contents($this->kitDir.'/manifest.json'), true, flags: \JSON_THROW_ON_ERROR);
    }

    /**
     * @return array<string, Recipe> keyed by recipe name (its directory name), sorted by name
     */
    public function getRecipes(): array
    {
        if (null !== $this->recipes) {
            return $this->recipes;
        }

        $recipes = [];
        foreach (glob($this->kitDir.'/*/manifest.json') ?: [] as $manifestPath) {
            $dir = \dirname($manifestPath);
            $name = basename($dir);
            $manifest = json_decode(file_get_contents($manifestPath), true, flags: \JSON_THROW_ON_ERROR);
            $readme = is_file($dir.'/README.md') ? file_get_contents($dir.'/README.md') : null;

            $recipes[$name] = new Recipe(
                name: $name,
                displayName: $manifest['name'] ?? $name,
                type: $manifest['type'] ?? 'component',
                description: null !== $readme ? self::extractDescription($readme) : null,
                copyFiles: $manifest['copy-files'] ?? [],
                dependencies: $manifest['dependencies'] ?? [],
                absolutePath: $dir,
                readme: $readme,
            );
        }
        ksort($recipes);

        return $this->recipes = $recipes;
    }

    public function getRecipe(string $name): ?Recipe
    {
        return $this->getRecipes()[$name] ?? null;
    }

    /**
     * Same rule as the toolkit: the paragraph right after the "# Title" of the README.
     */
    private static function extractDescription(string $readme): ?string
    {
        $blocks = preg_split('/\R\s*\R/', trim($readme), 3);
        if (\count($blocks) < 2 || !str_starts_with(ltrim($blocks[0]), '# ')) {
            return null;
        }

        $description = trim($blocks[1]);
        if ('' === $description || str_starts_with($description, '#') || str_starts_with($description, ':::')) {
            return null;
        }

        return $description;
    }
}
