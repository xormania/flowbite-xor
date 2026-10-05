import { test, expect } from './fixtures';

test('a dropdown stays open and working while its Live Component re-renders', async ({ page }) => {
    await page.goto('/lab/live-dropdown');
    const trigger = page.getByRole('button', { name: 'Menu' });
    const menu = page.getByRole('menu');

    await trigger.click();
    await expect(menu).toBeVisible();

    await page.getByRole('button', { name: 'Re-render' }).click();
    await expect(page.getByTestId('renders')).toHaveText('1');
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await page.getByLabel('Query').fill('abc');
    await expect(page.getByTestId('query')).toHaveText('abc');
    await expect(menu).toBeVisible();

    // one click listener only: a duplicate would toggle twice and leave the menu open
    await trigger.click();
    await expect(menu).toBeHidden();
    await trigger.click();
    await expect(menu).toBeVisible();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(menu).toBeHidden();
});
