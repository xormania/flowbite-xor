import { test, expect, turboVisitDone } from './fixtures';

test('a Live Component inside a data-turbo-permanent element keeps its state and stays live', async ({ page }) => {
    await page.goto('/lab/permanent-plus-live');
    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.getByTestId('count')).toHaveText('1');

    await page.getByRole('link', { name: 'Go to page two' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page two');
    await turboVisitDone(page);
    await expect(page.getByTestId('count')).toHaveText('1');

    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.getByTestId('count')).toHaveText('2');

    await page.getByRole('link', { name: 'Go to page one' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page one');
    await turboVisitDone(page);
    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.getByTestId('count')).toHaveText('3');
});
