import type { Locator, Page } from '@playwright/test';
import { test, expect, turboVisitDone } from './fixtures';

/*
 * Dropzones under Turbo: a zone that Turbo shows again (Back, a Stream) works, with one controller, and shows what its
 * input holds (one file: nothing); a zone inside a data-turbo-permanent element keeps its file; a multipart form inside
 * a Turbo Frame posts its file.
 */

// a 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });
const text = (name: string) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(`${name}\n`) });

const zoneOf = (page: Page, id: string) => page.locator(`[data-controller~="dropzone-assist"]:has(#${id})`);
const fileCount = (input: Locator) => input.evaluate((element: HTMLInputElement) => element.files?.length ?? 0);

/** Counts the `dropzone:<type>` events from now on, by type. */
const countEvents = (page: Page) =>
    page.evaluate(() => {
        (window as any).__events = {};
        for (const type of ['change', 'clear', 'remove']) {
            document.addEventListener(`dropzone:${type}`, () => ((window as any).__events[type] = ((window as any).__events[type] ?? 0) + 1));
        }
    });
const events = (page: Page, type: string) => page.evaluate((type) => ((window as any).__events[type] ?? 0) as number, type);

/** The zone of one file shows its box and no file. */
async function expectEmptySingle(page: Page, id: string) {
    const zone = zoneOf(page, id);
    await expect(zone.locator('[data-symfony--ux-dropzone--dropzone-target="placeholder"]')).toBeVisible();
    await expect(zone.locator('[data-symfony--ux-dropzone--dropzone-target="preview"]')).toBeHidden();
    await expect(page.locator(`#${id}`)).toBeVisible();
    expect(await fileCount(page.locator(`#${id}`))).toBe(0);
}

async function visit(page: Page, link: string | RegExp, heading: string) {
    await page.getByRole('link', { name: link }).click();
    await expect(page.getByTestId('page')).toHaveText(heading);
    await turboVisitDone(page);
}

test('after a Turbo visit and Back, the zones are empty, have one controller each, and take a new pick', async ({ page }) => {
    await page.goto('/lab/dropzone-turbo');
    await page.locator('#photo').setInputFiles(png('tiny.png'));
    await page.locator('#attachments').setInputFiles([text('a.txt'), text('b.txt')]);
    await expect(page.getByRole('button', { name: 'Remove tiny.png' })).toBeVisible();
    await expect(page.locator('.dropzone-preview-list-item')).toHaveCount(2);

    await visit(page, 'Go to page two', 'Page two');
    await page.goBack();
    await expect(page.getByTestId('page')).toHaveText('Page one');
    await turboVisitDone(page);

    await expectEmptySingle(page, 'photo');
    // Turbo's copy of the page may hold the files of an input (Chromium copies them): the list shows what it holds
    const kept = await fileCount(page.locator('#attachments'));
    await expect(page.locator('.dropzone-preview-list-item')).toHaveCount(kept);
    await expect(page.locator('[data-controller~="dropzone-assist"]')).toHaveCount(4);
    await expect(page.locator('[data-controller~="dropzone-assist"][data-dragging]')).toHaveCount(0);

    await countEvents(page);
    await page.locator('#photo').setInputFiles(png('again.png'));
    await expect(page.getByRole('button', { name: 'Remove again.png' })).toBeVisible();
    await page.locator('#attachments').setInputFiles(text('c.txt'));
    await expect(page.locator('.dropzone-preview-list-item')).toHaveCount(kept + 1);
    expect(await fileCount(page.locator('#attachments'))).toBe(kept + 1);
    expect(await events(page, 'change')).toBe(2);
});

