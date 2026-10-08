import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
 * The recipe specs copied from upstream (<recipe>/tests/*.spec.ts, kept byte-identical) import
 * '../../../../assets/test/browser/fixtures', a path inside the symfony/ux repository. Run copies of
 * them with that import pointed at our port, tests/e2e/examples/fixtures.ts. Generated in the main
 * process only (workers load this config too); the directory is gitignored.
 */
const recipeSpecsDir = join(root, 'tests/e2e/examples/recipes');
if (!process.env.TEST_WORKER_INDEX) {
    buildTailwindIfStale();
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

/*
 * Builds the demo's Tailwind CSS unless it was built from the same sources: those it scans
 * (demo/assets/styles/app.css: `@source "../../.."`, the repository minus what git ignores), identified by a
 * SHA-256 of their paths and content hashes (`git hash-object`), recorded next to the build. So no screenshot is
 * taken against stale CSS, whoever runs the tests, and nothing is rebuilt when nothing changed (in CI, right after
 * its own `tailwind:build`, the first run builds once more, for the record). The record is read and written by
 * PHP_BINARY's PHP: in the Docker demo, demo/var/ lives in the container.
 */
function buildTailwindIfStale() {
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' })
        .split('\0')
        .filter((file) => file && existsSync(join(root, file)));
    const hashes = execFileSync('git', ['hash-object', '--stdin-paths'], { cwd: root, encoding: 'utf8', input: files.join('\n'), maxBuffer: 64 * 1024 * 1024 })
        .trim()
        .split('\n');
    const digest = createHash('sha256')
        .update(files.map((file, index) => `${hashes[index]} ${file}`).join('\n'))
        .digest('hex');
    const php = (args: string[], stdio: 'pipe' | 'inherit' = 'pipe') =>
        execFileSync(process.env.PHP_BINARY ?? 'php', args, { cwd: join(root, 'demo'), encoding: 'utf8', stdio });
    const record = 'var/tailwind/sources.sha256';
    const recorded = php(['-r', `echo is_file('var/tailwind/app.built.css') ? @file_get_contents('${record}') : '';`]);
    if (recorded.trim() === digest) {
        return;
    }
    console.log("Building the demo's Tailwind CSS: its sources changed since the last build");
    php(['bin/console', 'tailwind:build'], 'inherit');
    php(['-r', `file_put_contents('${record}', $argv[1].PHP_EOL);`, '--', digest]);
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
        // Caddy's local certificate authority signs https://localhost
        ignoreHTTPSErrors: !!demoURL,
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
        ...(demoURL
            ? []
            : [
                  {
                      // Serves the demo with PHP's built-in server; reuses one already listening.
                      command: `php -S 127.0.0.1:${port} -t demo/public`,
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
