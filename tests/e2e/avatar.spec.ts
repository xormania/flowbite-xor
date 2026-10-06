import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/*
 * `Avatar:Image` starts hidden behind its `Avatar:Fallback`: the avatar controller shows it once it has loaded, also
 * when it loaded before the controller connected, and shows the fallback again when it fails. The README examples
 * load remote pictures, which the fixtures answer with a local placeholder.
 */
const PICTURE = /\/profile-picture-5\.jpg$/;

async function expectImagesShown(page: Page, count: number): Promise<void> {
    await expect(page.locator('img[data-avatar-image]')).toHaveCount(count);
    for (const image of await page.locator('img[data-avatar-image]').all()) {
        await expect(image).toBeVisible();
    }
    for (const fallback of await page.locator('[data-avatar-fallback]').all()) {
        await expect(fallback).toBeHidden();
    }
}

test('shows the image instead of the fallback once it has loaded, also from the cache', async ({ page }) => {
    await page.goto('/preview/avatar/default?theme=light');
    await expectImagesShown(page, 2);

    // the cached image may be complete before the controller connects
    await page.reload();
    await expectImagesShown(page, 2);
});

test('shows the images of a page reached by a Turbo visit', async ({ page }) => {
    await page.goto('/preview/avatar/default?theme=light');
    await page.waitForFunction(() => 'Turbo' in window);
    await page.evaluate(() => ((window as any).__sameDocument = true));

    await page.evaluate(() => (window as any).Turbo.visit('/preview/avatar/bordered?theme=light'));
    await expect(page).toHaveURL(/\/preview\/avatar\/bordered\?/);
    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
    await expectImagesShown(page, 2);
});

test('keeps the fallback when the image fails to load', async ({ page, allowHttpError }) => {
    allowHttpError(PICTURE, 404);
    await page.route(PICTURE, (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('/preview/avatar/default?theme=light');

    await expect(page.locator('[data-avatar-fallback]')).toHaveCount(2);
    for (const fallback of await page.locator('[data-avatar-fallback]').all()) {
        await expect(fallback).toBeVisible();
    }
    for (const image of await page.locator('img[data-avatar-image]').all()) {
        await expect(image).toBeHidden();
    }
});

test('shows the fallback again when a new image fails to load', async ({ page, allowHttpError }) => {
    const missing = /\/missing-picture\.jpg$/;
    allowHttpError(missing, 404);
    await page.route(missing, (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('/preview/avatar/default?theme=light');
    await expectImagesShown(page, 2);

    // what a Live Component re-render with another picture does
    const avatar = page.locator('.group\\/avatar').first();
    await avatar.locator('img').evaluate((image: HTMLImageElement) => (image.src = 'https://flowbite.com/missing-picture.jpg'));
    await expect(avatar.locator('[data-avatar-fallback]')).toBeVisible();
    await expect(avatar.locator('img')).toBeHidden();
});
