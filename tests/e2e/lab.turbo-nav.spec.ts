import { test, expect, turboVisitDone } from './fixtures';

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
    await turboVisitDone(page);
    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
    // Turbo moves the same node into the new page, but Chromium resets the scroll of a re-inserted
    // element: a permanent element that must keep its scroll restores it itself (sidebar controller).
    expect(await panel.evaluate((element) => [(element as any).__marker, element.scrollTop])).toEqual(['kept', 0]);

    await page.getByRole('button', { name: 'Toggle dark mode' }).click();
    await page.getByRole('link', { name: 'Go to page one' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page one');
    await turboVisitDone(page);
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(await panel.evaluate((element) => (element as any).__marker)).toBe('kept');
});

test('the permanent sidebar keeps its scroll, collapsed state and current item across Turbo visits', async ({ page }) => {
    await page.goto('/lab/turbo-nav');
    const sidebar = page.locator('#lab-sidebar');
    const nav = page.getByRole('navigation', { name: 'Lab' });
    await expect(nav.getByRole('link', { name: 'Page one' })).toHaveAttribute('aria-current', 'page');
    await nav.evaluate((element) => {
        element.scrollTop = 150;
        (element as any).__marker = 'kept';
    });
    expect(await nav.evaluate((element) => element.scrollTop)).toBe(150);

    await page.getByRole('link', { name: 'Go to page two' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page two');
    await turboVisitDone(page);
    expect(await nav.evaluate((element) => [(element as any).__marker, element.scrollTop])).toEqual(['kept', 150]);
    await expect(nav.getByRole('link', { name: 'Page two' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Page one' })).not.toHaveAttribute('aria-current');

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(sidebar).toHaveAttribute('data-collapsed');
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');

    await page.getByRole('link', { name: 'Go to page one' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page one');
    await turboVisitDone(page);
    await expect(sidebar).toHaveAttribute('data-collapsed');
    await expect(nav.getByRole('link', { name: 'Page one' })).toHaveAttribute('aria-current', 'page');

    await page.reload();
    await expect(sidebar).toHaveAttribute('data-collapsed');
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect(sidebar).not.toHaveAttribute('data-collapsed');
});

test('a flash toast written as a Turbo Stream shows once across Turbo visits', async ({ page }) => {
    await page.goto('/lab/turbo-nav');
    await page.evaluate(() => ((window as any).__sameDocument = true));
    const toasts = page.getByRole('region', { name: 'Notifications' }).locator('[data-controller="toast"]');

    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page two');
    await turboVisitDone(page);
    await expect(toasts).toHaveCount(1);
    await expect(toasts).toHaveText('Settings saved.');

    await page.getByRole('link', { name: 'Go to page one' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page one');
    await turboVisitDone(page);
    await page.getByRole('link', { name: 'Go to page two' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page two');
    await turboVisitDone(page);
    await page.goBack();
    await expect(page.getByTestId('page')).toHaveText('Page one');
    await turboVisitDone(page);
    await expect(toasts).toHaveCount(1);
    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});

test('on a small screen the navbar button opens the sidebar over the page', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto('/lab/turbo-nav');
    const sidebar = page.locator('#lab-sidebar');
    const menu = page.getByRole('button', { name: 'Open menu' });
    await expect(sidebar).toBeHidden();

    await menu.click();
    await expect(sidebar).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebar.getByRole('link', { name: 'Page one' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();

    await menu.click();
    await sidebar.getByRole('link', { name: 'Page two' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page two');
    await turboVisitDone(page);
    await expect(sidebar).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
});
