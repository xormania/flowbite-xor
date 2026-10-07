import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';

const day = (calendar: Locator, date: string) => calendar.locator(`[data-slot="calendar-day"][data-day="${date}"] button`);
// counts the input and change events the calendar dispatches on its hidden inputs
const countEvents = (page: Page, selector: string) =>
    page.evaluate((selector) => {
        const counts = { input: 0, change: 0 };
        const root = document.querySelector(selector)!;
        root.addEventListener('input', (event) => (event.target as HTMLElement).matches('[data-calendar-target="input"], [data-slot="calendar-inputs"]') && counts.input++);
        root.addEventListener('change', (event) => (event.target as HTMLElement).matches('[data-calendar-target="input"], [data-slot="calendar-inputs"]') && counts.change++);
        (window as any).__counts = counts;
    }, selector);
const counts = (page: Page) => page.evaluate(() => (window as any).__counts as { input: number; change: number });

test('arrow, Home, End and Page keys move the focus; right to left swaps the arrows', async ({ page }) => {
    await page.goto('/preview/calendar/default?theme=light');
    const calendar = page.getByRole('group', { name: 'Calendar' });
    await day(calendar, '2026-03-12').focus();
    await page.keyboard.press('ArrowRight');
    await expect(day(calendar, '2026-03-13')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(day(calendar, '2026-03-20')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(day(calendar, '2026-03-15')).toBeFocused();
    await page.keyboard.press('End');
    await expect(day(calendar, '2026-03-21')).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect(day(calendar, '2026-04-21')).toBeFocused();
    await expect(calendar.getByRole('grid')).toHaveAccessibleName('April 2026');
    // one day takes the Tab focus
    await expect(calendar.locator('[data-slot="calendar-day"] button[tabindex="0"]')).toHaveCount(1);

    await page.evaluate(() => (document.documentElement.dir = 'rtl'));
    await page.keyboard.press('ArrowLeft');
    await expect(day(calendar, '2026-04-22')).toBeFocused();
});

test('the month and year dropdowns move the calendar', async ({ page }) => {
    await page.goto('/preview/calendar/default?theme=light');
    const calendar = page.getByRole('group', { name: 'Calendar' });
    await calendar.getByLabel('Month', { exact: true }).selectOption('7');
    await calendar.getByLabel('Year', { exact: true }).selectOption('2027');
    await expect(calendar.getByRole('grid')).toHaveAccessibleName('July 2027');
    await calendar.getByRole('button', { name: 'Previous month' }).click();
    await expect(calendar.getByRole('grid')).toHaveAccessibleName('June 2027');
});

test('each mode submits its inputs; day buttons never submit the form', async ({ page }) => {
    await page.goto('/lab/calendar-turbo');
    const url = page.url();
    const dayCalendar = page.getByRole('group', { name: 'Day' });
    const stay = page.getByRole('group', { name: 'Stay' });
    const dates = page.getByRole('group', { name: 'Dates' });

    await day(dayCalendar, '2026-03-12').click();
    await day(stay, '2026-03-02').click();
    await day(stay, '2026-03-05').click();
    await day(dates, '2026-03-10').click();
    await day(dates, '2026-03-03').click();
    expect(page.url()).toBe(url);

    await page.getByRole('button', { name: 'Show' }).click();
    await expect(page.getByTestId('submitted')).toHaveText('day=2026-03-12 stay=2026-03-02..2026-03-05 dates=2026-03-03,2026-03-10');
    // the page rendered from the submitted values shows them selected
    await expect(day(page.getByRole('group', { name: 'Day' }), '2026-03-12')).toHaveAttribute('data-selected-single', 'true');
});

test('a pick dispatches one input and one change event on the hidden input', async ({ page }) => {
    await page.goto('/lab/calendar-turbo');
    await countEvents(page, '#cal-day');
    const calendar = page.getByRole('group', { name: 'Day' });
    await day(calendar, '2026-03-12').click();
    await expect.poll(() => counts(page)).toEqual({ input: 1, change: 1 });
    await expect(calendar.locator('input[name="day"]')).toHaveValue('2026-03-12');
    // the keyboard selects too, and a second pick of the same day clears it
    await day(calendar, '2026-03-12').press('Enter');
    await expect.poll(() => counts(page)).toEqual({ input: 2, change: 2 });
    await expect(calendar.locator('input[name="day"]')).toHaveValue('');
    // a disabled day takes no click
    await day(calendar, '2026-03-20').click({ force: true });
    await expect.poll(() => counts(page)).toEqual({ input: 2, change: 2 });
});

test('a range never spans a disabled day: a click past one starts a new range', async ({ page }) => {
    await page.goto('/lab/calendar-turbo');
    const stay = page.getByRole('group', { name: 'Stay' });
    await day(stay, '2026-03-18').click();
    await day(stay, '2026-03-22').click();
    await expect(stay.locator('input[name="stay[from]"]')).toHaveValue('2026-03-22');
    await expect(stay.locator('input[name="stay[to]"]')).toHaveValue('');
    await day(stay, '2026-03-25').click();
    await expect(stay.locator('input[name="stay[to]"]')).toHaveValue('2026-03-25');
    await expect(stay.locator('[data-range-middle="true"]')).toHaveCount(2 * 2);
});

test('in multiple mode, the inputs keep their attributes and order as dates come and go', async ({ page }) => {
    await page.goto('/lab/calendar-turbo');
    const dates = page.getByRole('group', { name: 'Dates' });
    const inputs = dates.locator('[data-slot="calendar-inputs"] input');
    await day(dates, '2026-03-10').click();
    await day(dates, '2026-03-03').click();
    await day(dates, '2026-03-17').click();
    await day(dates, '2026-03-10').click();
    await expect(inputs).toHaveCount(2);
    expect(await inputs.evaluateAll((nodes) => nodes.map((node) => [(node as HTMLInputElement).name, (node as HTMLInputElement).value, node.getAttribute('data-kept')]))).toEqual([
        ['dates[]', '2026-03-03', 'yes'],
        ['dates[]', '2026-03-17', 'yes'],
    ]);
});
