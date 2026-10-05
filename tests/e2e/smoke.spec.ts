import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures';

// Recipes as the UX Toolkit discovers them: "<dir>/manifest.json" at depth 1 of the kit root.
const kitRoot = fileURLToPath(new URL('../..', import.meta.url));
const recipes = readdirSync(kitRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(kitRoot, entry.name, 'manifest.json')))
    .map((entry) => entry.name)
    .sort();

test('the index lists every recipe of the kit', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Flowbite xor');
    await expect(page.getByTestId('recipe-count')).toHaveText(`(${recipes.length})`);
    await expect(page.getByTestId('recipe-list').getByRole('link')).toHaveText(recipes);
});

for (const recipe of recipes) {
    test(`/r/${recipe} renders`, async ({ page }) => {
        const response = await page.goto(`/r/${recipe}`);
        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
}

test('/lab renders', async ({ page }) => {
    const response = await page.goto('/lab');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lab');
});

test('links navigate with Turbo Drive (no full page load)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => 'Turbo' in window);
    await page.evaluate(() => ((window as any).__sameDocument = true));

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Lab' }).click();
    await expect(page).toHaveURL(/\/lab$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lab');
    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});

test('unknown recipes are 404', async ({ page, allowHttpError }) => {
    allowHttpError(/\/r\/does-not-exist$/, 404); // the 404 document itself, nothing else
    const response = await page.goto('/r/does-not-exist');
    expect(response?.status()).toBe(404);
});

test.describe('theme toggle', () => {
    // Records whether <html> is already dark when <body> starts parsing, i.e. before the first paint.
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            new MutationObserver((_, observer) => {
                if (document.body) {
                    (window as any).__darkAtFirstBody = document.documentElement.classList.contains('dark');
                    observer.disconnect();
                }
            }).observe(document, { childList: true, subtree: true });
        });
    });

    test.describe('system in light mode', () => {
        test.use({ colorScheme: 'light' });

        test('toggles dark mode and keeps it across Turbo visits and reloads, without a flash', async ({ page }) => {
            const html = page.locator('html');
            const toggle = page.getByRole('button', { name: 'Toggle dark mode' });

            await page.goto('/');
            await expect(html).not.toHaveClass(/\bdark\b/);
            await expect(toggle).toHaveAttribute('aria-pressed', 'false');

            await toggle.click();
            await expect(html).toHaveClass(/\bdark\b/);
            await expect(toggle).toHaveAttribute('aria-pressed', 'true');
            expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

            await page.evaluate(() => ((window as any).__sameDocument = true));
            await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Lab' }).click();
            await expect(page).toHaveURL(/\/lab$/);
            expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
            await expect(html).toHaveClass(/\bdark\b/);
            await expect(toggle).toHaveAttribute('aria-pressed', 'true');

            await page.reload();
            expect(await page.evaluate(() => (window as any).__darkAtFirstBody)).toBe(true);

            await toggle.click();
            await expect(html).not.toHaveClass(/\bdark\b/);
            await expect(toggle).toHaveAttribute('aria-pressed', 'false');
            expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
        });
    });

    test.describe('storage blocked', () => {
        test.use({ colorScheme: 'light' });

        test('keeps the choice across Turbo visits without localStorage', async ({ page }) => {
            await page.addInitScript(() => {
                const blocked = () => {
                    throw new DOMException('blocked', 'SecurityError');
                };
                Object.defineProperty(window, 'localStorage', { get: blocked });
            });
            await page.goto('/');
            await page.getByRole('button', { name: 'Toggle dark mode' }).click();
            await expect(page.locator('html')).toHaveClass(/\bdark\b/);

            await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Lab' }).click();
            await expect(page).toHaveURL(/\/lab$/);
            await expect(page.locator('html')).toHaveClass(/\bdark\b/);
            await expect(page.getByRole('button', { name: 'Toggle dark mode' })).toHaveAttribute('aria-pressed', 'true');
        });
    });

    test.describe('system in dark mode', () => {
        test.use({ colorScheme: 'dark' });

        test('follows the system preference until a choice is saved', async ({ page }) => {
            await page.goto('/');
            expect(await page.evaluate(() => (window as any).__darkAtFirstBody)).toBe(true);
            await expect(page.getByRole('button', { name: 'Toggle dark mode' })).toHaveAttribute('aria-pressed', 'true');

            await page.emulateMedia({ colorScheme: 'light' });
            await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
        });
    });
});
