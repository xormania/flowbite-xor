import type { Page } from '@playwright/test';
import { test, expect, turboVisitDone } from './fixtures';

const status = (page: Page) => page.getByRole('status').filter({ hasText: /Showing|No rows/ });
const firstOrder = (page: Page) => page.getByTestId('order-number').first();
// the table's URL parameters, in any order
const params = (page: Page) => Object.fromEntries(new URL(page.url()).searchParams);
const expectParams = async (page: Page, expected: Record<string, string>) => expect.poll(() => params(page)).toEqual(expected);

test('search, filter, sort, page and page size each add a history entry that Back and Forward walk through', async ({ page }) => {
    await page.goto('/lab/data-table-frame');
    await page.evaluate(() => ((window as any).__sameDocument = true));
    await expect(status(page)).toHaveText('Showing 1–10 of 57');
    await expect(firstOrder(page)).toHaveText('#1057');

    // sort: ascending first
    await page.getByRole('link', { name: 'Customer' }).click();
    await expectParams(page, { sort: 'customer', dir: 'asc' });
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toHaveAttribute('aria-sort', 'ascending');

    // page
    await page.getByRole('link', { name: 'Page 2' }).click();
    await expectParams(page, { sort: 'customer', dir: 'asc', page: '2' });
    await expect(status(page)).toHaveText('Showing 11–20 of 57');

    // search (Enter submits the form, with its filters and page size) goes back to the first page and keeps the sort
    await page.getByLabel('Search', { exact: true }).fill('bonnie');
    await page.getByLabel('Search', { exact: true }).press('Enter');
    await expectParams(page, { q: 'bonnie', sort: 'customer', dir: 'asc', 'f[status]': '', size: '10' });
    await expect(status(page)).toHaveText('Showing 1–7 of 7');

    // filter
    await page.getByLabel('Status').selectOption('paid');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expectParams(page, { q: 'bonnie', sort: 'customer', dir: 'asc', 'f[status]': 'paid', size: '10' });
    await expect(status(page)).toHaveText('Showing 1–2 of 2');

    // page size
    await page.getByLabel('Rows per page').selectOption('25');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expectParams(page, { q: 'bonnie', sort: 'customer', dir: 'asc', 'f[status]': 'paid', size: '25' });

    // Back walks every state, in the same document
    // each step waits for something only that state shows: going Back again before the frame has loaded would cancel
    // its request
    await page.goBack();
    await expectParams(page, { q: 'bonnie', sort: 'customer', dir: 'asc', 'f[status]': 'paid', size: '10' });
    await expect(page.getByLabel('Rows per page')).toHaveValue('10');
    await expect(status(page)).toHaveText('Showing 1–2 of 2');
    await page.goBack();
    await expectParams(page, { q: 'bonnie', sort: 'customer', dir: 'asc', 'f[status]': '', size: '10' });
    await expect(status(page)).toHaveText('Showing 1–7 of 7');
    await expect(page.getByLabel('Search', { exact: true })).toHaveValue('bonnie');
    await page.goBack();
    await expectParams(page, { sort: 'customer', dir: 'asc', page: '2' });
    await expect(status(page)).toHaveText('Showing 11–20 of 57');
    await page.goBack();
    await expectParams(page, { sort: 'customer', dir: 'asc' });
    await expect(status(page)).toHaveText('Showing 1–10 of 57');
    await page.goBack();
    await expect(page).toHaveURL(/\/lab\/data-table-frame$/);
    await expect(firstOrder(page)).toHaveText('#1057');

    // and Forward again
    await page.goForward();
    await expectParams(page, { sort: 'customer', dir: 'asc' });
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toHaveAttribute('aria-sort', 'ascending');
    await page.goForward();
    await expect(status(page)).toHaveText('Showing 11–20 of 57');

    expect(await page.evaluate(() => (window as any).__sameDocument)).toBe(true);
});

test('a URL with values the table does not accept renders a valid table', async ({ page }) => {
    await page.goto('/lab/data-table-frame?sort=bogus&dir=up&page=999&size=7&f%5Bstatus%5D=nope&q%5B%5D=1');
    // unknown sort and filter value ignored, page size back to 10, page 999 shows the last page
    await expect(status(page)).toHaveText('Showing 51–57 of 57');
    await expect(page.getByRole('columnheader', { name: 'Order' })).toHaveAttribute('aria-sort', 'descending');
    await expect(page.getByLabel('Rows per page')).toHaveValue('10');
    await expect(page.getByLabel('Status')).toHaveValue('');
    await expect(page.getByRole('link', { name: 'Page 6' })).toHaveAttribute('aria-current', 'page');
});

test('a page number too large for an offset shows the last page', async ({ page }) => {
    await page.goto('/lab/data-table-frame?page=9223372036854775807');
    await expect(status(page)).toHaveText('Showing 51–57 of 57');
});

test('a search matching nothing shows the empty state', async ({ page }) => {
    await page.goto('/lab/data-table-frame?q=nobody');
    await expect(page.getByRole('heading', { name: 'No matching rows' })).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
});

test('rows have stable ids and render the page cell blocks', async ({ page }) => {
    await page.goto('/lab/data-table-frame?sort=total&dir=asc');
    const row = page.locator('#orders-row-13');
    await expect(row.getByTestId('order-number')).toHaveText('#1013');
    await page.getByRole('link', { name: 'Total' }).click();
    await expect(page).toHaveURL(/sort=total&dir=desc/);
    await expect(page.locator('tbody tr').first()).not.toHaveId('orders-row-13');
});

test('Turbo visits away and back keep a single working table', async ({ page }) => {
    await page.goto('/lab/data-table-frame');
    for (let visit = 0; visit < 3; visit++) {
        await page.getByRole('link', { name: 'Leave the table' }).click();
        await expect(page).toHaveURL(/\/lab\/turbo-nav\/two$/);
        await turboVisitDone(page);
        await page.goBack();
        await expect(page).toHaveURL(/\/lab\/data-table-frame/);
        await turboVisitDone(page);
    }
    await expect(page.locator('turbo-frame#orders')).toHaveCount(1);
    await expect(page.getByRole('table')).toHaveCount(1);
    await page.getByRole('link', { name: 'Page 3' }).click();
    await expect(status(page)).toHaveText('Showing 21–30 of 57');
});
