import { test, expect } from './fixtures';

// Temporary probe for the Jev diagnosis step: never merged.
test('jev probe: a deliberately wrong heading fails on every attempt', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not the heading', { timeout: 2000 });
});

test('jev probe: fails first, passes on retry', async ({ page }, testInfo) => {
    await page.goto('/');
    expect(testInfo.retry, 'first attempt fails on purpose').toBeGreaterThan(0);
});
