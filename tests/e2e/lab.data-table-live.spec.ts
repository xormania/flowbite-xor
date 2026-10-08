import type { Page } from '@playwright/test';
import { test, expect, turboVisitDone } from './fixtures';

const status = (page: Page) => page.getByRole('status').filter({ hasText: /Showing|No rows/ });
const selected = (page: Page) => page.getByRole('status').filter({ hasText: 'selected' });
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);

test('its state is in the URL: a Turbo visit away and Back show the same rows, and the table is still live', async ({ page }) => {
    await page.goto('/lab/data-table-live');
    await expect(status(page)).toHaveText('Showing 1–10 of 57');

    await page.getByRole('button', { name: 'Customer' }).click();
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toHaveAttribute('aria-sort', 'ascending');
    await page.getByRole('link', { name: 'Page 3' }).click();
    await expect(status(page)).toHaveText('Showing 21–30 of 57');
    await expect.poll(() => params(page)).toMatchObject({ sort: 'customer', dir: 'asc', page: '3' });
    const firstRow = await page.locator('tbody tr').first().getAttribute('id');

    await page.getByRole('link', { name: 'Leave the table' }).click();
    await expect(page).toHaveURL(/\/lab\/turbo-nav\/two$/);
    await turboVisitDone(page);
    await page.goBack();
    await turboVisitDone(page);

    await expect.poll(() => params(page)).toMatchObject({ sort: 'customer', dir: 'asc', page: '3' });
    await expect(status(page)).toHaveText('Showing 21–30 of 57');
    await expect(page.locator('tbody tr').first()).toHaveAttribute('id', firstRow!);
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toHaveAttribute('aria-sort', 'ascending');

    await page.getByRole('link', { name: 'Page 4' }).click();
    await expect(status(page)).toHaveText('Showing 31–40 of 57');
});

test('repeated Turbo visits away and back keep one working table', async ({ page }) => {
    await page.goto('/lab/data-table-live');
    for (let visit = 0; visit < 3; visit++) {
        await page.getByRole('link', { name: 'Leave the table' }).click();
        await expect(page).toHaveURL(/\/lab\/turbo-nav\/two$/);
        await turboVisitDone(page);
        await page.goBack();
        await expect(page).toHaveURL(/\/lab\/data-table-live/);
        await turboVisitDone(page);
    }
    await expect(page.locator('[data-controller~="live"]')).toHaveCount(1);
    await expect(page.getByRole('table')).toHaveCount(1);
    await page.getByRole('link', { name: 'Page 2' }).click();
    await expect(status(page)).toHaveText('Showing 11–20 of 57');
});

test('search, filter and page size update the rows and go back to the first page', async ({ page }) => {
    await page.goto('/lab/data-table-live?page=2');
    await expect(status(page)).toHaveText('Showing 11–20 of 57');

    await page.getByLabel('Search', { exact: true }).fill('bonnie');
    await expect(status(page)).toHaveText('Showing 1–7 of 7');
    await expect.poll(() => params(page)).toMatchObject({ q: 'bonnie', page: '1' });

    await page.getByLabel('Status').selectOption('paid');
    await expect(status(page)).toHaveText('Showing 1–2 of 2');

    await page.getByLabel('Status').selectOption('');
    await page.getByLabel('Search', { exact: true }).fill('');
    await expect(status(page)).toHaveText('Showing 1–10 of 57');
    await page.getByLabel('Rows per page').selectOption('25');
    await expect(status(page)).toHaveText('Showing 1–25 of 57');
    await expect.poll(() => params(page)).toMatchObject({ size: '25' });
});

