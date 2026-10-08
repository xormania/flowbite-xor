import type { Page } from '@playwright/test';
import { test, expect, turboVisitDone } from './fixtures';

/*
 * Editors under Turbo and Live: a form posts sanitized HTML (303) or shows its errors (422); Back shows the content and
 * selection and starts one editor again; a data-turbo-permanent editor keeps its content; frames and Streams give
 * fresh editors; in a Live Component, re-renders leave the typing alone, a save reads it, a reset replaces it.
 */

const editors = (page: Page) => page.locator('.ProseMirror');
const mounted = (page: Page) => expect(page.locator('[data-editor-target="preview"]')).toHaveCount(0);

test('a form posts sanitized HTML through Turbo, or answers 422 with the field errors', async ({ page, allowHttpError }) => {
    allowHttpError(/\/lab\/editor-turbo$/, 422);
    await page.goto('/lab/editor-turbo');
    await mounted(page);
    await page.getByRole('button', { name: 'Publish' }).click();
    const body = page.getByRole('textbox', { name: 'Body' });
    await expect(body).toHaveAttribute('aria-invalid', 'true');
    await expect(body).toHaveAccessibleDescription('At most 200 characters. This value should not be blank.');

    await mounted(page);
    await body.click();
    await page.keyboard.insertText('x'.repeat(201));
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByRole('textbox', { name: 'Body' })).toHaveAccessibleDescription(/This text is too long: it holds more than 200 characters\.$/);
    // the content comes back as typed, to be shortened
    await mounted(page);
    expect(await page.locator('textarea[name="editor_demo[body]"]').inputValue()).toBe(`<p>${'x'.repeat(201)}</p>`);

    await page.getByRole('textbox', { name: 'Body' }).click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('Big news');
    // a hostile body posted as it is, without the editor: the server sanitizes it
    await page.locator('textarea[name="editor_demo[body]"]').evaluate((textarea: HTMLTextAreaElement) => {
        textarea.value = '<p onclick="x()" style="color:red">Big <b>news</b> <a href="javascript:alert(1)">bad</a> <a href="/pricing" target="_blank">ok</a></p><script>x()</script><img src=x onerror=x()>';
        textarea.closest('[data-controller~="editor"]')!.removeAttribute('data-controller');
    });
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByTestId('saved-html')).toHaveText('<p>Big news <a rel="noopener noreferrer nofollow">bad</a> <a href="/pricing" rel="noopener noreferrer nofollow">ok</a></p>');
    await expect(page.getByTestId('saved-rendered').getByRole('link', { name: 'ok' })).toHaveAttribute('href', '/pricing');
    expect(new URL(page.url()).searchParams.get('saved')).toBe('1');
});

test('after a visit and Back, the content and selection come back in one editor', async ({ page }) => {
    await page.goto('/lab/editor-turbo');
    await mounted(page);
    const body = page.getByRole('textbox', { name: 'Body' });
    await body.click();
    await page.keyboard.type('Hello world');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Shift+ArrowLeft');

    await page.getByRole('link', { name: 'Go to page two' }).click();
    await turboVisitDone(page);
    await expect(page.getByTestId('page')).toHaveText('Page two');
    await page.goBack();
    await turboVisitDone(page);
    await expect(page.getByTestId('page')).toHaveText('Page one');
    await mounted(page);
    await expect(editors(page)).toHaveCount(3);
    await expect(page.getByRole('toolbar', { name: 'Formatting' })).toHaveCount(3);

    const restored = page.getByRole('textbox', { name: 'Body' });
    await expect(restored).toHaveText('Hello world');
    await restored.focus();
    await page.keyboard.type('there');
    expect(await page.locator('textarea[name="editor_demo[body]"]').inputValue()).toBe('<p>Hello there</p>');
});

test('repeated visits leave one editor per field', async ({ page }) => {
    await page.goto('/lab/editor-turbo');
    for (let round = 0; round < 3; round++) {
        await page.getByRole('link', { name: 'Go to page two' }).click();
        await turboVisitDone(page);
        await mounted(page);
        await expect(editors(page)).toHaveCount(3);
        await page.getByRole('link', { name: 'Go to page one' }).click();
        await turboVisitDone(page);
        await mounted(page);
        await expect(editors(page)).toHaveCount(3);
    }
    await expect(page.locator('[data-controller~="editor"]')).toHaveCount(3);
});

