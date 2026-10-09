import type { Page } from '@playwright/test';
import { test, expect, turboVisitDone } from './fixtures';
import { back, forward, recordFirstFrames, shown, stepFromCode, visit, visitAndBack } from './transitions';

// counts the click listeners added to the document minus those removed: an open popover adds one, a closed one none
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        const add = EventTarget.prototype.addEventListener;
        const remove = EventTarget.prototype.removeEventListener;
        const listeners = new Set<unknown>();
        (window as any).__documentClicks = () => listeners.size;
        EventTarget.prototype.addEventListener = function (type: string, listener: any, options?: any) {
            if (this === document && 'click' === type) listeners.add(listener);
            return add.call(this, type, listener, options);
        };
        EventTarget.prototype.removeEventListener = function (type: string, listener: any, options?: any) {
            if (this === document && 'click' === type) listeners.delete(listener);
            return remove.call(this, type, listener, options);
        };
    });
});
const documentClicks = (page: Page) => page.evaluate(() => (window as any).__documentClicks() as number);

test('an open popover is closed after a Turbo visit and Back, and still works', async ({ page }) => {
    await page.goto('/lab/popover-turbo');
    const baseline = await documentClicks(page);
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.getByRole('dialog', { name: 'Details' })).toBeVisible();
    expect(await documentClicks(page)).toBe(baseline + 1);

    await visitAndBack(page);

    // the snapshot was taken closed
    await expect(page.getByRole('dialog', { name: 'Details' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.getByRole('dialog', { name: 'Details' })).toBeVisible();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(page.getByRole('dialog', { name: 'Details' })).toBeHidden();
});

test('the focus leaving the popover closes it', async ({ page }) => {
    await page.goto('/lab/popover-turbo');
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.getByRole('link', { name: 'Open the order' })).toBeFocused();
    // past its last link, to the next button of the page
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Owner' })).toBeFocused();
    await expect(page.getByRole('dialog', { name: 'Details' })).toBeHidden();
});

test('repeated Turbo visits leave one controller per popover and no document listener behind', async ({ page }) => {
    await page.goto('/lab/popover-turbo');
    const baseline = await documentClicks(page);
    for (let visit = 0; visit < 3; visit++) {
        await page.getByRole('button', { name: 'Owner' }).click();
        await page.getByRole('link', { name: /Go to page/ }).click();
        await turboVisitDone(page);
    }
    await expect(page.locator('[data-controller~="popover"]')).toHaveCount(6);
    expect(await documentClicks(page)).toBe(baseline);

    // one toggle per click: a second controller would open and close it again
    await page.getByRole('button', { name: 'Owner' }).click();
    await expect(page.getByRole('dialog', { name: 'Owner' })).toBeVisible();
    await page.getByRole('button', { name: 'Owner' }).click();
    await expect(page.getByRole('dialog', { name: 'Owner' })).toBeHidden();
});

test('inside a data-turbo-permanent element, the popover keeps working across visits', async ({ page }) => {
    await page.goto('/lab/popover-turbo');
    await visit(page, 'Go to page two', 'Page two');
    await page.getByRole('button', { name: 'Kept' }).click();
    await expect(page.getByRole('dialog', { name: 'Kept' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Kept' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Kept' })).toBeFocused();
});

test('inside a Turbo Frame reloaded three times, the popover works', async ({ page }) => {
    await page.goto('/lab/popover-turbo');
    for (let load = 1; load <= 3; load++) {
        await page.getByRole('button', { name: 'Framed' }).click();
        await page.getByRole('link', { name: 'Reload the frame' }).click();
        await expect(page.getByTestId('frame-load')).toHaveText(String(load));
    }
    await page.getByRole('button', { name: 'Framed' }).click();
    await expect(page.getByLabel('Note')).toBeFocused();
    await expect(page.locator('[data-controller~="popover"]')).toHaveCount(6);
});

