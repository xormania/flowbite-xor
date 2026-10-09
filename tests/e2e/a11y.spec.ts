import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { examples, recipes } from './inventory';

// Every page of the demo: the shell pages, every lab scenario, and every README example in both themes.
const labPages = ['live-dropdown', 'live-modal', 'live-table', 'live-drawer', 'live-form', 'turbo-stream-toast', 'turbo-nav', 'turbo-nav/two', 'turbo-frame-detail', 'turbo-frame-detail/apple', 'permanent-plus-live', 'data-table-frame', 'data-table-live', 'data-table-live-frame', 'data-table-live-permanent', 'data-table-live-stream', 'autocomplete', 'autocomplete-frame', 'autocomplete-stream', 'live-autocomplete', 'popover-turbo', 'popover-turbo/two', 'popover-stream', 'live-popover', 'calendar-turbo', 'calendar-turbo/two', 'calendar-stream', 'live-calendar', 'date-picker-turbo', 'date-picker-turbo/two', 'date-picker-stream', 'live-date-picker', 'chart-turbo', 'chart-turbo/two', 'chart-stream', 'live-chart', 'chart-points', 'dropzone-turbo', 'dropzone-turbo/two', 'dropzone-stream', 'dropzone-events', 'dropzone-form', 'live-dropzone', 'editor-turbo', 'editor-turbo/two', 'editor-stream', 'live-editor', 'markdown-turbo', 'markdown-turbo/two', 'markdown-stream', 'turbo-restore', 'turbo-restore/two', 'side-nav', 'side-nav/three', 'section-nav', 'section-nav/integrations', 'mobile-nav', 'mobile-nav/three', 'tooltip-turbo', 'tooltip-turbo/two', 'tooltip-stream'];

const pages = [
    '/',
    '/forms',
    '/forms/parity',
    '/demo',
    '/demo/login',
    '/demo/signup',
    '/demo/forgot-password',
    '/demo/settings/profile',
    '/demo/settings/notifications',
    '/demo/settings/billing',
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
