import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const require = createRequire(import.meta.url);
const { version } = require('@playwright/test/package.json');
const isCI = !!process.env.CI;
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.DEMO_PORT ?? 8000);
const baseURL = `http://127.0.0.1:${port}`;

/*
 * The browser runs in the same Docker image as upstream's toolkit tests (symfony/ux
 * src/Toolkit/assets/playwright.config.ts), so screenshots match the baselines copied from upstream.
 * PW_BROWSER_SERVER overrides the command (e.g. `--network host` where port publishing is unavailable).
 */
const browserServer =
    process.env.PW_BROWSER_SERVER ??
    [
        'docker run --rm --init -p 127.0.0.1:3000:3000',
        `mcr.microsoft.com/playwright:v${version}-noble`,
        `npx -y playwright@${version} run-server --port 3000 --host 0.0.0.0`,
    ].join(' ');

/*
 * The recipe specs copied from upstream (<recipe>/tests/*.spec.ts, kept byte-identical) import
 * '../../../../assets/test/browser/fixtures', a path inside the symfony/ux repository. Run copies of
 * them with that import pointed at our port, tests/e2e/examples/fixtures.ts. Generated in the main
 * process only (workers load this config too); the directory is gitignored.
 */
const recipeSpecsDir = join(root, 'tests/e2e/examples/recipes');
if (!process.env.TEST_WORKER_INDEX) {
    rmSync(recipeSpecsDir, { recursive: true, force: true });
    mkdirSync(recipeSpecsDir, { recursive: true });
    for (const entry of readdirSync(root, { withFileTypes: true })) {
        const testsDir = join(root, entry.name, 'tests');
        if (!entry.isDirectory() || !existsSync(join(root, entry.name, 'manifest.json')) || !existsSync(testsDir)) {
            continue;
        }
        for (const file of readdirSync(testsDir).filter((name) => name.endsWith('.spec.ts'))) {
            const source = readFileSync(join(testsDir, file), 'utf8');
            const spec = source.replace(/(['"])(?:\.\.\/)+assets\/test\/browser\/fixtures\1/g, "'../fixtures'");
            writeFileSync(join(recipeSpecsDir, `${entry.name}.${file}`), `// Generated from ${entry.name}/tests/${file} by playwright.config.ts: do not edit.\n${spec}`);
        }
    }
}

export default defineConfig({
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    // Baselines are committed: never write screenshots unless asked with --update-snapshots.
    updateSnapshots: 'none',
    reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',

    expect: {
        toHaveScreenshot: { animations: 'disabled', caret: 'hide' },
    },

    use: {
        baseURL,
        connectOptions: { wsEndpoint: 'ws://127.0.0.1:3000/', exposeNetwork: '<loopback>' },
        trace: 'retain-on-failure',
    },

    projects: [
        {
            name: 'smoke',
            testDir: './tests/e2e',
            testIgnore: 'examples/**',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            // Every README example (examples.spec.ts) and the upstream recipe specs (recipes/), at
            // upstream's viewport; screenshots live in <recipe>/tests/screenshots/.
            name: 'examples',
            testDir: './tests/e2e/examples',
            fullyParallel: true,
            snapshotPathTemplate: '{testDir}/../../../{arg}{ext}',
            use: { viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 },
        },
    ],

    webServer: [
        {
            // Serves the demo with PHP's built-in server; reuses one already listening.
            command: `php -S 127.0.0.1:${port} -t demo/public`,
            url: baseURL,
            reuseExistingServer: true,
            timeout: 30_000,
        },
        {
            command: browserServer,
            url: 'http://127.0.0.1:3000/',
            reuseExistingServer: true,
            timeout: 5 * 60_000,
        },
    ],
});
