/*
 * The layouts and blocks as pages of the /demo application, at desktop and phone width, compared with
 * layouts/tests/screenshots/<page>-<viewport>.png.
 */
import { expect, test } from './fixtures';

const pages = {
    dashboard: '/demo',
    login: '/demo/login',
    signup: '/demo/signup',
    'forgot-password': '/demo/forgot-password',
    'settings-profile': '/demo/settings/profile',
    'not-found': '/demo/not-found',
    blank: '/demo/blank',
};
const viewports = { desktop: { width: 1280, height: 800 }, mobile: { width: 390, height: 844 } };

for (const [viewportName, viewport] of Object.entries(viewports)) {
    test.describe(viewportName, () => {
        test.use({ viewport });
        for (const [name, path] of Object.entries(pages)) {
            test.describe(name, () => {
                // the error page answers 404 on purpose
                test.use({ documentStatus: 'not-found' === name ? 404 : 200 });
                test(`${name} ${viewportName}`, async ({ page }) => {
                    await page.goto(path);
                    await expect(page).toHaveScreenshot(['layouts', 'tests', 'screenshots', `${name}-${viewportName}.png`]);
                });
            });
        }
    });
}
