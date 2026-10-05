import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

// Every page of the demo: the shell pages, every lab scenario, and every README example in both themes.
const root = fileURLToPath(new URL('../..', import.meta.url));
const recipes = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'manifest.json')))
    .map((entry) => entry.name);
const examples: { recipe: string; id: string }[] = JSON.parse(
    execFileSync(process.env.PHP_BINARY ?? 'php', ['bin/console', 'app:examples'], { cwd: join(root, 'demo'), encoding: 'utf8' })
);
const labPages = ['live-dropdown', 'live-modal', 'live-table', 'live-drawer', 'live-form', 'turbo-stream-toast', 'turbo-nav', 'turbo-nav/two', 'turbo-frame-detail', 'turbo-frame-detail/apple', 'permanent-plus-live'];

const pages = [
    '/',
    '/forms',
    '/forms/parity',
    '/lab',
    ...labPages.map((name) => `/lab/${name}`),
    ...recipes.map((recipe) => `/r/${recipe}`),
    ...examples.flatMap(({ recipe, id }) => ['light', 'dark'].map((theme) => `/preview/${recipe}/${id}?theme=${theme}`)),
];

for (const path of pages) {
    test(`a11y ${path}`, async ({ page }) => {
        await page.goto(path);
        // the /r/ pages embed the previews, scanned on their own
        const results = await new AxeBuilder({ page }).exclude('iframe').analyze();
        const serious = results.violations
            .filter((violation) => 'serious' === violation.impact || 'critical' === violation.impact)
            .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`);

        expect(serious, 'serious/critical axe violations').toEqual([]);
    });
}
