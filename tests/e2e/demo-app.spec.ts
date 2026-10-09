import { test, expect, expectA11y, turboVisitDone } from './fixtures';

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
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('treeitem', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('treeitem', { name: 'Settings' })).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('region', { name: 'Notifications' }).getByText('Profile saved.')).toBeVisible();
});

test('on a phone the app layout shows its navigation in a drawer, opened by the navbar menu button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/demo/settings/profile');
    await expect(page.locator('#sidebar')).toBeHidden();
    const menu = page.getByRole('button', { name: 'Open menu' });
    await menu.click();
    const drawer = page.getByRole('dialog', { name: 'Main' });
    await expect(drawer).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    // the sidebar's navigation, the same tree and brand, focused on the current page
    await expect(drawer.getByRole('link', { name: 'Acme' })).toBeVisible();
    const nav = drawer.getByRole('navigation', { name: 'Main' }).getByRole('tree', { name: 'Acme' });
    await expect(nav.getByRole('treeitem', { name: 'Profile' })).toBeFocused();
    await expect(nav.getByRole('treeitem', { name: 'Settings' })).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(menu).toBeFocused();

    await menu.click();
    await nav.getByRole('treeitem', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await turboVisitDone(page);
    await expect(drawer).toBeHidden();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
});

test('on a desktop the app layout hides the menu button, and its pages use no id twice', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const path of ['/demo', '/demo/settings/profile']) {
        await page.goto(path);
        await expect(page.locator('#sidebar')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
        const duplicates = await page.evaluate(() => {
            const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
            return ids.filter((id, index) => ids.indexOf(id) !== index);
        });
        expect(duplicates, path).toEqual([]);
    }
});

test('on a desktop the navbar menu marks the current page, opens its submenus and visits their links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/demo/settings/profile');
    const menu = page.getByRole('navigation', { name: 'Site' });
    const account = menu.getByRole('button', { name: 'Account' });
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    await expect(account).toHaveCSS('font-weight', '600'); // it holds the current page
    await account.click();
    await expect(account).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    await menu.getByRole('button', { name: 'Sign-in pages' }).click();
    await menu.getByRole('link', { name: 'Sign up' }).click();
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

    await page.goto('/demo');
    await menu.getByRole('button', { name: 'Showcase' }).click();
    await menu.getByRole('button', { name: 'Lab' }).click();
    await menu.getByRole('link', { name: 'Navbar menus' }).click();
    await expect(page).toHaveURL(/\/lab\/nav-menu$/);
});

test('on a phone the drawer holds the navbar menu after the sidebar navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/demo/settings/profile');
    await expect(page.getByRole('navigation', { name: 'Site' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Main' });
    const account = drawer.getByRole('button', { name: 'Account' });
    await account.click();
    await expect(account).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    await drawer.getByRole('button', { name: 'Showcase' }).click();
    await expect(account).toHaveAttribute('aria-expanded', 'false');
    await drawer.getByRole('link', { name: 'Recipes' }).click();
    await expect(page).toHaveURL(/\/$/);
});

test('the not-found block answers 404 and passes axe', async ({ page, allowHttpError }) => {
    allowHttpError(/\/demo\/not-found$/, 404);
    const response = await page.goto('/demo/not-found');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expectA11y(page, { impact: 'serious' });
});

test('the app layout scrolls the document, so the keyboard scrolls it and Turbo restores it on Back', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto('/demo');
    await page.keyboard.press('PageDown');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    await expect(page.locator('#sidebar')).toBeInViewport();

    // Chromium animates the keyboard scroll: let it stop, so it does not move the position set next
    await page.evaluate(() => new Promise<void>((resolve) => {
        let last = -1;
        const check = () => (window.scrollY === last ? resolve() : ((last = window.scrollY), setTimeout(check, 100)));
        check();
    }));
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
    const main = page.getByRole('navigation', { name: 'Main' });
    await main.getByRole('treeitem', { name: 'Settings' }).locator(':scope > [data-side-nav-toggle]').click();
    await main.getByRole('treeitem', { name: 'Profile' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await page.goBack();
    await turboVisitDone(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
});

test('the dashboard passes axe at phone width, its channel bars are meters', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/demo');
    await expect(page.getByRole('meter', { name: 'Online store' })).toHaveAttribute('aria-valuenow', '64');
    await expect(page.getByRole('region', { name: 'Recent orders' })).toHaveAttribute('tabindex', '0');
    await expectA11y(page, { impact: 'serious' });
});

test('flash messages show on every layout: the logout notice on the auth layout, not later on the dashboard', async ({ page }) => {
    await page.goto('/demo/login');
    await page.getByRole('textbox', { name: 'Email' }).fill('demo@example.com');
    await page.getByLabel('Password').fill('demo');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/demo\/login$/);
    await expect(page.getByRole('region', { name: 'Notifications' }).getByText('You are signed out.')).toBeVisible();

    await page.goto('/demo');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('You are signed out.')).toHaveCount(0);
});

test('every layout keeps the same toast region: a toast closed on another layout does not come back on Back', async ({ page }) => {
    await page.goto('/demo/settings/profile');
    await page.getByRole('button', { name: 'Save changes' }).click();
    const region = page.getByRole('region', { name: 'Notifications' });
    await expect(region.getByText('Profile saved.')).toBeVisible();

    const main = page.getByRole('navigation', { name: 'Main' });
    await main.getByRole('treeitem', { name: 'Pages' }).locator(':scope > [data-side-nav-toggle]').click();
    await main.getByRole('treeitem', { name: 'Blank page' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'A blank page' })).toBeVisible();
    await expect(region.getByText('Profile saved.')).toBeVisible();
    await region.getByRole('button', { name: 'Close' }).click();
    await expect(region.getByText('Profile saved.')).toHaveCount(0);

    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Profile saved.')).toHaveCount(0);
});

test('signing out needs a same-origin request: a direct GET to the logout URL does not sign the user out', async ({ page, allowHttpError }) => {
    allowHttpError(/\/demo\/logout$/, 403);
    await page.goto('/demo/login');
    await page.getByRole('textbox', { name: 'Email' }).fill('demo@example.com');
    await page.getByLabel('Password').fill('demo');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    // a typed URL or a link from another site: Sec-Fetch-Site is not same-origin, the stateless logout token fails
    const response = await page.goto('/demo/logout');
    expect(response?.status()).toBe(403);
    await page.goto('/demo');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});