test('rows stay selected across pages; "Select this page" adds the page’s rows only', async ({ page }) => {
    await page.goto('/lab/data-table-live');
    await expect(selected(page)).toHaveText('0 selected');

    await page.getByRole('checkbox', { name: 'Select row 57' }).check();
    await expect(selected(page)).toHaveText('1 selected');
    await page.getByRole('link', { name: 'Page 2' }).click();
    await expect(status(page)).toHaveText('Showing 11–20 of 57');
    await page.getByRole('checkbox', { name: 'Select row 45' }).check();
    await expect(selected(page)).toHaveText('2 selected');

    await page.getByRole('link', { name: 'Page 1' }).click();
    await expect(status(page)).toHaveText('Showing 1–10 of 57');
    await expect(page.getByRole('checkbox', { name: 'Select row 57' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Select row 56' })).not.toBeChecked();

    await page.getByRole('button', { name: 'Select this page' }).click();
    await expect(selected(page)).toHaveText('11 selected');
    await expect(page.getByTestId('selected-ids')).toContainText('45');
    await expect(page.getByRole('checkbox', { name: 'Select row 48' })).toBeChecked();
    expect(params(page)).not.toHaveProperty('selectedIds');

    await page.getByRole('button', { name: 'Clear selection' }).click();
    await expect(selected(page)).toHaveText('0 selected');
    await expect(page.getByRole('checkbox', { name: 'Select row 57' })).not.toBeChecked();
});

test('a selection the browser sends is cut to the table\'s limit before the server uses it', async ({ page }) => {
    await page.goto('/lab/data-table-live');
    await expect(selected(page)).toHaveText('0 selected');

    // what a crafted request can send: 5,000 ids of rows not on this page, and one id longer than 128 characters
    await page.evaluate(async () => {
        const { getComponent } = await import('@symfony/ux-live-component');
        const table = await getComponent(document.querySelector<HTMLElement>('[data-controller~="live"]')!);
        const ids = Array.from({ length: 5_000 }, (_, index) => String(1_001 + index));
        table.set('selectedIds', ['x'.repeat(129), ...ids], true);
    });
    // the first 1,000 entries are kept, and of those the too long id is dropped
    await expect(selected(page)).toHaveText('999 selected');
    await expect(page.getByTestId('selected-ids')).not.toContainText('xxx');
    await expect(page.getByTestId('selected-ids')).toContainText('1999');
    await expect(page.getByTestId('selected-ids')).not.toContainText('2000');

    // "Select this page" adds the first row of the page, then the selection is full
    await page.getByRole('button', { name: 'Select this page' }).click();
    await expect(selected(page)).toHaveText('1000 selected, the most this table selects');
    await expect(page.getByRole('checkbox', { name: 'Select row 57' })).toBeChecked();

    // full: no row can be added, and the selection can still be cleared
    await expect(page.getByRole('button', { name: 'Select this page' })).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: 'Select row 56' })).toBeDisabled();
    await page.getByRole('button', { name: 'Clear selection' }).click();
    await expect(selected(page)).toHaveText('0 selected');
    await expect(page.getByRole('checkbox', { name: 'Select row 56' })).toBeEnabled();
});

test('a URL with values the table does not accept renders a valid table', async ({ page }) => {
    await page.goto('/lab/data-table-live?sort=bogus&dir=up&page=999&size=7&f%5Bstatus%5D=nope');
    await expect(status(page)).toHaveText('Showing 51–57 of 57');
    await expect(page.getByRole('columnheader', { name: 'Order' })).toHaveAttribute('aria-sort', 'descending');
    await expect(page.getByLabel('Rows per page')).toHaveValue('10');
    await expect(page.getByLabel('Status')).toHaveValue('');
    await page.getByRole('link', { name: 'Page 5' }).click();
    await expect(status(page)).toHaveText('Showing 41–50 of 57');
});

test('inside a Turbo Frame that reloads, the reloaded table is live again', async ({ page }) => {
    await page.goto('/lab/data-table-live-frame');
    await page.evaluate(() => ((window as any).__sameDocument = true));
    await page.getByRole('link', { name: 'Page 2' }).click();
    await expect(status(page)).toHaveText('Showing 11–20 of 57');

    await page.getByRole('link', { name: 'Reload the frame' }).click();
    await expect(page.getByTestId('frame-load')).toHaveText('1');
    await expect(status(page)).toHaveText('Showing 1–10 of 57');
    await page.getByRole('link', { name: 'Page 3' }).click();
    await expect(status(page)).toHaveText('Showing 21–30 of 57');
    await expect(page.locator('[data-controller~="live"]')).toHaveCount(1);
    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});

test('inside a data-turbo-permanent element, it keeps its state across Turbo visits', async ({ page }) => {
    await page.goto('/lab/data-table-live-permanent');
    await page.getByRole('link', { name: 'Page 2' }).click();
    await expect(status(page)).toHaveText('Showing 11–20 of 57');

    await page.getByRole('link', { name: 'Go to page two' }).click();
    await expect(page.getByTestId('page')).toHaveText('Page two');
    await turboVisitDone(page);
    await expect(status(page)).toHaveText('Showing 11–20 of 57');

    await page.getByRole('link', { name: 'Page 3' }).click();
    await expect(status(page)).toHaveText('Showing 21–30 of 57');
});

test('replaced or updated by a Turbo Stream, it reconnects from the server state', async ({ page }) => {
    await page.goto('/lab/data-table-live-stream');
    await page.getByRole('link', { name: 'Page 2' }).click();
    await expect(status(page)).toHaveText('Showing 11–20 of 57');

    await page.getByRole('button', { name: 'Replace the table' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('replace');
    await expect(page.locator('#live-table-region')).toHaveCount(1);
    await page.getByRole('link', { name: 'Page 3' }).click();
    await expect(status(page)).toHaveText('Showing 21–30 of 57');

    await page.getByRole('button', { name: 'Update the table' }).click();
    await expect(page.getByTestId('stream-action')).toHaveText('update');
    await page.getByRole('link', { name: 'Page 2' }).click();
    await expect(status(page)).toHaveText('Showing 11–20 of 57');
    await expect(page.locator('[data-controller~="live"]')).toHaveCount(1);
});
