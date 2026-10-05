/*
 * Port of symfony/ux src/Toolkit/assets/test/browser/examples.spec.ts (f152d0b): screenshots every
 * README example of every recipe, in light and dark, and compares it with
 * <recipe>/tests/screenshots/<example>-<theme>.png.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, screenshotAnnotation, test, themes } from './fixtures';

type Example = { recipe: string; id: string };

const demoDir = fileURLToPath(new URL('../../../demo', import.meta.url));
// PHP_BINARY lets a machine without PHP 8.4 on its PATH point at another binary or wrapper.
const output = execFileSync(process.env.PHP_BINARY ?? 'php', ['bin/console', 'app:examples'], { cwd: demoDir, encoding: 'utf8' });
const examples: Example[] = JSON.parse(output);

for (const { recipe, id } of examples) {
    for (const theme of themes) {
        const name = [recipe, 'tests', 'screenshots', `${id}-${theme}.png`];

        test(`${recipe}/${id} ${theme}`, screenshotAnnotation(name), async ({ page, gotoExample }) => {
            await gotoExample(`${recipe}/${id}`, { theme, timers: 'fake' });

            await expect(page).toHaveScreenshot(name, { fullPage: true });
        });
    }
}
