/*
 * Port of symfony/ux src/Toolkit/assets/test/browser/examples.spec.ts (f152d0b): screenshots every
 * README example of every recipe, in light and dark, and compares it with
 * <recipe>/tests/screenshots/<example>-<theme>.png.
 */
import { examples } from '../inventory';
import { expect, screenshotAnnotation, test, themes } from './fixtures';

for (const { recipe, id } of examples) {
    for (const theme of themes) {
        const name = [recipe, 'tests', 'screenshots', `${id}-${theme}.png`];

        test(`${recipe}/${id} ${theme}`, screenshotAnnotation(name), async ({ page, gotoExample }) => {
            await gotoExample(`${recipe}/${id}`, { theme, timers: 'fake' });

            await expect(page).toHaveScreenshot(name, { fullPage: true });
        });
    }
}
