import { test, expect, turboVisitDone } from './fixtures';
import { back, visit } from './transitions';
import { chartCount, chartState, roleColor, toggleDark } from './chart-helpers';

// counts the charts the theme redraws (chart:themed bubbles to the document)
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        (window as any).__themed = 0;
        document.addEventListener('chart:themed', () => (window as any).__themed++);
    });
});
const themed = (page: import('@playwright/test').Page) => page.evaluate(() => (window as any).__themed as number);
const charts = (page: import('@playwright/test').Page) => page.locator('canvas[data-controller~="symfony--ux-chartjs--chart"]').count();

test('after a Turbo visit and Back, every chart is drawn once and none is left behind', async ({ page }) => {
    await page.goto('/lab/chart-turbo');
    await expect.poll(() => chartCount(page)).toBe(4);
    await visit(page, 'Go to page two', 'Page two');
    // page two: the line, the permanent one, the framed one
    await expect.poll(() => chartCount(page)).toBe(3);

    await back(page, 'Page one');
    await expect.poll(() => chartCount(page)).toBe(4);
    for (const id of ['lab-bar', 'lab-doughnut', 'lab-kept', 'lab-framed']) {
        expect(await chartState(page, id), id).not.toBeNull();
    }
});

test('repeated visits leave one chart per canvas; a theme switch redraws each chart once', async ({ page }) => {
    await page.goto('/lab/chart-turbo');
    for (let visit = 0; visit < 3; visit++) {
        await page.getByRole('link', { name: /Go to page/ }).click();
        await turboVisitDone(page);
        await expect.poll(() => chartCount(page)).toBe(await charts(page));
    }
    const before = await themed(page);
    await toggleDark(page);
    await expect.poll(() => themed(page)).toBe(before + (await charts(page)));
    expect((await chartState(page, 'lab-kept'))!.colors).toEqual([expect.stringContaining('rgba(')]);
});

test('inside a data-turbo-permanent element the chart keeps its canvas and follows the theme', async ({ page }) => {
    await page.goto('/lab/chart-turbo');
    await page.locator('#lab-kept canvas').evaluate((canvas) => ((canvas as any).__kept = true));
    const { id } = (await chartState(page, 'lab-kept'))!;
    await visit(page, 'Go to page two', 'Page two');
    expect(await page.locator('#lab-kept canvas').evaluate((canvas) => (canvas as any).__kept)).toBe(true);
    await toggleDark(page);
    const line = await roleColor(page, 'chart-1');
    await expect.poll(async () => (await chartState(page, 'lab-kept'))?.colors?.[0]).toBe(line.replace('rgb(', 'rgba(').replace(')', ', 0.15)'));
    expect(typeof id).toBe('number');
});

test('a server color is kept through theme switches, and its swatch shows it', async ({ page }) => {
    await page.goto('/lab/chart-turbo');
    await expect.poll(async () => (await chartState(page, 'lab-bar'))?.colors?.[1]).toBe('rgb(0, 128, 0)');
    await toggleDark(page);
    await expect.poll(async () => (await chartState(page, 'lab-bar'))?.colors?.[0]).toBe(await roleColor(page, 'chart-1'));
    expect((await chartState(page, 'lab-bar'))!.colors[1]).toBe('rgb(0, 128, 0)');
    await expect(page.locator('#lab-bar [data-chart-target="swatch"][data-index="1"]')).toHaveCSS('background-color', 'rgb(0, 128, 0)');
});

test('inside a Turbo Frame reloaded three times, one chart is left and it is drawn', async ({ page }) => {
    await page.goto('/lab/chart-turbo');
    for (let load = 1; load <= 3; load++) {
        await page.getByRole('link', { name: 'Reload the frame' }).click();
        await expect(page.getByTestId('frame-load')).toHaveText(String(load));
    }
    await expect.poll(() => chartCount(page)).toBe(4);
    await expect.poll(async () => (await chartState(page, 'lab-framed'))?.labels).toEqual(['A', 'B']);
});

test('replaced or updated by a Turbo Stream, the new chart is drawn and the old one destroyed', async ({ page }) => {
    await page.goto('/lab/chart-stream');
    await page.getByRole('button', { name: 'Replace the chart' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('replace');
    await expect.poll(() => chartCount(page)).toBe(1);
    await page.getByRole('button', { name: 'Update the chart' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('update');
    await expect.poll(() => chartCount(page)).toBe(1);
    expect((await chartState(page, 'streamed'))!.colors).toEqual([await roleColor(page, 'chart-1')]);
});

test('in a Live Component, new data updates the same chart, which keeps the theme', async ({ page }) => {
    await page.goto('/lab/live-chart');
    await expect.poll(async () => (await chartState(page, 'live-sales'))?.labels.length).toBe(7);
    const { id } = (await chartState(page, 'live-sales'))!;
    await page.getByLabel('Range').selectOption('30');
    await expect(page.getByTestId('points')).toHaveText('30');
    await expect.poll(async () => (await chartState(page, 'live-sales'))?.labels.length).toBe(30);
    expect((await chartState(page, 'live-sales'))!.id).toBe(id);
    await expect(page.locator('#live-sales-table tbody th')).toHaveCount(30);

    await toggleDark(page);
    await page.getByRole('button', { name: 'Add a sale' }).click();
    await expect(page.getByTestId('points')).toHaveText('31');
    await expect.poll(async () => (await chartState(page, 'live-sales'))?.labels.length).toBe(31);
    const dark = await roleColor(page, 'chart-1');
    expect((await chartState(page, 'live-sales'))!.colors[0]).toBe(dark.replace('rgb(', 'rgba(').replace(')', ', 0.15)'));
    expect((await chartState(page, 'live-sales'))!.id).toBe(id);
    expect(await chartCount(page)).toBe(1);
});

test('a value block given to the chart formats the cells of its table', async ({ page }) => {
    await page.goto('/lab/chart-turbo');
    await expect(page.locator('#lab-doughnut-table tbody td')).toHaveText(['5 visits from Search', '3 visits from Direct', '2 visits from Social']);
});

test('category data given as points, without labels, fills the table from the points', async ({ page }) => {
    await page.goto('/lab/chart-points');
    const rows = (id: string) =>
        page.locator(`#${id}-table tbody tr`).evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('th, td')].map((cell) => cell.textContent!.trim())));
    expect(await rows('points-columns')).toEqual([
        ['Jan', '12', ''],
        ['Feb', '19', '7'],
        ['Mar', '14', ''],
        ['Apr', '', '9'],
    ]);
    expect(await rows('points-rows')).toEqual([
        ['Billing', '7'],
        ['Platform', '12'],
    ]);
    await expect.poll(async () => (await chartState(page, 'points-columns'))?.colors.length).toBe(2);
    await expect.poll(async () => (await chartState(page, 'points-rows'))?.colors.length).toBe(1);
});
