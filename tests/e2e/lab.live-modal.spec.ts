import { test, expect } from './fixtures';

test('an open modal stays modal across a Live re-render, a closed one stays closed', async ({ page }) => {
    await page.goto('/lab/live-modal');
    const dialog = page.getByRole('dialog');

    await page.getByRole('button', { name: 'Open modal' }).click();
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Re-render from the modal' }).click();
    await expect(page.getByTestId('modal-renders')).toHaveText('1');
    await expect(dialog).toBeVisible();
    expect(await page.locator('dialog').evaluate((element) => element.matches(':modal'))).toBe(true);

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Re-render from the page' }).click();
    await expect(page.getByTestId('renders')).toHaveText('2');
    await expect(dialog).toBeHidden();
});
