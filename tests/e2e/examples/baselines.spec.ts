/*
 * Every committed screenshot belongs to a test. A README example that the demo stops finding takes its screenshot
 * and accessibility tests with it, without a failure; its screenshots stay behind and fail this test.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { demoPages, examples, recipes, root, viewports } from '../inventory';
import { expect, test, themes } from './fixtures';

/** The files of a recipe's directory (e.g. 'tests'), none when it does not exist. */
const files = (recipe: string, dir: string): string[] => (existsSync(join(root, recipe, dir)) ? readdirSync(join(root, recipe, dir)) : []);

test('every screenshot in <recipe>/tests/screenshots has a test', () => {
    const expected = new Set([
        // examples.spec.ts
        ...examples.flatMap(({ recipe, id }) => themes.map((theme) => `${recipe}/${id}-${theme}.png`)),
        // pages.spec.ts
        ...Object.keys(demoPages).flatMap((name) => Object.keys(viewports).map((viewport) => `layouts/${name}-${viewport}.png`)),
    ]);
    // testState() in the recipe specs: <example>-<state>-<theme>.png
    for (const recipe of recipes) {
        for (const spec of files(recipe, 'tests').filter((file) => file.endsWith('.spec.ts'))) {
            const source = readFileSync(join(root, recipe, 'tests', spec), 'utf8');
            for (const [, example, state] of source.matchAll(/example: '([^']+)',\s*state: '([^']+)'/g)) {
                themes.forEach((theme) => expected.add(`${recipe}/${example}-${state}-${theme}.png`));
            }
        }
    }

    const committed = recipes.flatMap((recipe) =>
        files(recipe, 'tests/screenshots')
            .filter((file) => file.endsWith('.png'))
            .map((file) => `${recipe}/${file}`),
    );

    expect(committed.filter((name) => !expected.has(name)), 'screenshots no test compares').toEqual([]);
});
