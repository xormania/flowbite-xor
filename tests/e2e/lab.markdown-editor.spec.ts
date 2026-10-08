import type { Page } from '@playwright/test';
import { test, expect, turboVisitDone } from './fixtures';

/*
 * Markdown editors under Turbo: a form posts the Markdown (303) or shows its errors (422), and the stored rendering is
 * the preview's; Back shows what was typed and its preview; repeated visits leave one editor per field; a
 * data-turbo-permanent editor keeps its typing; frames and Streams give fresh editors.
 */

const editors = (page: Page) => page.locator('[data-controller~="markdown-editor"]');
const tab = (page: Page, field: string, name: string) => page.locator(`#${field}_${name.toLowerCase()}_tab`);
const panel = (page: Page, field: string) => page.locator(`#${field}_preview`);

test('a form posts the Markdown through Turbo, or answers 422 with the field errors; the stored rendering is the preview', async ({ page, allowHttpError }) => {
    allowHttpError(/\/lab\/markdown-turbo$/, 422);
    await page.goto('/lab/markdown-turbo');
    await page.getByRole('button', { name: 'Publish' }).click();
    const body = page.getByRole('textbox', { name: 'Body' });
    await expect(body).toHaveAttribute('aria-invalid', 'true');
    await expect(body).toHaveAccessibleDescription('At most 200 characters. This value should not be blank.');

    await body.fill('x'.repeat(201));
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByRole('textbox', { name: 'Body' })).toHaveAccessibleDescription(/This text is too long: it holds more than 200 characters\.$/);
    // the content comes back as typed, to be shortened
    await expect(page.getByRole('textbox', { name: 'Body' })).toHaveValue('x'.repeat(201));

    const markdown = '## Big news\n\nWe **ship** [today](/news) <script>x()</script> [bad](javascript:alert(1))';
    await page.getByRole('textbox', { name: 'Body' }).fill(markdown);
    await tab(page, 'markdown_demo_body', 'Preview').click();
    await expect(panel(page, 'markdown_demo_body').getByRole('heading', { name: 'Big news' })).toBeVisible();
    const previewed = await panel(page, 'markdown_demo_body').innerHTML();

    // the textarea submits while the Preview tab is open
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByTestId('saved-markdown')).toHaveText(markdown);
    expect(await page.getByTestId('saved-rendered').innerHTML()).toBe(previewed);
    await expect(page.getByTestId('saved-rendered').getByRole('link', { name: 'today' })).toHaveAttribute('href', '/news');
    expect(previewed).not.toMatch(/<script|javascript:/i);
    expect(new URL(page.url()).searchParams.get('saved')).toBe('1');
});

test('after a visit and Back, the typing comes back in one editor, and its preview renders it', async ({ page }) => {
    await page.goto('/lab/markdown-turbo');
    await page.getByRole('textbox', { name: 'Body' }).fill('Typed **before** leaving');
    await page.getByRole('link', { name: 'Go to page two' }).click();
    await turboVisitDone(page);
    await expect(page.getByTestId('page')).toHaveText('Page two');
    await page.goBack();
    await turboVisitDone(page);
    await expect(page.getByTestId('page')).toHaveText('Page one');
    await expect(editors(page)).toHaveCount(3);

    await expect(page.getByRole('textbox', { name: 'Body' })).toHaveValue('Typed **before** leaving');
    await tab(page, 'markdown_demo_body', 'Preview').click();
    await expect(panel(page, 'markdown_demo_body').locator('strong')).toHaveText('before');
});

test('repeated visits leave one markdown editor per field', async ({ page }) => {
    await page.goto('/lab/markdown-turbo');
    for (let round = 0; round < 3; round++) {
        await page.getByRole('link', { name: 'Go to page two' }).click();
        await turboVisitDone(page);
        await expect(editors(page)).toHaveCount(3);
        await page.getByRole('link', { name: 'Go to page one' }).click();
        await turboVisitDone(page);
        await expect(editors(page)).toHaveCount(3);
    }
    await expect(page.getByRole('tablist')).toHaveCount(3);
});

test('a data-turbo-permanent markdown editor keeps its typing across visits, and its preview works', async ({ page }) => {
    await page.goto('/lab/markdown-turbo');
    const kept = page.getByRole('textbox', { name: 'Kept notes' });
    await kept.fill('Kept across visits. **Typed.**');
    await page.getByRole('link', { name: 'Go to page two' }).click();
    await turboVisitDone(page);
    await expect(page.getByRole('textbox', { name: 'Kept notes' })).toHaveValue('Kept across visits. **Typed.**');
    await tab(page, 'kept', 'Preview').click();
    await expect(panel(page, 'kept').locator('strong')).toHaveText('Typed.');
    await expect(editors(page)).toHaveCount(3);
});

test('a Turbo Frame reloaded three times gives a fresh markdown editor each time', async ({ page }) => {
    await page.goto('/lab/markdown-turbo');
    for (const load of ['1', '2', '3']) {
        await page.getByRole('textbox', { name: 'Framed notes' }).fill('changed');
        await page.getByRole('link', { name: 'Reload the frame' }).click();
        await expect(page.getByTestId('frame-load')).toHaveText(load);
        await expect(page.getByRole('textbox', { name: 'Framed notes' })).toHaveValue('In a **frame**.');
        await tab(page, 'framed', 'Preview').click();
        await expect(panel(page, 'framed').locator('strong')).toHaveText('frame');
        await tab(page, 'framed', 'Write').click();
        await expect(editors(page)).toHaveCount(3);
    }
});

test('replaced or updated by a Turbo Stream, the markdown editor shows the new content, once', async ({ page }) => {
    await page.goto('/lab/markdown-stream');
    for (const action of ['replace', 'update']) {
        await page.getByRole('textbox', { name: 'Streamed notes' }).fill('local');
        await page.getByRole('button', { name: `${action[0].toUpperCase()}${action.slice(1)} the editor` }).click();
        await expect(page.getByTestId('stream-action')).toHaveText(action);
        await expect(page.getByRole('textbox', { name: 'Streamed notes' })).toHaveValue(`Streamed: **${action}**.`);
        await tab(page, 'streamed', 'Preview').click();
        await expect(panel(page, 'streamed').locator('strong')).toHaveText(action);
        await expect(editors(page)).toHaveCount(1);
        await expect(page.getByRole('tablist')).toHaveCount(1);
        await tab(page, 'streamed', 'Write').click();
    }
});

test('after a frame visit promoted to history and Back, the typing comes back, and its preview renders it', async ({ page }) => {
    await page.goto('/lab/markdown-turbo');
    await page.getByRole('textbox', { name: 'Body' }).fill('Typed **before** the step');

    // Turbo copies the page as soon as the frame visit starts, before turbo:before-cache
    await page.getByRole('link', { name: 'Next step' }).click();
    await expect(page.getByTestId('history-step')).toHaveText('1');
    await expect.poll(() => new URL(page.url()).searchParams.get('step')).toBe('1');
    await turboVisitDone(page);
    await page.goBack();
    await expect(page.getByTestId('history-step')).toHaveText('0');
    await turboVisitDone(page);
    await expect(editors(page)).toHaveCount(3);

    await expect(page.getByRole('textbox', { name: 'Body' })).toHaveValue('Typed **before** the step');
    await tab(page, 'markdown_demo_body', 'Preview').click();
    await expect(panel(page, 'markdown_demo_body').locator('strong')).toHaveText('before');
});
