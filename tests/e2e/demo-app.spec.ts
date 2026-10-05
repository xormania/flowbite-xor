import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

test('the login block signs in through form_login and shows the authentication error', async ({ page }) => {
    await page.goto('/demo/login');
    await page.getByRole('textbox', { name: 'Email' }).fill('demo@example.com');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid credentials.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue('demo@example.com');

    await page.getByLabel('Password').fill('demo');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
});

test('the signup block shows server-side errors, then a flash toast after the redirect', async ({ page, allowHttpError }) => {
    allowHttpError(/\/demo\/signup$/, 422);
    await page.goto('/demo/signup');
    // skip the browser's own validation to reach the server's
    await page.locator('form[name="registration"]').evaluate((form: HTMLFormElement) => (form.noValidate = true));
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true');

    await page.getByRole('textbox', { name: 'Name' }).fill('Ada Lovelace');
    await page.getByRole('textbox', { name: 'Email' }).fill('ada@example.com');
    await page.getByLabel('Password').fill('correct horse battery');
    await page.getByRole('checkbox', { name: 'I accept the terms' }).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Notifications' }).getByText('Welcome aboard!')).toBeVisible();
});

test('the forgot-password block confirms without telling whether the account exists', async ({ page }) => {
    await page.goto('/demo/forgot-password');
    await page.getByRole('textbox', { name: 'Email' }).fill('nobody@example.com');
    await page.getByRole('button', { name: 'Send the reset link' }).click();
    await expect(page.getByText('If an account exists for that email address')).toBeVisible();
});

test('the settings layout marks the current section and the profile block saves', async ({ page }) => {
    await page.goto('/demo/settings/profile');
    await expect(page.getByRole('navigation', { name: 'Settings' }).getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('region', { name: 'Notifications' }).getByText('Profile saved.')).toBeVisible();
});

test('on a phone the app layout hides the sidebar behind the navbar menu button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/demo');
    const sidebar = page.locator('#sidebar');
    await expect(sidebar).toBeHidden();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(sidebar).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sidebar).toBeHidden();
});

test('the not-found block answers 404 and passes axe', async ({ page, allowHttpError }) => {
    allowHttpError(/\/demo\/not-found$/, 404);
    const response = await page.goto('/demo/not-found');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => 'serious' === v.impact || 'critical' === v.impact).map((v) => v.id)).toEqual([]);
});

test('the app layout scrolls the document, so the keyboard scrolls it and Turbo restores it on Back', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto('/demo');
    await page.keyboard.press('PageDown');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    await expect(page.locator('#sidebar')).toBeInViewport();

    await page.evaluate(() => window.scrollTo(0, 300));
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
});

test('the dashboard passes axe at phone width, its channel bars are meters', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/demo');
    await expect(page.getByRole('meter', { name: 'Online store' })).toHaveAttribute('aria-valuenow', '64');
    await expect(page.getByRole('region', { name: 'Recent orders' })).toHaveAttribute('tabindex', '0');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => 'serious' === v.impact || 'critical' === v.impact).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
