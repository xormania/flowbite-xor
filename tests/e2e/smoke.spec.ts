import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './fixtures';

// Recipes as the UX Toolkit discovers them: "<dir>/manifest.json" at depth 1 of the kit root.
const kitRoot = join(__dirname, '..', '..');
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

test('unknown recipes are 404', async ({ page, pageErrors }) => {
    const response = await page.goto('/r/does-not-exist');
    expect(response?.status()).toBe(404);
    pageErrors.length = 0; // the 404 itself is expected
});
