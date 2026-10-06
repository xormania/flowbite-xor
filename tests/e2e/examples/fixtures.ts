/*
 * Port of symfony/ux src/Toolkit/assets/test/browser/fixtures.ts (f152d0b) for this repository:
 * same page setup, clock, request blocking and error checks, so screenshots match the upstream
 * baselines copied into <recipe>/tests/screenshots/. Differences:
 * - gotoExample('<kit>/<recipe>/<example>') opens this demo's /preview/<recipe>/<example>
 *   (the kit segment, e.g. "flowbite-4" in upstream specs, is ignored);
 * - screenshot names drop the kit segment: <recipe>/tests/screenshots/<file>.png;
 * - a Content Security Policy violation fails the test too (the demo enforces a strict policy).
 */
import { fileURLToPath } from 'node:url';
import { expect, test as base, type Page } from '@playwright/test';
import { recordCspViolations } from '../fixtures';

export type Theme = 'light' | 'dark';

export const themes: Theme[] = ['light', 'dark'];

type GotoExampleOptions = {
    theme?: Theme;
    timers?: 'real' | 'fake';
};

type Fixtures = {
    gotoExample: (path: string, options?: GotoExampleOptions) => Promise<void>;
    failOnPageErrors: void;
    blockExternalRequests: void;
    /** The status the page's own document is expected to answer with (e.g. 404 for an error page). */
    documentStatus: number;
};

type StateOptions = {
    example: string;
    state: string;
    act: (page: Page) => Promise<void>;
};

export const screenshotAnnotation = (name: string[]) => ({
    annotation: { type: 'screenshot', description: name.join('/') },
});

const FIXED_TIME = new Date('2026-03-15T10:00:00Z');
const PLACEHOLDER_IMAGE = fileURLToPath(new URL('./placeholder.png', import.meta.url));

/** '<kit>/<recipe>/<example>' or '<recipe>/<example>' => ['<recipe>', '<example>'] */
const recipeAndExample = (path: string): [string, string] => {
    const parts = path.split('/');

    return [parts[parts.length - 2], parts[parts.length - 1]];
};

/** '<kit>/<recipe>' or '<recipe>' => '<recipe>' */
const recipeName = (recipe: string): string => recipe.split('/').pop() as string;

export const test = base.extend<Fixtures>({
    // Remote images change and load at their own pace: screenshots show a local placeholder instead.
    blockExternalRequests: [
        async ({ page, baseURL }, use) => {
            await page.route(
                (url) => !url.href.startsWith(`${baseURL}/`),
                (route) => {
                    if ('image' === route.request().resourceType()) {
                        return route.fulfill({ path: PLACEHOLDER_IMAGE });
                    }

                    return route.abort();
                }
            );

            await use();
        },
        { auto: true },
    ],

    documentStatus: [200, { option: true }],

    failOnPageErrors: [
        async ({ page, baseURL, documentStatus }, use) => {
            const errors: string[] = [];
            const isLocal = (url: string) => url.startsWith(`${baseURL}/`);
            // the demo enforces a strict Content Security Policy: no example may need 'unsafe-inline'
            const cspViolations = await recordCspViolations(page);

            page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
            page.on('console', (message) => {
                const url = message.location().url;
                if ('error' !== message.type() || (url && !isLocal(url))) {
                    return;
                }
                if (url === page.url() && message.text().startsWith(`Failed to load resource: the server responded with a status of ${documentStatus} `)) {
                    return;
                }
                errors.push(`console.error: ${message.text()}`);
            });
            page.on('response', (response) => {
                const expected = response.request().isNavigationRequest() && response.status() === documentStatus;
                if (response.status() >= 400 && isLocal(response.url()) && !expected) {
                    errors.push(`HTTP ${response.status()}: ${response.url()}`);
                }
            });

            await use();

            expect([...errors, ...cspViolations.map((violation) => `csp: ${violation}`)]).toEqual([]);
        },
        { auto: true },
    ],

    gotoExample: async ({ page }, use) => {
        await use(async (path, { theme = 'light', timers = 'real' } = {}) => {
            const [recipe, example] = recipeAndExample(path);

            await page.emulateMedia({ colorScheme: theme });
            // Any Playwright clock fakes requestAnimationFrame, which then fires without a real render.
            if ('fake' === timers) {
                await page.clock.install({ time: FIXED_TIME });
            }

            await page.goto(`/preview/${recipe}/${example}?theme=${theme}`);
            await page.evaluate(async () => {
                await document.fonts.ready;
            });

            if ('fake' === timers) {
                await page.clock.runFor(1000);
            }
        });
    },
});

let currentRecipe: string | null = null;

/**
 * Groups the tests of a recipe spec, so `--grep <kit>/<recipe>` selects them and `testState()` knows the recipe.
 */
export function describeRecipe(recipe: string, callback: () => void): void {
    test.describe(recipe, () => {
        currentRecipe = recipe;
        try {
            callback();
        } finally {
            currentRecipe = null;
        }
    });
}

/**
 * Screenshots a state that only an interaction reaches, in every theme.
 *
 * It opens `example` of the recipe, runs `act` (the interaction and its assertions),
 * then compares the page with `<recipe>/tests/screenshots/<example>-<state>-<theme>.png`.
 */
export function testState(title: string, { example, state, act }: StateOptions): void {
    const recipe = currentRecipe;
    if (null === recipe) {
        throw new Error('testState() must be called inside describeRecipe().');
    }

    for (const theme of themes) {
        const name = [recipeName(recipe), 'tests', 'screenshots', `${example}-${state}-${theme}.png`];

        test(`${title} (${theme})`, screenshotAnnotation(name), async ({ page, gotoExample }) => {
            await gotoExample(`${recipe}/${example}`, { theme });
            await act(page);

            await expect(page).toHaveScreenshot(name, { fullPage: true });
        });
    }
}

export { expect };