test('replaced or updated by a Turbo Stream, the new popover works and the old one left no listener', async ({ page }) => {
    await page.goto('/lab/popover-stream');
    const baseline = await documentClicks(page);
    await page.getByRole('button', { name: 'Streamed' }).click();
    await expect(page.getByRole('dialog', { name: 'Streamed' })).toBeVisible();

    await page.getByRole('button', { name: 'Replace the popover' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('replace');
    expect(await documentClicks(page)).toBe(baseline);
    await page.getByRole('button', { name: 'Streamed' }).click();
    await expect(page.getByRole('dialog', { name: 'Streamed' })).toHaveText('Version replace.');

    await page.getByRole('button', { name: 'Update the popover' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('update');
    expect(await documentClicks(page)).toBe(baseline);
    await page.getByRole('button', { name: 'Streamed' }).click();
    await expect(page.getByRole('dialog', { name: 'Streamed' })).toHaveText('Version update.');
    await expect(page.locator('[data-controller~="popover"]')).toHaveCount(1);
});

test('a popover stays open and keeps the focus while its Live Component re-renders', async ({ page }) => {
    await page.goto('/lab/live-popover');
    const trigger = page.getByRole('button', { name: 'Edit' });
    const dialog = page.getByRole('dialog', { name: 'Edit' });
    await trigger.click();
    await expect(page.getByLabel('Note')).toBeFocused();

    await page.getByLabel('Note').fill('abc');
    await page.getByRole('button', { name: 'Re-render' }).click();
    await expect(page.getByTestId('renders')).toHaveText('1');
    await expect(page.getByTestId('note')).toHaveText('abc');
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Re-render' })).toBeFocused();

    await trigger.click();
    await expect(dialog).toBeHidden();
    await trigger.click();
    await expect(dialog).toBeVisible();
});

test('a popover whose link steps a frame promoted to history stays open with the focus, and Back shows it closed', async ({ page }) => {
    await page.goto('/lab/popover-turbo');
    const baseline = await documentClicks(page);
    const firstFrames = await recordFirstFrames(page, { steps: '#steps-content' });
    const trigger = page.getByRole('button', { name: 'Steps' });
    const dialog = page.getByRole('dialog', { name: 'Steps' });
    await trigger.click();
    await expect(page.getByRole('link', { name: 'Go to step 5' })).toBeFocused();

    // Turbo copies the page as the frame visit starts, then dispatches turbo:before-cache with the page still shown
    await visit(page, 'Go to step 5', { step: 5 });
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Go to step 5' })).toBeFocused();
    expect(await documentClicks(page)).toBe(baseline + 1);

    // the copy holds the popover open: Back shows it closed from the first frame, and it works
    await back(page, { step: 0 });
    await expect(dialog).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(await firstFrames()).toEqual([{ steps: false }]);
    expect(await documentClicks(page)).toBe(baseline);
    await trigger.click();
    await expect(dialog).toBeVisible();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-controller~="popover"]')).toHaveCount(6);
});

test('a popover open while the page code steps a frame promoted to history stays open; Back and Forward show it closed', async ({ page }) => {
    await page.goto('/lab/popover-turbo');
    const baseline = await documentClicks(page);
    const dialog = page.getByRole('dialog', { name: 'Details' });
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(page.getByRole('link', { name: 'Open the order' })).toBeFocused();

    await stepFromCode(page, 1);
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the order' })).toBeFocused();

    await back(page, { step: 0 });
    await expect(dialog).toBeHidden();
    await forward(page, { step: 1 });
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Details' })).toHaveAttribute('aria-expanded', 'false');
    expect(await documentClicks(page)).toBe(baseline);
    await page.getByRole('button', { name: 'Details' }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
});

test('turbo:before-cache closes an open popover before a Turbo visit copies the page, and not when a frame visit is promoted to history', async ({ page }) => {
    await page.goto('/lab/popover-turbo');
    // the open value of the Details popover in each copy Turbo renders, and on screen right after each turbo:before-cache
    await page.evaluate(() => {
        const w = window as any;
        w.__copies = [];
        w.__afterBeforeCache = [];
        document.addEventListener('turbo:before-render', (event: any) =>
            w.__copies.push(event.detail.newBody.querySelector('#plain-trigger')?.closest('[data-controller~="popover"]')?.dataset.popoverOpenValue),
        );
        // after every listener of the event, the popover's included
        document.addEventListener('turbo:before-cache', () =>
            queueMicrotask(() => w.__afterBeforeCache.push(document.querySelector('#plain-trigger')!.closest<HTMLElement>('[data-controller~="popover"]')!.dataset.popoverOpenValue)),
        );
    });
    const dialog = page.getByRole('dialog', { name: 'Details' });
    await page.getByRole('button', { name: 'Details' }).click();

    await stepFromCode(page, 1);
    await expect(dialog).toBeVisible();

    // a full visit started while it is open (from the page's code: a click outside would close it first)
    await page.evaluate(() => (window as any).Turbo.visit('/lab/popover-turbo/two'));
    await shown(page, 'Page two');
    await back(page, { step: 1 });
    await expect(dialog).toBeHidden();
    // the frame step left it open, the visit closed it; then Back cached page two, its own popover closed
    expect(await page.evaluate(() => (window as any).__afterBeforeCache)).toEqual(['true', 'false', 'false']);
    // the last body rendered is the copy of step 1, taken after turbo:before-cache: closed before any controller connects
    expect((await page.evaluate(() => (window as any).__copies as string[])).at(-1)).toBe('false');
});
