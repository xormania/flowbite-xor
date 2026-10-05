<?php

namespace App\Kit;

/**
 * A recipe of the kit, as read from its "manifest.json" and "README.md".
 */
final readonly class Recipe
{
    /**
     * @param array<string, string>       $copyFiles    source directory => destination directory
     * @param array<string, list<string>> $dependencies type ("recipe", "composer", "npm", "importmap") => entries
     */
    public function __construct(
        public string $name,
        public string $displayName,
        public string $type,
        public ?string $description,
        public array $copyFiles,
        public array $dependencies,
        public string $absolutePath,
        public ?string $readme,
    ) {
    }
}
