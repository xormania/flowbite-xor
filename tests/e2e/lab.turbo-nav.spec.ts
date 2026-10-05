import { test, expect } from './fixtures';

test('a data-turbo-permanent panel is kept across Turbo visits (not its scroll) and the theme persists', async ({ page }) => {
    await page.goto('/lab/turbo-nav');
    const panel = page.getByRole('complementary', { name: 'Permanent panel' });
    await panel.evaluate((element) => {
        element.scrollTop = 200;
        (element as any).__marker = 'kept';
    });
    await page.evaluate(() => ((window as any).__sameDocument = true));

    await page.getByRole('link', { name: 'Go to page two' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page two');
    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
    // Turbo moves the same node into the new page, but Chromium resets the scroll of a re-inserted
    // element: a permanent element that must keep its scroll restores it itself (sidebar controller, phase 4).
    expect(await panel.evaluate((element) => [(element as any).__marker, element.scrollTop])).toEqual(['kept', 0]);

    await page.getByRole('button', { name: 'Toggle dark mode' }).click();
    await page.getByRole('link', { name: 'Go to page one' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page one');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(await panel.evaluate((element) => (element as any).__marker)).toBe('kept');
});
