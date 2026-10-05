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

test('tooltips in rows re-sorted by a Live action keep working and stay described', async ({ page }) => {
    await page.goto('/lab/live-table');
    const trigger = page.getByRole('button', { name: '40', exact: true });
    const tooltip = page.getByRole('tooltip', { name: '40 Cherry crates in the warehouse' });

    await page.getByRole('button', { name: /^Stock/ }).click();
    await expect(page.getByTestId('row').first()).toHaveAttribute('data-row', 'banana');
    await page.getByRole('button', { name: /^Stock/ }).click();
    await expect(page.getByTestId('row').first()).toHaveAttribute('data-row', 'cherry');

    await trigger.hover();
    await expect(tooltip).toBeVisible();
    await expect(trigger).toHaveAccessibleDescription('40 Cherry crates in the warehouse');
    const [tip, button] = await Promise.all([tooltip.boundingBox(), trigger.boundingBox()]);
    expect(tip!.y + tip!.height).toBeLessThanOrEqual(button!.y);

    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();

    await trigger.focus();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
});

test('a tooltip that does not fit above its trigger opens below it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 240 });
    await page.goto('/lab/live-table');
    const trigger = page.getByRole('button', { name: '12', exact: true });
    await trigger.evaluate((element) => {
        document.body.style.paddingBottom = '100vh';
        window.scrollBy(0, element.getBoundingClientRect().top - 4);
    });
    expect(await trigger.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(10);

    await trigger.hover();
    const tooltip = page.getByRole('tooltip', { name: '12 Apple crates in the warehouse' });
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveAttribute('data-placement', 'bottom');
    const [tip, button] = await Promise.all([tooltip.boundingBox(), trigger.boundingBox()]);
    expect(tip!.y).toBeGreaterThanOrEqual(button!.y + button!.height);
});
