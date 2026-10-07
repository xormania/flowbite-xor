import type { Locator, Page } from '@playwright/test';
import { test, expect, turboVisitDone } from './fixtures';

// Tom Select puts one .ts-wrapper after each <select> it enhances: a second one means it was set up twice
const wrappers = (page: Page) => page.locator('.ts-wrapper');
// Tom Select's input (the hidden <select> has the same name)
const control = (page: Page, name: string) => page.locator('.ts-wrapper').getByRole('combobox', { name });
// the options of Tom Select's listbox (the hidden <select>'s own options are in the accessibility tree too)
const listbox = async (page: Page, control: Locator) => page.locator(`#${await control.getAttribute('aria-controls')}`);
const pick = async (page: Page, control: Locator, typed: string, option: string) => {
    await control.click();
    await control.pressSequentially(typed);
    await (await listbox(page, control)).getByRole('option', { name: option, exact: true }).click();
    // leave the field, so its list does not cover the next one: a multiple field keeps it open, and search results
    // arriving late open it again while the field has the focus
    await control.press('Escape');
    await control.blur();
    await expect(control).toHaveAttribute('aria-expanded', 'false');
};

test('form fields: one choice, several choices and a remote search are submitted', async ({ page }) => {
    await page.goto('/lab/autocomplete');
    await expect(wrappers(page)).toHaveCount(4);

    await pick(page, control(page, 'Country'), 'hai', 'Haiti');
    await pick(page, control(page, 'Languages'), 'fre', 'French');
    await pick(page, control(page, 'Languages'), 'hai', 'Haitian Creole');
    await expect(page.locator('#autocomplete_demo_languages')).toHaveValues(['fr', 'ht']);
    // the remote field asks the server for its options
    await pick(page, control(page, 'Customer'), 'bon', 'Bonnie Green');

    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByTestId('submitted')).toHaveText('Submitted: HT; fr,ht; Bonnie Green');
    await expect(wrappers(page)).toHaveCount(4);
});

test('an invalid submit shows the error on the field, still enhanced once', async ({ page, allowHttpError }) => {
    allowHttpError(/\/lab\/autocomplete$/, 422);
    await page.goto('/lab/autocomplete');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('This value should not be blank.')).toBeVisible();
    await expect(wrappers(page)).toHaveCount(4);
    await expect(page.locator('#autocomplete_demo_country')).toHaveAttribute('aria-invalid', 'true');
    await pick(page, control(page, 'Country'), 'ja', 'Japan');
    await expect(page.locator('#autocomplete_demo_country')).toHaveValue('JP');
});

test('the component outside a form creates a value from what is typed', async ({ page }) => {
    await page.goto('/lab/autocomplete');
    const fruit = control(page, 'Fruit (outside a form)');
    await fruit.click();
    await fruit.pressSequentially('kiwi');
    // Tom Select's "Add …" entry has no option role
    const create = (await listbox(page, fruit)).locator('.create');
    await expect(create).toHaveText('Add kiwi...');
    await create.click();
    await expect(page.locator('#fruit')).toHaveValue('kiwi');
});

test('Turbo visits away and Back leave one working Tom Select per field', async ({ page }) => {
    await page.goto('/lab/autocomplete');
    for (let visit = 0; visit < 3; visit++) {
        await page.getByRole('link', { name: 'Leave the page' }).click();
        await expect(page).toHaveURL(/\/lab\/turbo-nav\/two$/);
        await turboVisitDone(page);
        await page.goBack();
        await expect(page).toHaveURL(/\/lab\/autocomplete/);
        await turboVisitDone(page);
        await expect(wrappers(page)).toHaveCount(4);
    }
    await pick(page, control(page, 'Country'), 'spa', 'Spain');
    await expect(page.locator('#autocomplete_demo_country')).toHaveValue('ES');
});

test('inside a Turbo Frame that reloads, the field is enhanced once and works', async ({ page }) => {
    await page.goto('/lab/autocomplete-frame');
    await page.getByRole('link', { name: 'Reload the frame' }).click();
    await expect(page.getByTestId('frame-load')).toHaveText('1');
    await expect(wrappers(page)).toHaveCount(1);
    await pick(page, control(page, 'Fruit'), 'ban', 'Banana');
    await expect(page.locator('#framed-fruit')).toHaveValue('banana');
});

test('replaced by a Turbo Stream, the field is enhanced once and works', async ({ page }) => {
    await page.goto('/lab/autocomplete-stream');
    await page.getByRole('button', { name: 'Replace the field' }).click();
    await expect(page.getByTestId('stream-count')).toHaveText('1');
    await expect(wrappers(page)).toHaveCount(1);
    await pick(page, control(page, 'Fruit'), 'app', 'Apple');
    await expect(page.locator('#streamed-fruit')).toHaveValue('apple');
});

test('in a Live form, a re-render keeps the chosen values and one Tom Select per field', async ({ page }) => {
    await page.goto('/lab/live-autocomplete');
    await pick(page, control(page, 'Country'), 'ita', 'Italy');
    await pick(page, control(page, 'Languages'), 'spa', 'Spanish');
    await page.getByRole('button', { name: 'Re-render' }).click();
    await expect(page.getByTestId('renders')).toHaveText('1');
    await expect(wrappers(page)).toHaveCount(2);
    await expect(page.locator('#autocomplete_demo_country')).toHaveValue('IT');
    await expect(page.locator('#autocomplete_demo_languages')).toHaveValues(['es']);
    await pick(page, control(page, 'Country'), 'ger', 'Germany');
    await expect(page.locator('#autocomplete_demo_country')).toHaveValue('DE');
});
