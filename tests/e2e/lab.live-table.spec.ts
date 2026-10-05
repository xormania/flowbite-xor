import { test, expect } from './fixtures';

test('dropdowns in rows re-sorted by a Live action keep working', async ({ page }) => {
    await page.goto('/lab/live-table');
    const rows = page.getByTestId('row');
    await expect(rows.first()).toHaveAttribute('data-row', 'apple');

    await page.getByRole('button', { name: /^Stock/ }).click();
    await expect(rows.first()).toHaveAttribute('data-row', 'banana');

    await page.getByRole('button', { name: 'Actions for Cherry' }).click();
    await expect(page.getByRole('menuitem', { name: 'Edit Cherry' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem', { name: 'Edit Cherry' })).toBeHidden();

    await page.getByRole('button', { name: /^Stock/ }).click();
    await expect(rows.first()).toHaveAttribute('data-row', 'cherry');

    await page.getByRole('button', { name: 'Actions for Apple' }).click();
    await expect(page.getByRole('menuitem', { name: 'Edit Apple' })).toBeVisible();
    await expect(page.getByRole('menu')).toHaveCount(1);
});
