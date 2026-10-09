import type { Locator, Page } from '@playwright/test';
import { test, expect, turboVisitDone } from './fixtures';
import { visit, visitAndBack } from './transitions';

const day = (calendar: Locator, date: string) => calendar.locator(`[data-slot="calendar-day"][data-day="${date}"] button`);
const grid = (calendar: Locator) => calendar.getByRole('grid');
const changes = (page: Page) => page.evaluate(() => (window as any).__changes as number);
const countChanges = (page: Page) =>
    page.evaluate(() => {
        (window as any).__changes = 0;
        document.addEventListener('change', (event) => (event.target as HTMLElement).matches('[data-calendar-target="input"]') && (window as any).__changes++);
    });

// its form is a GET form: Back shows the month and selection of the URL, not the pick made before leaving
test('a Turbo visit and Back show the month and selection of the URL, and the calendar still works', async ({ page }) => {
    await page.goto('/lab/calendar-turbo');
    const calendar = () => page.getByRole('group', { name: 'Day' });
    await calendar().getByRole('button', { name: 'Next month' }).click();
    await expect(grid(calendar())).toHaveAccessibleName('April 2026');
    await day(calendar(), '2026-04-08').click();

    await visitAndBack(page);

    await expect(grid(calendar())).toHaveAccessibleName('March 2026');
    await expect(calendar().locator('input[name="day"]')).toHaveValue('');
    await calendar().getByRole('button', { name: 'Next month' }).click();
    await expect(day(calendar(), '2026-04-08')).toHaveAttribute('data-selected-single', 'false');
    await countChanges(page);
    await day(calendar(), '2026-04-09').click();
    await expect(calendar().locator('input[name="day"]')).toHaveValue('2026-04-09');
    expect(await changes(page)).toBe(1);
});

test('repeated Turbo visits leave one controller per calendar and one change per pick', async ({ page }) => {
    await page.goto('/lab/calendar-turbo');
    for (let visit = 0; visit < 3; visit++) {
        await page.getByRole('link', { name: /Go to page/ }).click();
        await turboVisitDone(page);
    }
    await expect(page.locator('[data-controller~="calendar"]')).toHaveCount(5);
    await countChanges(page);
    const calendar = page.getByRole('group', { name: 'Day' });
    await day(calendar, '2026-03-11').click();
    await expect(calendar.locator('input[name="day"]')).toHaveValue('2026-03-11');
    expect(await changes(page)).toBe(1);
    // one navigation per click: a second controller would move two months
    await calendar.getByRole('button', { name: 'Next month' }).click();
    await expect(grid(calendar)).toHaveAccessibleName('April 2026');
});

test('inside a data-turbo-permanent element, the calendar keeps its month across visits', async ({ page }) => {
    await page.goto('/lab/calendar-turbo');
    const kept = page.getByRole('group', { name: 'Kept' });
    await kept.getByRole('button', { name: 'Next month' }).click();
    await visit(page, 'Go to page two', 'Page two');
    await expect(grid(kept)).toHaveAccessibleName('April 2026');
    await kept.getByRole('button', { name: 'Next month' }).click();
    await expect(grid(kept)).toHaveAccessibleName('May 2026');
});

test('inside a Turbo Frame reloaded three times, the calendar works', async ({ page }) => {
    await page.goto('/lab/calendar-turbo');
    for (let load = 1; load <= 3; load++) {
        await page.getByRole('link', { name: 'Reload the frame' }).click();
        await expect(page.getByTestId('frame-load')).toHaveText(String(load));
    }
    const framed = page.getByRole('group', { name: 'Framed' });
    await framed.getByRole('button', { name: 'Next month' }).click();
    await expect(grid(framed)).toHaveAccessibleName('April 2026');
    await expect(page.locator('[data-controller~="calendar"]')).toHaveCount(5);
});

test('replaced or updated by a Turbo Stream, the new calendar works', async ({ page }) => {
    await page.goto('/lab/calendar-stream');
    const calendar = page.getByRole('group', { name: 'Streamed' });
    await page.getByRole('button', { name: 'Replace the calendar' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('replace');
    await calendar.getByRole('button', { name: 'Next month' }).click();
    await expect(grid(calendar)).toHaveAccessibleName('April 2026');

    await page.getByRole('button', { name: 'Update the calendar' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('update');
    await expect(grid(calendar)).toHaveAccessibleName('May 2026');
    await calendar.getByRole('button', { name: 'Next month' }).click();
    await expect(grid(calendar)).toHaveAccessibleName('June 2026');
    await expect(page.locator('[data-controller~="calendar"]')).toHaveCount(1);
});

test('Live properties follow the picks, and bounds, locale and a clear from the server update the grid', async ({ page }) => {
    await page.goto('/lab/live-calendar');
    const dayCalendar = page.getByRole('group', { name: 'Day' });
    const stay = page.getByRole('group', { name: 'Stay' });

    await day(dayCalendar, '2026-03-12').click();
    await expect(page.getByTestId('day')).toHaveText('2026-03-12');
    await expect(day(dayCalendar, '2026-03-12')).toHaveAttribute('data-selected-single', 'true');

    await day(stay, '2026-03-02').click();
    await day(stay, '2026-03-06').click();
    await expect(page.getByTestId('stay')).toHaveText('2026-03-02..2026-03-06');
    await expect(stay.locator('[data-range-middle="true"]')).toHaveCount(3 * 2);

    // bounds and locale changed by the server re-render the grid without losing the month or the selection
    await page.getByLabel('Earliest day').selectOption('2026-03-10');
    await expect(day(dayCalendar, '2026-03-05')).toBeDisabled();
    await expect(day(dayCalendar, '2026-03-12')).toHaveAttribute('data-selected-single', 'true');
    await page.getByLabel('Language').selectOption('fr');
    await expect(grid(dayCalendar)).toHaveAccessibleName('mars 2026');
    await expect(dayCalendar.locator('[data-slot="calendar-weekday"]').first()).toHaveAttribute('aria-label', 'dimanche');

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByTestId('day')).toHaveText('');
    await expect(page.getByTestId('stay')).toHaveText('..');
    await expect(dayCalendar.locator('[data-selected="true"]')).toHaveCount(0);
    await expect(stay.locator('[data-selected="true"]')).toHaveCount(0);
    await expect(page.locator('[data-calendar-target="input"]')).toHaveCount(3);
});