test('a data-turbo-permanent editor keeps its content across visits and stays editable', async ({ page }) => {
    await page.goto('/lab/editor-turbo');
    await mounted(page);
    const kept = page.getByRole('textbox', { name: 'Kept notes' });
    await kept.click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(' Typed.');
    await page.getByRole('link', { name: 'Go to page two' }).click();
    await turboVisitDone(page);
    await mounted(page);
    await expect(page.getByRole('textbox', { name: 'Kept notes' })).toHaveText('Kept across visits. Typed.');
    await page.getByRole('textbox', { name: 'Kept notes' }).click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(' Again.');
    expect(await page.locator('textarea[name="kept"]').inputValue()).toBe('<p>Kept across visits. Typed. Again.</p>');
    await expect(editors(page)).toHaveCount(3);
});

test('a Turbo Frame reloaded three times gives a fresh editor each time', async ({ page }) => {
    await page.goto('/lab/editor-turbo');
    for (const load of ['1', '2', '3']) {
        await mounted(page);
        await page.getByRole('textbox', { name: 'Framed notes' }).click();
        await page.keyboard.type('changed ');
        await page.getByRole('link', { name: 'Reload the frame' }).click();
        await expect(page.getByTestId('frame-load')).toHaveText(load);
        await mounted(page);
        await expect(page.getByRole('textbox', { name: 'Framed notes' })).toHaveText('In a frame.');
        await expect(editors(page)).toHaveCount(3);
    }
});

test('replaced or updated by a Turbo Stream, the editor shows the new content, once', async ({ page }) => {
    await page.goto('/lab/editor-stream');
    for (const action of ['replace', 'update']) {
        await mounted(page);
        await page.getByRole('textbox', { name: 'Streamed notes' }).click();
        await page.keyboard.type('local ');
        await page.getByRole('button', { name: `${action[0].toUpperCase()}${action.slice(1)} the editor` }).click();
        await expect(page.getByTestId('stream-action')).toHaveText(action);
        await mounted(page);
        await expect(page.getByRole('textbox', { name: 'Streamed notes' })).toHaveText(`Streamed: ${action}.`);
        await expect(editors(page)).toHaveCount(1);
        await expect(page.getByRole('toolbar')).toHaveCount(1);
    }
});

test('in a Live Component, re-renders leave the typing alone, a save reads it and a reset replaces it', async ({ page }) => {
    await page.goto('/lab/live-editor');
    await mounted(page);
    const body = page.getByRole('textbox', { name: 'Body' });
    await body.click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(' Edited locally.');

    // an unrelated re-render while the edit has not reached the component
    await page.getByRole('textbox', { name: 'Note' }).fill('hello');
    await expect(page.getByTestId('note')).toHaveText('hello');
    await expect(page.getByRole('textbox', { name: 'Body' })).toHaveText('Draft from the server. Edited locally.');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('saved')).toHaveText('<p>Draft from the server. Edited locally.</p>');
    await expect(page.getByRole('textbox', { name: 'Body' })).toHaveText('Draft from the server. Edited locally.');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByRole('textbox', { name: 'Body' })).toHaveText('Reset by the server.');
    await expect(editors(page)).toHaveCount(1);
    await page.getByRole('textbox', { name: 'Body' }).click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(' Again.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('saved')).toHaveText('<p>Reset by the server. Again.</p>');
});

test('in a Live Component, a re-render while the editor has the focus does not lose the typing', async ({ page }) => {
    await page.goto('/lab/live-editor');
    await mounted(page);
    const body = page.getByRole('textbox', { name: 'Body' });
    await body.click();
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.type(' Typed while it re-renders.');
    // a server re-render (polling, another update) puts the component's older body back into the textarea
    await page.locator('[data-controller~="live"]').evaluate((element) => (element as any).__component.render());
    await expect(body).toBeFocused();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('saved')).toHaveText('<p>Draft from the server. Typed while it re-renders.</p>');
});
