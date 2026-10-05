import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

const pairs = ['name', 'email', 'country', 'bio', 'plan', 'terms', 'save'];

/**
 * Largest per-channel difference between two element screenshots of the same size: rounded corners
 * anti-alias slightly differently at another x offset, a real style difference moves colors far more.
 */
async function maxChannelDelta(page: Page, a: Buffer, b: Buffer): Promise<number> {
    return page.evaluate(async ([a, b]) => {
        const load = (src: string) => new Promise<HTMLImageElement>((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.src = `data:image/png;base64,${src}`;
        });
        const pixels = (image: HTMLImageElement) => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext('2d')!;
            context.drawImage(image, 0, 0);
            return context.getImageData(0, 0, image.width, image.height).data;
        };
        const [imageA, imageB] = await Promise.all([load(a), load(b)]);
        if (imageA.width !== imageB.width || imageA.height !== imageB.height) {
            return 255;
        }
        const [pixelsA, pixelsB] = [pixels(imageA), pixels(imageB)];
        let max = 0;
        for (let i = 0; i < pixelsA.length; i++) {
            max = Math.max(max, Math.abs(pixelsA[i] - pixelsB[i]));
        }
        return max;
    }, [a.toString('base64'), b.toString('base64')]);
}

for (const colorScheme of ['light', 'dark'] as const) {
    test(`rows rendered by the form theme look like the hand-written components (${colorScheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto('/forms/parity');
        for (const pair of pairs) {
            const theme = await page.locator(`[data-pair="${pair}"][data-side="theme"]`).screenshot();
            const components = await page.locator(`[data-pair="${pair}"][data-side="components"]`).screenshot();
            expect(await maxChannelDelta(page, theme, components), `${pair} pair`).toBeLessThanOrEqual(24);
        }
    });
}

test('an empty submit shows the server-side errors, wired to the controls', async ({ page, allowHttpError }) => {
    allowHttpError(/\/forms$/, 422);
    await page.goto('/forms');
    await page.getByRole('button', { name: 'Create account' }).click();

    const name = page.getByRole('textbox', { name: 'Name' });
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription('As it appears on your invoices. This value should not be blank.');
    await expect(page.getByRole('combobox', { name: 'Country' })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('group', { name: 'Plan' })).toHaveAccessibleDescription('You can change it later. This value should not be blank.');
    await expect(page.getByRole('checkbox', { name: 'I accept the terms' })).toHaveAccessibleDescription('You must accept the terms.');
    await expect(page.getByText('Pick at least one interest.')).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Age' })).not.toHaveAttribute('aria-invalid');

    for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        const results = await new AxeBuilder({ page }).analyze();
        const serious = results.violations
            .filter((violation) => 'serious' === violation.impact || 'critical' === violation.impact)
            .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`);
        expect(serious, `serious/critical axe violations (${colorScheme})`).toEqual([]);
    }
});

test('a valid submit redirects with a success message', async ({ page }) => {
    await page.goto('/forms');
    await page.getByRole('textbox', { name: 'Name' }).fill('Ada Lovelace');
    await page.getByRole('textbox', { name: 'Email' }).fill('ada@example.com');
    await page.getByLabel('Password').fill('correct horse battery');
    await page.getByRole('combobox', { name: 'Country' }).selectOption('fr');
    await page.getByRole('radio', { name: 'Pro' }).check();
    await page.getByRole('checkbox', { name: 'Engineering' }).check();
    await page.getByRole('checkbox', { name: 'I accept the terms' }).check();
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Account created.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('');
});