test('repeated Turbo visits leave one controller per zone and one change per pick', async ({ page }) => {
    await page.goto('/lab/dropzone-turbo');
    for (let visitCount = 0; visitCount < 6; visitCount++) {
        await visit(page, /Go to page/, visitCount % 2 ? 'Page one' : 'Page two');
    }
    await expect(page.locator('[data-controller~="dropzone-assist"]')).toHaveCount(4);
    await countEvents(page);
    await page.locator('#photo').setInputFiles(png('tiny.png'));
    await page.locator('#attachments').setInputFiles([text('a.txt'), text('b.txt')]);
    await expect(page.locator('.dropzone-preview-list-item')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Remove tiny.png' })).toBeVisible();
    expect(await events(page, 'change')).toBe(2);
});

test('a zone inside a data-turbo-permanent element keeps its file across a visit', async ({ page }) => {
    await page.goto('/lab/dropzone-turbo');
    await page.locator('#kept').setInputFiles(png('kept.png'));
    await expect(page.getByRole('button', { name: 'Remove kept.png' })).toBeVisible();

    await visit(page, 'Go to page two', 'Page two');
    await expect(page.getByRole('button', { name: 'Remove kept.png' })).toBeVisible();
    expect(await fileCount(page.locator('#kept'))).toBe(1);

    await countEvents(page);
    await page.getByRole('button', { name: 'Remove kept.png' }).click();
    await expectEmptySingle(page, 'kept');
    await expect(page.locator('#kept')).toBeFocused();
    expect(await events(page, 'clear')).toBe(1);
});

test('a multipart form inside a Turbo Frame reloaded three times posts its file: 303 into the frame, 422 with the error', async ({ page, allowHttpError }) => {
    allowHttpError(/\/lab\/dropzone-turbo$/, 422);
    await page.goto('/lab/dropzone-turbo');
    const url = page.url();
    for (let load = 1; load <= 3; load++) {
        await page.getByRole('link', { name: 'Reload the frame' }).click();
        await expect(page.getByTestId('frame-load')).toHaveText(String(load));
    }
    await expect(page.locator('[data-controller~="dropzone-assist"]')).toHaveCount(4);

    // not an image: a 422 shows the error in the frame, the zone empty and invalid
    await page.locator('#framed').setInputFiles({ name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.locator('#framed_error')).toBeVisible();
    await expect(page.locator('#framed')).toHaveAttribute('aria-invalid', 'true');
    await expectEmptySingle(page, 'framed');
    expect(page.url()).toBe(url);

    await page.locator('#framed').setInputFiles(png('tiny.png'));
    await page.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByTestId('framed')).toHaveText('framed=tiny.png');
    await expect(page.locator('#framed_error')).toHaveCount(0);
    await expectEmptySingle(page, 'framed');
    expect(page.url()).toBe(url);
    await expect(page.locator('[data-controller~="dropzone-assist"]')).toHaveCount(4);
});

test('replaced or updated by a Turbo Stream, the new zone is empty, works, and has one controller', async ({ page }) => {
    await page.goto('/lab/dropzone-stream');
    for (const action of ['replace', 'update']) {
        await page.locator('#streamed').setInputFiles(png('tiny.png'));
        await expect(page.getByRole('button', { name: 'Remove tiny.png' })).toBeVisible();
        await page.locator('#streamed').dispatchEvent('dragenter');
        await expect(page.locator('[data-controller~="dropzone-assist"][data-dragging]')).toHaveCount(1);

        await page.getByRole('button', { name: `${action[0].toUpperCase()}${action.slice(1)} the dropzone` }).click();
        await expect(page.getByTestId('stream-action')).toHaveText(action);
        await expectEmptySingle(page, 'streamed');
        await expect(page.locator('[data-controller~="dropzone-assist"]')).toHaveCount(1);
        await expect(page.locator('[data-controller~="dropzone-assist"][data-dragging]')).toHaveCount(0);
    }

    await countEvents(page);
    await page.locator('#streamed').setInputFiles(png('new.png'));
    await expect(page.getByRole('button', { name: 'Remove new.png' })).toBeVisible();
    expect(await events(page, 'change')).toBe(1);
});
