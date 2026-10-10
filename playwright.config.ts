import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { syncRecipeSpecs } from './tools/prepare-tests.mjs';

const require = createRequire(import.meta.url);
const { version } = require('@playwright/test/package.json');
const isCI = !!process.env.CI;
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.DEMO_PORT ?? 8000);
/*
 * DEMO_URL points the tests at a demo already running, e.g. https://localhost from Docker (demo/compose.yaml);
 * the specs then run PHP in its container. Without it, Playwright serves the demo with PHP's built-in server.
 */
const demoURL = process.env.DEMO_URL?.replace(/\/$/, '');
const baseURL = demoURL ?? `http://127.0.0.1:${port}`;
if (demoURL) {
    process.env.PHP_BINARY ??= join(root, 'tools/demo-php');
}

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
 * tools/prepare-tests.mjs prepares what the tests need, safely when several Playwright processes share this checkout:
 * the recipe specs' runnable copies in tests/e2e/examples/recipes/ (gitignored), which discovery (`--list`) needs, here
 * in the main process (workers load this config too; nothing is written when nothing changed), and the demo's CSS,
 * rebuilt when its sources changed, as the globalSetup: before the tests run, never for `--list`.
 */
if (!process.env.TEST_WORKER_INDEX) {
    syncRecipeSpecs();
}

/*
 * Two projects per browser: `smoke` (tests/e2e/*.spec.ts, desktop viewport) and `examples` (every README example and
 * the upstream recipe specs, at upstream's 800x600 viewport; screenshots live in <recipe>/tests/screenshots/). Chromium's
 * keep their plain names; Firefox's and WebKit's are suffixed: smoke-firefox, examples-webkit...
 *
 * Firefox and WebKit run the behavior tests only: every test tagged @screenshot (it compares pixels: a baseline, or two
 * screenshots with each other) is left out, as the baselines are Chromium's. PW_SCREENSHOTS=all keeps the tagged tests
 * in every browser, compared with the same Chromium baselines: a report of how far the other engines render from them,
 * not a gate (the baselines are never written from another browser).
 */
const crossBrowserScreenshots = 'all' === process.env.PW_SCREENSHOTS;
const desktop = { chromium: 'Desktop Chrome', firefox: 'Desktop Firefox', webkit: 'Desktop Safari' } as const;

function browserProjects(browser: keyof typeof desktop) {
    const suffix = 'chromium' === browser ? '' : `-${browser}`;
    const grepInvert = 'chromium' === browser || crossBrowserScreenshots ? undefined : /@screenshot/;

    return [
        {
            name: `smoke${suffix}`,
            testDir: './tests/e2e',
            testIgnore: 'examples/**',
            grepInvert,
            use: { ...devices[desktop[browser]] },
        },
        {
            name: `examples${suffix}`,
            testDir: './tests/e2e/examples',
            fullyParallel: true,
            grepInvert,
            snapshotPathTemplate: '{testDir}/../../../{arg}{ext}',
            use: { browserName: browser, viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 },
        },
    ];
}

export default defineConfig({
    globalSetup: './tools/prepare-tests.mjs',
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    // Baselines are committed: never write screenshots unless asked with --update-snapshots.
    updateSnapshots: 'none',
    // CI also writes every test's attempts and outcome to playwright-results/results.json, uploaded green or red
    reporter: isCI ? [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'playwright-results/results.json' }]] : 'list',

    expect: {
        toHaveScreenshot: { animations: 'disabled', caret: 'hide' },
    },

    use: {
        baseURL,
        // Caddy's local certificate authority signs https://localhost
        ignoreHTTPSErrors: !!demoURL,
        connectOptions: { wsEndpoint: 'ws://127.0.0.1:3000/', exposeNetwork: '<loopback>' },
        trace: 'retain-on-failure',
    },

    projects: [
        // Chromium: every test, the screenshots included
        ...browserProjects('chromium'),
        // Firefox and WebKit: every behavior test, no screenshot comparison
        ...browserProjects('firefox'),
        ...browserProjects('webkit'),
    ],

    webServer: [
        ...(demoURL
            ? []
            : [
                  {
                      // Serves the demo with PHP's built-in server; reuses one already listening. The upload limits are
                      // pinned so the upload specs' too-large cases do not depend on the machine's php.ini.
                      command: `php -d upload_max_filesize=2M -d post_max_size=8M -S 127.0.0.1:${port} -t demo/public`,
                      url: baseURL,
                      reuseExistingServer: true,
                      timeout: 30_000,
                  },
              ]),
        {
            command: browserServer,
            url: 'http://127.0.0.1:3000/',
            reuseExistingServer: true,
            timeout: 5 * 60_000,
        },
    ],
});
