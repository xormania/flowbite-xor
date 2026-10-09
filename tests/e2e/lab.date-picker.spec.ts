import type { Locator, Page } from '@playwright/test';
import { test, expect, turboVisitDone } from './fixtures';
import { back, recordFirstFrames, stepFromCode, visit, visitAndBack } from './transitions';

const day = (scope: Locator, date: string) => scope.locator(`[data-slot="calendar-day"][data-day="${date}"] button`);
const pick = async (page: Page, label: string, date: string) => {
    await page.getByRole('button', { name: `${label}: choose date` }).click();
    await day(page.getByRole('dialog', { name: 'Choose a date' }), date).click();
};
const countChanges = (page: Page) =>
    page.evaluate(() => {
        (window as any).__changes = 0;
        document.addEventListener('change', (event) => (event.target as HTMLElement).matches('[data-calendar-target="input"]') && (window as any).__changes++);
    });
const changes = (page: Page) => page.evaluate(() => (window as any).__changes as number);

test('a pick is submitted by the form; the day buttons never submit it', async ({ page }) => {
    await page.goto('/lab/date-picker-turbo');
    const url = page.url();
    await pick(page, 'Due date', '2026-03-12');
    expect(page.url()).toBe(url);
    await expect(page.getByLabel('Due date', { exact: true })).toHaveValue('Mar 12, 2026');
    await page.getByRole('button', { name: 'Show' }).click();
    await expect(page.getByTestId('submitted')).toHaveText('due=2026-03-12');
    await expect(page.getByLabel('Due date', { exact: true })).toHaveValue('Mar 12, 2026');
});

test('a Turbo visit and Back show the picked date in the field, the calendar and the hidden input, closed', async ({ page }) => {
    await page.goto('/lab/date-picker-turbo');
    await pick(page, 'Due date', '2026-03-12');
    await visitAndBack(page);

    await expect(page.getByLabel('Due date', { exact: true })).toHaveValue('Mar 12, 2026');
    await expect(page.locator('input[name="due"]')).toHaveValue('2026-03-12');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await countChanges(page);
    await pick(page, 'Due date', '2026-03-13');
    await expect(page.locator('input[name="due"]')).toHaveValue('2026-03-13');
    expect(await changes(page)).toBe(1);
});

test('repeated Turbo visits leave one controller per picker and one change per pick', async ({ page }) => {
    await page.goto('/lab/date-picker-turbo');
    for (let visit = 0; visit < 3; visit++) {
        await page.getByRole('link', { name: /Go to page/ }).click();
        await turboVisitDone(page);
    }
    await expect(page.locator('[data-controller~="date-picker"]')).toHaveCount(3);
    await countChanges(page);
    await pick(page, 'Due date', '2026-03-11');
    await expect(page.locator('input[name="due"]')).toHaveValue('2026-03-11');
    expect(await changes(page)).toBe(1);
});

test('inside a data-turbo-permanent element and a Turbo Frame reloaded three times, the pickers work', async ({ page }) => {
    await page.goto('/lab/date-picker-turbo');
    await visit(page, 'Go to page two', 'Page two');
    await pick(page, 'Kept date', '2026-03-05');
    await expect(page.getByLabel('Kept date', { exact: true })).toHaveValue('Mar 5, 2026');

    for (let load = 1; load <= 3; load++) {
        await page.getByRole('link', { name: 'Reload the frame' }).click();
        await expect(page.getByTestId('frame-load')).toHaveText(String(load));
    }
    await pick(page, 'Framed date', '2026-03-06');
    await expect(page.getByLabel('Framed date', { exact: true })).toHaveValue('Mar 6, 2026');
});

test('replaced or updated by a Turbo Stream, the new picker shows its date and works', async ({ page }) => {
    await page.goto('/lab/date-picker-stream');
    await page.getByRole('button', { name: 'Replace the picker' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('replace');
    await page.getByRole('button', { name: 'Update the picker' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('update');
    const trigger = page.getByRole('button', { name: /Mar 25, 2026/ });
    await trigger.click();
    await day(page.getByRole('dialog'), '2026-03-27').click();
    await expect(page.getByRole('button', { name: /Mar 27, 2026/ })).toBeVisible();
    await expect(page.locator('input[name="streamed"]')).toHaveValue('2026-03-27');
    await expect(page.locator('[data-controller~="date-picker"]')).toHaveCount(1);
});

test('in a Live form, a pick reaches the server and the end date follows the start', async ({ page }) => {
    await page.goto('/lab/live-date-picker');
    await page.getByRole('button', { name: 'Choose date' }).first().click();
    await day(page.getByRole('dialog'), '2026-03-10').click();
    await expect(page.getByTestId('start')).toHaveText('2026-03-10');

    // the end's calendar now starts on the 10th
    await page.getByRole('button', { name: 'Choose date' }).nth(1).click();
    const endDialog = page.getByRole('dialog');
    await expect(day(endDialog, '2026-03-09')).toBeDisabled();
    await day(endDialog, '2026-03-12').click();
    await expect(page.getByTestId('end')).toHaveText('2026-03-12');
    await expect(page.getByRole('textbox', { name: 'End' })).toHaveValue('Mar 12, 2026');
    await expect(page.getByRole('textbox', { name: 'Start' })).toHaveValue('Mar 10, 2026');
    await expect(page.locator('[data-calendar-target="input"]')).toHaveCount(2);
});

test('a date picker open while the page code steps a frame promoted to history stays open on its day; Back shows it closed with the pick', async ({ page }) => {
    await page.goto('/lab/date-picker-turbo');
    const firstFrames = await recordFirstFrames(page, { calendar: '#due-picker-content' });
    await pick(page, 'Due date', '2026-03-12');
    await page.getByRole('button', { name: 'Due date: choose date' }).click();
    const calendar = page.getByRole('dialog', { name: 'Choose a date' });
    await expect(day(calendar, '2026-03-12')).toBeFocused();

    await stepFromCode(page, 1);
    await expect(calendar).toBeVisible();
    await expect(day(calendar, '2026-03-12')).toBeFocused();
    await day(calendar, '2026-03-13').click();
    await expect(calendar).toBeHidden();
    await expect(page.getByLabel('Due date', { exact: true })).toHaveValue('Mar 13, 2026');

    // the copy was taken as the frame visit started: open, on the first pick
    await back(page, { step: 0 });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Due date: choose date' })).toHaveAttribute('aria-expanded', 'false');
    expect(await firstFrames()).toEqual([{ calendar: false }]);
    await expect(page.getByLabel('Due date', { exact: true })).toHaveValue('Mar 12, 2026');
    await expect(page.locator('input[name="due"]')).toHaveValue('2026-03-12');
    await pick(page, 'Due date', '2026-03-05');
    await expect(page.getByLabel('Due date', { exact: true })).toHaveValue('Mar 5, 2026');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // a click on the frame's own link closes the picker first, as any click outside it
    await page.getByRole('button', { name: 'Due date: choose date' }).click();
    await visit(page, 'Next step', { step: 1 });
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
