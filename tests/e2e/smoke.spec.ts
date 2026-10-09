import { test, expect } from './fixtures';
import { recipes } from './inventory';

// Every page answering 200 with its heading: a11y.spec.ts, which opens each of them. The theme toggle: theme-toggle.spec.ts.

test('the index lists every recipe of the kit', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Flowbite xor');
    await expect(page.getByTestId('recipe-count')).toHaveText(`(${recipes.length})`);
    // grouped by type (components, then blocks), each group sorted by name
    expect((await page.getByTestId('recipe-list').getByRole('link').allTextContents()).sort()).toEqual(recipes);
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
