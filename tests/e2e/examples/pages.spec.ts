/*
 * The layouts and blocks as pages of the /demo application, at desktop and phone width, compared with
 * layouts/tests/screenshots/<page>-<viewport>.png.
 */
import { demoPages, viewports } from '../inventory';
import { expect, screenshotAnnotation, test } from './fixtures';

for (const [viewportName, viewport] of Object.entries(viewports)) {
    test.describe(viewportName, () => {
        test.use({ viewport });
        for (const [name, path] of Object.entries(demoPages)) {
            test.describe(name, () => {
                // the error page answers 404 on purpose
                test.use({ documentStatus: 'not-found' === name ? 404 : 200 });
                const screenshot = ['layouts', 'tests', 'screenshots', `${name}-${viewportName}.png`];
                test(`${name} ${viewportName}`, screenshotAnnotation(screenshot), async ({ page }) => {
                    await page.goto(path);
                    await expect(page).toHaveScreenshot(screenshot);
                });
            });
        }
    });
}
