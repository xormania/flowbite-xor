import { test, expect } from './fixtures';

test('a dropdown inside a Turbo Frame works after every frame reload', async ({ page }) => {
    await page.goto('/lab/turbo-frame-detail');
    await page.evaluate(() => ((window as any).__sameDocument = true));

    for (const item of ['Apple', 'Banana', 'Apple']) {
        await page.getByRole('navigation', { name: 'Items' }).getByRole('link', { name: item }).click();
        await expect(page.getByTestId('detail-title')).toHaveText(item);

        const trigger = page.getByRole('button', { name: `Options for ${item}` });
        await trigger.click();
        await expect(page.getByRole('menuitem', { name: `Edit ${item}` })).toBeVisible();
        await trigger.click();
        await expect(page.getByRole('menuitem', { name: `Edit ${item}` })).toBeHidden();
    }
    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});
