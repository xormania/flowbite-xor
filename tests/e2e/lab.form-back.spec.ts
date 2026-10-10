import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { back, turboOperation, visit } from './transitions';

/*
 * What Back shows in a form (the `form-reset` controller of the layouts, on the demo's <body>): a GET form reflects
 * the URL, so it shows the values the server rendered; a POST form holds the user's work, so it keeps them. Each widget
 * kind is changed alone, the others must stay as rendered either way.
 */

const rendered = '/lab/form-back/%s?name=Ada&fruit=apple&due=2026-03-10';

const day = (page: Page, date: string) => page.locator(`form [data-slot="calendar-day"][data-day="${date}"] button`);

type Widget = {
    kind: string;
    change: (page: Page) => Promise<void>;
    /** Expects every part of the widget the user sees, and what the form sends, to show the rendered or the changed value. */
    shows: (page: Page, which: 'rendered' | 'changed') => Promise<void>;
};

const widgets: Widget[] = [
    {
        kind: 'a native input',
        change: async (page) => {
            await page.getByRole('textbox', { name: 'Name' }).fill('Grace');
        },
        shows: async (page, which) => {
            await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('rendered' === which ? 'Ada' : 'Grace');
        },
    },
    {
        kind: 'an autocomplete',
        change: async (page) => {
            const control = page.locator('.ts-wrapper').getByRole('combobox', { name: 'Fruit' });
            await control.locator('xpath=ancestor::div[contains(@class, "ts-control")]').click();
            await page.locator(`#${await control.getAttribute('aria-controls')}`).getByRole('option', { name: 'Banana', exact: true }).click();
            await control.press('Escape');
            await control.blur();
        },
        shows: async (page, which) => {
            const [value, label] = 'rendered' === which ? ['apple', 'Apple'] : ['banana', 'Banana'];
            await expect(page.locator('select#fruit')).toHaveValue(value);
            // Tom Select's own display of the choice
            await expect(page.locator('.ts-wrapper .ts-control .item')).toHaveText([label]);
            await expect(page.locator('.ts-wrapper')).toHaveCount(1);
        },
    },
    {
        kind: 'a date picker',
        change: async (page) => {
            await page.getByRole('button', { name: 'Due date: choose date' }).click();
            await day(page, '2026-03-12').click();
            await expect(page.getByRole('dialog')).toHaveCount(0);
        },
        shows: async (page, which) => {
            const [date, other, text] = 'rendered' === which ? ['2026-03-10', '2026-03-12', 'Mar 10, 2026'] : ['2026-03-12', '2026-03-10', 'Mar 12, 2026'];
            await expect(page.getByRole('textbox', { name: 'Due date' })).toHaveValue(text);
            await expect(page.locator('input[name="due"]')).toHaveValue(date);
            await expect(day(page, date)).toHaveAttribute('data-selected-single', 'true');
            await expect(day(page, other)).toHaveAttribute('data-selected-single', 'false');
        },
    },
];

for (const method of ['get', 'post'] as const) {
    for (const widget of widgets) {
        const expected = 'get' === method ? 'rendered' : 'changed';
        test(`a ${method.toUpperCase()} form, ${widget.kind} changed: Back shows the ${'get' === method ? "URL's value" : 'value left'}, the others as rendered`, async ({ page }) => {
            await page.goto(rendered.replace('%s', method));
            for (const each of widgets) {
                await each.shows(page, 'rendered');
            }
            await widget.change(page);
            await widget.shows(page, 'changed');

            await visit(page, 'Go to page two', 'Page two');
            await back(page, 'Page one');

            await widget.shows(page, expected);
            for (const each of widgets.filter((each) => each !== widget)) {
                await each.shows(page, 'rendered');
            }
        });
    }
}

test('a date picker in a GET form also goes back to the month rendered', async ({ page }) => {
    await page.goto(rendered.replace('%s', 'get'));
    await page.getByRole('button', { name: 'Due date: choose date' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Next month' }).click();
    await day(page, '2026-04-08').click();
    await expect(page.locator('input[name="due"]')).toHaveValue('2026-04-08');

    await visit(page, 'Go to page two', 'Page two');
    await back(page, 'Page one');

    await expect(page.locator('input[name="due"]')).toHaveValue('2026-03-10');
    await page.getByRole('button', { name: 'Due date: choose date' }).click();
    await expect(page.getByRole('dialog').getByRole('grid')).toHaveAccessibleName('March 2026');
    await expect(day(page, '2026-03-10')).toBeFocused();
});

// The page's scripts held back, so the user types before the controllers connect, as on a slow first load
for (const focused of [true, false]) {
    test(`a GET form ${focused ? 'holding' : 'not holding'} the focus when the page's scripts start ${focused ? 'keeps' : 'loses'} what was typed`, async ({ page }) => {
        let release: () => void = () => {};
        const held = new Promise<void>((resolve) => (release = resolve));
        await page.route('**/assets/controllers/form_reset_controller*.js', async (route) => {
            await held;
            await route.fallback();
        });
        // module scripts hold DOMContentLoaded back too: the page is parsed and shown before it
        await page.goto(rendered.replace('%s', 'get'), { waitUntil: 'commit' });
        const name = page.getByRole('textbox', { name: 'Name' });
        await name.fill('Grace');
        if (!focused) {
            await name.blur();
        }
        // the first turbo:load comes once the scripts have run
        await turboOperation(page, {}, async () => release());
        await expect(page.locator('.ts-wrapper')).toHaveCount(1);
        await expect(name).toHaveValue(focused ? 'Grace' : 'Ada');
    });
}
