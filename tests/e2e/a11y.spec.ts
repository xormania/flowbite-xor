import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { examples, recipes } from './inventory';

// Every page of the demo: the shell pages, every lab scenario, and every README example in both themes.
const labPages = ['live-dropdown', 'live-modal', 'live-table', 'live-drawer', 'live-form', 'turbo-stream-toast', 'turbo-nav', 'turbo-nav/two', 'turbo-frame-detail', 'turbo-frame-detail/apple', 'permanent-plus-live', 'data-table-frame', 'data-table-live', 'data-table-live-frame', 'data-table-live-permanent', 'data-table-live-stream', 'popover-turbo', 'popover-turbo/two', 'popover-stream', 'live-popover'];

const pages = [
    '/',
    '/forms',
    '/forms/parity',
    '/demo',
    '/demo/login',
    '/demo/signup',
    '/demo/forgot-password',
    '/demo/settings/profile',
    '/demo/blank',
    '/lab',
    ...labPages.map((name) => `/lab/${name}`),
    ...recipes.map((recipe) => `/r/${recipe}`),
    ...examples.flatMap(({ recipe, id }) => ['light', 'dark'].map((theme) => `/preview/${recipe}/${id}?theme=${theme}`)),
];

// independent pages: run them in parallel, and let --shard split this file between CI's shards
test.describe.configure({ mode: 'parallel' });

for (const path of pages) {
    test(`a11y ${path}`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);
        if (!path.startsWith('/preview/')) {
            await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        }
        // the /r/ pages embed the previews, scanned on their own
        const results = await new AxeBuilder({ page }).exclude('iframe').analyze();
        const serious = results.violations
            .filter((violation) => 'serious' === violation.impact || 'critical' === violation.impact)
            .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`);

        expect(serious, 'serious/critical axe violations').toEqual([]);
    });
}
