import { test, expect } from './fixtures';
import { visit } from './transitions';

test('a toast pushed by a Turbo Stream appears, dismisses itself and leaves focus alone', async ({ page }) => {
    await page.goto('/lab/turbo-stream-toast');
    const region = page.getByRole('region', { name: 'Notifications' });
    const timeout = page.getByLabel('Timeout (ms)');

    // submitted from the keyboard: the toast appears without taking focus
    await timeout.press('Enter');
    const toast = region.getByText('Notification 1 sent.');
    await expect(toast).toBeVisible();
    await expect(timeout).toBeFocused();
    await expect(region).toHaveAttribute('aria-live', 'polite');
    await expect(toast).toBeHidden({ timeout: 4000 });
    await expect(region.locator('[data-controller="toast"]')).toHaveCount(0);
});

test('a toast pauses while hovered and closes from its button', async ({ page }) => {
    await page.goto('/lab/turbo-stream-toast');
    const region = page.getByRole('region', { name: 'Notifications' });

    await page.getByRole('button', { name: 'Notify' }).click();
    const first = region.locator('[data-controller="toast"]', { hasText: 'Notification 1 sent.' });
    await first.hover();
    await page.waitForTimeout(2000);
    await expect(first).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(first).toBeHidden({ timeout: 4000 });

    await page.getByLabel('Timeout (ms)').fill('0');
    await page.getByRole('button', { name: 'Notify' }).click();
    const second = region.locator('[data-controller="toast"]', { hasText: 'Notification 2 sent.' });
    await expect(second).toBeVisible();
    await second.getByRole('button', { name: 'Close' }).click();
    await expect(second).toBeHidden();
});

test('a toast stays paused while it is still hovered or focused', async ({ page }) => {
    await page.goto('/lab/turbo-stream-toast');
    const region = page.getByRole('region', { name: 'Notifications' });

    await page.getByRole('button', { name: 'Notify' }).click();
    const toast = region.locator('[data-controller="toast"]', { hasText: 'Notification 1 sent.' });
    const close = toast.getByRole('button', { name: 'Close' });
    await close.hover();
    await close.focus();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(2000);
    await expect(toast).toBeVisible();

    await toast.hover();
    await page.getByLabel('Timeout (ms)').focus();
    await page.waitForTimeout(2000);
    await expect(toast).toBeVisible();

    await page.mouse.move(0, 0);
    await expect(toast).toBeHidden({ timeout: 4000 });
});

test('a toast in the permanent region still dismisses itself after a Turbo visit', async ({ page }) => {
    await page.goto('/lab/turbo-stream-toast');
    const region = page.getByRole('region', { name: 'Notifications' });

    await page.getByLabel('Timeout (ms)').fill('2000');
    await page.getByRole('button', { name: 'Notify' }).click();
    const toast = region.locator('[data-controller="toast"]', { hasText: 'Notification 1 sent.' });
    await expect(toast).toBeVisible();

    await visit(page, 'Go to turbo-nav', 'Page one');
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 4000 });
});
